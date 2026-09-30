/**
 * Editing and publishing the agent's system prompt.
 *
 * The two things worth proving are the ones the design turns on: that a
 * preview is byte-for-byte what publish stores, and that the two operations
 * which collide with a unique constraint — reordering and publishing at the
 * same time — actually work rather than nearly working.
 */
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { assemblePrompt, PROMPT_SEPARATOR, renderTable } from '@luxury/shared';
import { buildApp } from '../../apps/admin/server/src/app.js';
import {
  createDocument,
  deleteDocument,
  getPrompt,
  getVersion,
  listVersions,
  publish,
  PromptWriteRefused,
  reorderDocuments,
  revertTo,
  updateDocument,
} from '../../apps/admin/server/src/prompts/queries.js';
import { urlForRole } from '../helpers/config.js';

const AGENT = 'prompt-test';
const BY = 'prompts-owner@example.com';

let pool: pg.Pool;
let owner: pg.Client;
let agentId: string;

async function refusalFrom(work: () => Promise<unknown>): Promise<string> {
  try {
    await work();
  } catch (error) {
    if (error instanceof PromptWriteRefused) return error.reason;
    throw error;
  }
  throw new Error('expected the write to be refused, and it was not');
}

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('admin_user') });
  owner = new pg.Client({ connectionString: urlForRole('admin_user') });
  await owner.connect();
  const inserted = await owner.query<{ id: string }>(
    `INSERT INTO public.agents (key, name) VALUES ($1, 'Prompt test') RETURNING id`,
    [AGENT],
  );
  agentId = inserted.rows[0]!.id;
  await owner.query("INSERT INTO public.admin_allowlist (email, role) VALUES ($1, 'owner')", [BY]);
});

beforeEach(async () => {
  await owner.query('DELETE FROM public.prompt_versions WHERE agent_id = $1', [agentId]);
  await owner.query('DELETE FROM public.prompt_documents WHERE agent_id = $1', [agentId]);
});

afterAll(async () => {
  // The agent cascades to both tables.
  await owner.query('DELETE FROM public.agents WHERE key = $1', [AGENT]);
  await owner.query('DELETE FROM public.admin_allowlist WHERE email = $1', [BY]);
  await owner.end();
  await pool.end();
});

describe('the preview', () => {
  it('is exactly what publish stores', async () => {
    await createDocument(pool, AGENT, { title: 'role', body: 'You are the assistant.', by: BY });
    await createDocument(pool, AGENT, { title: 'hours', body: 'Check-in is at 15:00.', by: BY });

    const { preview } = await getPrompt(pool, AGENT);
    await publish(pool, AGENT, BY);
    const stored = await getVersion(pool, AGENT, 1);

    // If these can differ, the preview is decoration rather than a preview.
    expect(stored.body).toBe(preview);
    expect(stored.body).toBe(
      ['You are the assistant.', 'Check-in is at 15:00.'].join(PROMPT_SEPARATOR),
    );
  });

  it('leaves out a document that is switched off', async () => {
    const first = await createDocument(pool, AGENT, { title: 'a', body: 'Kept.', by: BY });
    await createDocument(pool, AGENT, { title: 'b', body: 'Withdrawn.', by: BY });
    const rows = (await getPrompt(pool, AGENT)).documents;
    await updateDocument(pool, AGENT, { id: rows[1]!.id, isActive: false, by: BY });

    const { preview } = await getPrompt(pool, AGENT);
    expect(preview).toBe('Kept.');
    expect(first.isActive).toBe(true);
  });
});

describe('reordering', () => {
  it('survives the swap that trips the unique constraint', async () => {
    // Two documents exchanging positions puts them briefly on the same one.
    // Checked per row, that is a duplicate; deferred to COMMIT, it is a swap.
    const a = await createDocument(pool, AGENT, { title: 'a', body: 'First.', by: BY });
    const b = await createDocument(pool, AGENT, { title: 'b', body: 'Second.', by: BY });

    const reordered = await reorderDocuments(pool, AGENT, [b.id, a.id]);

    expect(reordered.map((d) => d.title)).toEqual(['b', 'a']);
    expect((await getPrompt(pool, AGENT)).preview).toBe(
      ['Second.', 'First.'].join(PROMPT_SEPARATOR),
    );
  });

  it('refuses a list that does not name every document exactly once', async () => {
    const a = await createDocument(pool, AGENT, { title: 'a', body: 'First.', by: BY });
    await createDocument(pool, AGENT, { title: 'b', body: 'Second.', by: BY });

    // A partial list would leave the rest on positions this pass handed out.
    expect(await refusalFrom(() => reorderDocuments(pool, AGENT, [a.id]))).toBe('bad_order');
    expect(await refusalFrom(() => reorderDocuments(pool, AGENT, [a.id, a.id]))).toBe('bad_order');
  });

  it('leaves room to insert between two documents', async () => {
    const a = await createDocument(pool, AGENT, { title: 'a', body: 'First.', by: BY });
    const b = await createDocument(pool, AGENT, { title: 'b', body: 'Second.', by: BY });
    const positions = (await reorderDocuments(pool, AGENT, [a.id, b.id])).map((d) => d.position);
    expect(positions).toEqual([10, 20]);
  });
});

describe('publishing', () => {
  it('refuses an empty prompt', async () => {
    // An unprompted agent improvises the business's policies; publishing
    // nothing is not a way to say "stop answering".
    expect(await refusalFrom(() => publish(pool, AGENT, BY))).toBe('empty');
  });

  it('refuses to republish text that is already serving', async () => {
    await createDocument(pool, AGENT, { title: 'a', body: 'Unchanged.', by: BY });
    await publish(pool, AGENT, BY);
    expect(await refusalFrom(() => publish(pool, AGENT, BY))).toBe('unchanged');
  });

  it('gives two simultaneous publishes two version numbers', async () => {
    // Reading the maximum and adding one races: both read the same number and
    // one loses on the unique constraint. The lock on the agent row is what
    // turns the second into a queue rather than an error.
    await createDocument(pool, AGENT, { title: 'a', body: 'One.', by: BY });

    const results = await Promise.allSettled([
      publish(pool, AGENT, BY),
      (async () => {
        // Different text, so the second is not refused as unchanged.
        await createDocument(pool, AGENT, { title: 'b', body: 'Two.', by: BY });
        return publish(pool, AGENT, BY);
      })(),
    ]);

    const failed = results.filter((r) => r.status === 'rejected');
    // Whichever order they land in, neither may fail on the constraint.
    for (const result of failed) {
      expect((result as PromiseRejectedResult).reason).toBeInstanceOf(PromptWriteRefused);
    }
    const versions = await listVersions(pool, AGENT);
    expect(new Set(versions.map((v) => v.versionNumber)).size).toBe(versions.length);
  });

  it('records who published it and when', async () => {
    await createDocument(pool, AGENT, { title: 'a', body: 'Text.', by: BY });
    const version = await publish(pool, AGENT, BY);
    expect(version.versionNumber).toBe(1);
    expect(version.publishedBy).toBe(BY);
    expect((await getPrompt(pool, AGENT)).published?.versionNumber).toBe(1);
  });
});

describe('reverting', () => {
  it('restores the documents and publishes forward, never backwards', async () => {
    const first = await createDocument(pool, AGENT, { title: 'a', body: 'Original.', by: BY });
    await publish(pool, AGENT, BY);

    await updateDocument(pool, AGENT, { id: first.id, body: 'Regrettable.', by: BY });
    await publish(pool, AGENT, BY);

    await revertTo(pool, AGENT, 1, BY);
    const restored = await getPrompt(pool, AGENT);
    expect(restored.preview).toBe('Original.');
    // Still serving version 2 until it is published: reverting edits the
    // draft, and the draft is not what guests are told.
    expect(restored.published?.versionNumber).toBe(2);

    const version = await publish(pool, AGENT, BY);
    // Forward. The bot reads the highest version number, so rewinding would
    // leave history disagreeing with what is being served.
    expect(version.versionNumber).toBe(3);
    expect((await getVersion(pool, AGENT, 3)).body).toBe((await getVersion(pool, AGENT, 1)).body);
    expect(await listVersions(pool, AGENT)).toHaveLength(3);
  });

  it('refuses a version that does not exist', async () => {
    expect(await refusalFrom(() => revertTo(pool, AGENT, 99, BY))).toBe('not_found');
  });
});

describe('deleting a document', () => {
  it('does not touch what is already published', async () => {
    const a = await createDocument(pool, AGENT, { title: 'a', body: 'Kept.', by: BY });
    await createDocument(pool, AGENT, { title: 'b', body: 'Removed.', by: BY });
    await publish(pool, AGENT, BY);

    await deleteDocument(pool, AGENT, a.id);

    // The version is frozen text, not a view over the documents.
    expect((await getVersion(pool, AGENT, 1)).body).toContain('Kept.');
    expect((await getPrompt(pool, AGENT)).preview).toBe('Removed.');
  });
});

describe('the assembly rule itself', () => {
  it('has one definition, and it trims each document', () => {
    // A trailing newline inside a document would widen the gap between two of
    // them, and which gap is wider is not something anyone edits on purpose.
    expect(
      assemblePrompt([
        { title: 'a', body: '  First.\n\n', position: 20 },
        { title: 'b', body: '\nSecond.  ', position: 10 },
      ]),
    ).toBe(['Second.', 'First.'].join(PROMPT_SEPARATOR));
  });
});

const HOURS = { columns: ['Season', 'Check-in'], rows: [['Summer', '15:00'], ['Winter', '14:00']] };

describe('a table document', () => {
  it('is served as a Markdown table under its title, identically in preview and publish', async () => {
    await createDocument(pool, AGENT, { title: 'role', body: 'You are the assistant.', by: BY });
    await createDocument(pool, AGENT, { title: 'Hours', kind: 'table', table: HOURS, by: BY });

    const { preview } = await getPrompt(pool, AGENT);
    await publish(pool, AGENT, BY);

    expect((await getVersion(pool, AGENT, 1)).body).toBe(preview);
    expect(preview).toBe(
      [
        'You are the assistant.',
        '## Hours\n\n| Season | Check-in |\n| --- | --- |\n| Summer | 15:00 |\n| Winter | 14:00 |',
      ].join(PROMPT_SEPARATOR),
    );
  });

  it('starts with an empty table to type into, which serves nothing yet', async () => {
    const table = await createDocument(pool, AGENT, { title: 'Empty', kind: 'table', by: BY });
    expect(table.kind).toBe('table');
    expect(table.table).toEqual({ columns: ['', ''], rows: [['', '']] });
    expect((await getPrompt(pool, AGENT)).preview).toBe('');
  });

  it('keeps its kind: text cannot be written to a table, nor cells to text', async () => {
    const table = await createDocument(pool, AGENT, { title: 'T', kind: 'table', table: HOURS, by: BY });
    const text = await createDocument(pool, AGENT, { title: 'X', body: 'Words.', by: BY });

    expect(await refusalFrom(() => updateDocument(pool, AGENT, { id: table.id, body: 'x', by: BY }))).toBe(
      'wrong_kind',
    );
    expect(
      await refusalFrom(() => updateDocument(pool, AGENT, { id: text.id, table: HOURS, by: BY })),
    ).toBe('wrong_kind');
    // Neither was changed by the refused write.
    const { documents } = await getPrompt(pool, AGENT);
    expect(documents.map((d) => [d.body, d.table])).toEqual([
      ['', HOURS],
      ['Words.', null],
    ]);
  });

  it('is restored by a revert as cells, not as rendered text', async () => {
    const table = await createDocument(pool, AGENT, { title: 'Hours', kind: 'table', table: HOURS, by: BY });
    await publish(pool, AGENT, BY);
    await updateDocument(pool, AGENT, { id: table.id, table: { columns: ['A'], rows: [['changed']] }, by: BY });

    const [restored] = await revertTo(pool, AGENT, 1, BY);
    expect([restored!.kind, restored!.table]).toEqual(['table', HOURS]);
  });
});

describe('what changed since the published version', () => {
  it('marks the documents an edit touched, and a new one', async () => {
    const kept = await createDocument(pool, AGENT, { title: 'kept', body: 'Same.', by: BY });
    const edited = await createDocument(pool, AGENT, { title: 'edited', body: 'Before.', by: BY });
    await publish(pool, AGENT, BY);

    await updateDocument(pool, AGENT, { id: edited.id, body: 'After.', by: BY });
    const added = await createDocument(pool, AGENT, { title: 'added', body: 'New.', by: BY });

    const { documents } = await getPrompt(pool, AGENT);
    const changed = Object.fromEntries(documents.map((d) => [d.id, d.changed]));
    expect(changed).toEqual({ [kept.id]: false, [edited.id]: true, [added.id]: true });
  });

  it('matches a version seeded from files, which has no ids, by position', async () => {
    const seeded = await createDocument(pool, AGENT, { title: 'role', body: 'Seeded.', by: BY });
    // What scripts/deploy.mjs stores: the documents as read from files.
    await owner.query(
      `INSERT INTO public.prompt_versions (agent_id, version_number, body, snapshot, published_by)
       VALUES ($1, 1, 'Seeded.', $2::jsonb, 'deploy')`,
      [agentId, JSON.stringify([{ title: 'role', body: 'Seeded.', position: seeded.position }])],
    );
    expect((await getPrompt(pool, AGENT)).documents.map((d) => d.changed)).toEqual([false]);
  });

  it('counts every document as changed before anything is published', async () => {
    await createDocument(pool, AGENT, { title: 'a', body: 'A.', by: BY });
    expect((await getPrompt(pool, AGENT)).documents.map((d) => d.changed)).toEqual([true]);
  });
});

describe('rendering a table', () => {
  it('keeps a pipe or a newline inside its cell', () => {
    expect(renderTable('', { columns: ['a|b'], rows: [['one\ntwo | three']] })).toBe(
      '| a\\|b |\n| --- |\n| one<br>two \\| three |',
    );
  });

  it('drops empty rows, and renders nothing when none are left', () => {
    expect(renderTable('T', { columns: ['a', 'b'], rows: [[' ', ''], ['x', '']] })).toBe(
      '## T\n\n| a | b |\n| --- | --- |\n| x |  |',
    );
    expect(renderTable('T', { columns: ['a'], rows: [['  ']] })).toBe('');
    expect(renderTable('T', { columns: [], rows: [] })).toBe('');
  });

  it('treats a snapshot from before tables existed as text', () => {
    expect(assemblePrompt([{ title: 'old', body: 'Old text.', position: 10 }])).toBe('Old text.');
  });
});

describe('the endpoint', () => {
  async function send(method: 'POST' | 'PATCH', url: string, payload: unknown) {
    const session = { async read() { return { email: BY, name: 'Test' }; } };
    const messaging = {
      async sendToConversation() {
        return { channel: 'telegram' as const, providerMessageId: 'stub' };
      },
      async indicateTyping() {},
    };
    const app = buildApp({ pool, session, messaging, logLevel: 'silent' });
    await app.ready();
    try {
      return await app.inject({ method, url, payload: payload as object });
    } finally {
      await app.close();
    }
  }

  it('creates a table document', async () => {
    const response = await send('POST', `/api/agents/${AGENT}/documents`, {
      title: 'Hours',
      kind: 'table',
      table: HOURS,
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().document).toMatchObject({ kind: 'table', table: HOURS });
  });

  it('refuses a table whose rows do not match its columns', async () => {
    const response = await send('POST', `/api/agents/${AGENT}/documents`, {
      title: 'Broken',
      kind: 'table',
      table: { columns: ['a', 'b'], rows: [['only one']] },
    });
    expect(response.statusCode).toBe(400);
  });

  it('refuses a table with no columns, or an unknown kind', async () => {
    const noColumns = await send('POST', `/api/agents/${AGENT}/documents`, {
      title: 'x',
      kind: 'table',
      table: { columns: [], rows: [] },
    });
    const unknownKind = await send('POST', `/api/agents/${AGENT}/documents`, { title: 'x', kind: 'sheet' });
    expect([noColumns.statusCode, unknownKind.statusCode]).toEqual([400, 400]);
  });

  it('answers a write of the wrong kind with its reason', async () => {
    const text = await createDocument(pool, AGENT, { title: 'X', body: 'Words.', by: BY });
    const response = await send('PATCH', `/api/agents/${AGENT}/documents/${text.id}`, { table: HOURS });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'wrong_kind' });
  });
});

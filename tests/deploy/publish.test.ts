/**
 * The deploy step that seeds the prompt.
 *
 * It runs on every deploy, and the admin screen now publishes too, so the
 * property that matters is that it publishes exactly once: on a database that
 * has no version at all. Anything looser and a push would quietly replace
 * what the owner published minutes earlier with whatever is in the
 * repository — no error, because from the script's side it did its job.
 */
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
// @ts-expect-error — plain .mjs, shared with the deploy entry point.
import { publishIfUnpublished, seedAllowlist, syncRolePasswords } from '../../scripts/deploy.mjs';
import { OWNER_URL } from '../helpers/config.js';

let owner: pg.Client;
let root: string;

const AGENT = 'deploy-test';

beforeAll(async () => {
  owner = new pg.Client({ connectionString: OWNER_URL });
  await owner.connect();
  await owner.query(`INSERT INTO public.agents (key, name) VALUES ($1, 'Deploy test')`, [AGENT]);

  root = await mkdtemp(join(tmpdir(), 'luxury-prompts-'));
  await mkdir(join(root, 'prompts', AGENT), { recursive: true });
});

afterAll(async () => {
  await owner.query(`DELETE FROM public.agents WHERE key = $1`, [AGENT]);
  await owner.end();
  await rm(root, { recursive: true, force: true });
});

async function writePrompt(name: string, body: string): Promise<void> {
  await writeFile(join(root, 'prompts', AGENT, name), body, 'utf8');
}

describe('seeding the prompt on deploy', () => {
  it('publishes the first version, in filename order', async () => {
    await writePrompt('010-role.md', 'You are the assistant.');
    await writePrompt('005-first.md', 'Read me first.');

    expect(await publishIfUnpublished(owner, AGENT, root)).toEqual({
      published: true,
      versionNumber: 1,
    });

    const stored = await owner.query<{ body: string }>(
      `SELECT body FROM public.prompt_versions
        WHERE agent_id = (SELECT id FROM public.agents WHERE key = $1)
          AND version_number = 1`,
      [AGENT],
    );
    // Assembly is concatenation, so the filename prefix is the order.
    expect(stored.rows[0]!.body.indexOf('Read me first')).toBeLessThan(
      stored.rows[0]!.body.indexOf('You are the assistant'),
    );
  });

  it('does nothing on the next deploy, even when the files changed', async () => {
    // The one that matters. The manager publishes version 2 from the screen,
    // the repository still says something else, and this must leave it alone.
    await writePrompt('010-role.md', 'Something entirely different.');

    expect(await publishIfUnpublished(owner, AGENT, root)).toEqual({
      published: false,
      versionNumber: 1,
    });

    const count = await owner.query<{ n: string }>(
      `SELECT count(*) AS n FROM public.prompt_versions
        WHERE agent_id = (SELECT id FROM public.agents WHERE key = $1)`,
      [AGENT],
    );
    expect(Number(count.rows[0]!.n)).toBe(1);
  });

  it('does not overwrite documents the screen is editing', async () => {
    // The draft is the manager's working copy. A deploy has no business in it.
    const agentId = (
      await owner.query<{ id: string }>('SELECT id FROM public.agents WHERE key = $1', [AGENT])
    ).rows[0]!.id;
    await owner.query('DELETE FROM public.prompt_documents WHERE agent_id = $1', [agentId]);
    await owner.query(
      `INSERT INTO public.prompt_documents (agent_id, title, body, position, updated_by)
       VALUES ($1, 'draft', 'Half a sentence the manager is still', 10, 'manager@example.com')`,
      [agentId],
    );

    await publishIfUnpublished(owner, AGENT, root);

    const documents = await owner.query<{ body: string; updated_by: string }>(
      'SELECT body, updated_by FROM public.prompt_documents WHERE agent_id = $1',
      [agentId],
    );
    expect(documents.rows).toHaveLength(1);
    expect(documents.rows[0]!.updated_by).toBe('manager@example.com');
  });

  it('publishes nothing for an agent that does not exist', async () => {
    expect(await publishIfUnpublished(owner, 'no-such-agent', root)).toEqual({ published: false });
  });
});

describe('syncing role passwords', () => {
  it('sets a password the service can then authenticate with', async () => {
    await syncRolePasswords(owner, { bot_user: "quote'and space" });

    const url = new URL(OWNER_URL);
    url.username = 'bot_user';
    url.password = "quote'and space";

    // A password containing a quote is the case naive concatenation breaks on.
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();
    await client.end();

    // Put back what the rest of the suite connects with.
    await syncRolePasswords(owner, { bot_user: 'test_bot_pw' });
  });

  it('leaves a role alone when no password is provided', async () => {
    await syncRolePasswords(owner, { admin_user: undefined });

    const url = new URL(OWNER_URL);
    url.username = 'admin_user';
    url.password = 'test_admin_pw';
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();
    await client.end();
  });
});

describe('seeding the allowlist', () => {
  const EMAILS = 'first@example.com, Second@Example.com';

  afterAll(async () => {
    await owner.query(
      `DELETE FROM public.admin_allowlist WHERE email IN ('first@example.com', 'second@example.com')`,
    );
  });

  it('adds the initial managers, normalised', async () => {
    const result = await seedAllowlist(owner, EMAILS);
    // Addresses differing only in case are the same mailbox; storing them
    // lowercased keeps one row per person.
    expect(result.added.sort()).toEqual(['first@example.com', 'second@example.com']);
  });

  it('is a no-op on the next deploy', async () => {
    expect((await seedAllowlist(owner, EMAILS)).added).toEqual([]);
  });

  it('does not restore an address a manager removed in the interface', async () => {
    await owner.query(`DELETE FROM public.admin_allowlist WHERE email = 'first@example.com'`);
    // Additive means additive on the deploy that adds it, not on every one
    // after. Someone taken off the list stays off.
    const result = await seedAllowlist(owner, 'second@example.com');
    expect(result.added).toEqual([]);

    const rows = await owner.query(
      `SELECT email FROM public.admin_allowlist WHERE email = 'first@example.com'`,
    );
    expect(rows.rowCount).toBe(0);
  });

  it('does nothing when nothing is configured', async () => {
    expect((await seedAllowlist(owner, '')).added).toEqual([]);
  });
});

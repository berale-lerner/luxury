import type pg from 'pg';
import type { PoolClient } from 'pg';
import { assemblePrompt, type PromptDocument } from '@luxury/shared';

export interface Agent {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

export interface PromptDocumentRow extends PromptDocument {
  readonly id: string;
  readonly isActive: boolean;
  readonly updatedBy: string | null;
  readonly updatedAt: string;
}

export interface PublishedVersion {
  readonly versionNumber: number;
  readonly publishedBy: string | null;
  readonly publishedAt: string;
  readonly characters: number;
}

export type PromptWriteError = 'no_agent' | 'not_found' | 'empty' | 'unchanged' | 'bad_order';

export class PromptWriteRefused extends Error {
  constructor(readonly reason: PromptWriteError) {
    super(reason);
  }
}

export async function listAgents(pool: pg.Pool): Promise<Agent[]> {
  const result = await pool.query<Agent>(
    'SELECT id, key, name FROM public.agents ORDER BY name',
  );
  return result.rows;
}

/**
 * The draft, plus what is actually being served.
 *
 * Both, in one answer, because the only question worth asking on this screen
 * is how they differ: the documents are what the manager is editing, and the
 * version is what every guest is being told right now.
 */
export async function getPrompt(
  pool: pg.Pool,
  agentKey: string,
): Promise<{
  agent: Agent;
  documents: PromptDocumentRow[];
  published: PublishedVersion | null;
  /** The draft as the agent would receive it. */
  preview: string;
  /**
   * Whether publishing would produce anything new. Compared here, against the
   * stored text, rather than in the browser against a character count — the
   * screen would otherwise offer a button that the server refuses, or hide
   * one it would have accepted.
   */
  hasChanges: boolean;
}> {
  const agent = await findAgent(pool, agentKey);
  const documents = await readDocuments(pool, agent.id);
  const published = await readPublished(pool, agent.id);
  const preview = assemblePrompt(documents);

  const current = await pool.query<{ body: string }>(
    `SELECT body FROM public.prompt_versions
      WHERE agent_id = $1 ORDER BY version_number DESC LIMIT 1`,
    [agent.id],
  );

  return {
    agent,
    documents,
    published,
    preview,
    hasChanges: preview.length > 0 && current.rows[0]?.body !== preview,
  };
}

export async function listVersions(
  pool: pg.Pool,
  agentKey: string,
  limit = 50,
): Promise<Array<PublishedVersion & { id: string }>> {
  const agent = await findAgent(pool, agentKey);
  const result = await pool.query<{
    id: string;
    version_number: number;
    published_by: string | null;
    published_at: Date;
    body: string;
  }>(
    `SELECT id, version_number, published_by, published_at, body
       FROM public.prompt_versions
      WHERE agent_id = $1
      ORDER BY version_number DESC
      LIMIT $2`,
    [agent.id, limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    versionNumber: row.version_number,
    publishedBy: row.published_by,
    publishedAt: row.published_at.toISOString(),
    characters: row.body.length,
  }));
}

/** One stored version in full, for reading before reverting to it. */
export async function getVersion(
  pool: pg.Pool,
  agentKey: string,
  versionNumber: number,
): Promise<{ versionNumber: number; body: string; documents: PromptDocument[] }> {
  const agent = await findAgent(pool, agentKey);
  const result = await pool.query<{ body: string; snapshot: PromptDocument[] }>(
    `SELECT body, snapshot FROM public.prompt_versions
      WHERE agent_id = $1 AND version_number = $2`,
    [agent.id, versionNumber],
  );
  const row = result.rows[0];
  if (!row) throw new PromptWriteRefused('not_found');
  return { versionNumber, body: row.body, documents: row.snapshot };
}

export async function createDocument(
  pool: pg.Pool,
  agentKey: string,
  input: { title: string; body: string; by: string },
): Promise<PromptDocumentRow> {
  const agent = await findAgent(pool, agentKey);
  const result = await pool.query(
    `INSERT INTO public.prompt_documents (agent_id, title, body, position, updated_by)
     SELECT $1, $2, $3, coalesce(max(position), 0) + 10, $4
       FROM public.prompt_documents WHERE agent_id = $1
     RETURNING id, title, body, position, is_active, updated_by, updated_at`,
    [agent.id, input.title, input.body, input.by],
  );
  return toDocument(result.rows[0]);
}

export async function updateDocument(
  pool: pg.Pool,
  agentKey: string,
  input: {
    id: string;
    title?: string | undefined;
    body?: string | undefined;
    isActive?: boolean | undefined;
    by: string;
  },
): Promise<PromptDocumentRow> {
  const agent = await findAgent(pool, agentKey);
  const result = await pool.query(
    `UPDATE public.prompt_documents
        SET title = coalesce($3, title),
            body = coalesce($4, body),
            is_active = coalesce($5, is_active),
            updated_by = $6,
            updated_at = now()
      WHERE id = $2 AND agent_id = $1
  RETURNING id, title, body, position, is_active, updated_by, updated_at`,
    [agent.id, input.id, input.title ?? null, input.body ?? null, input.isActive ?? null, input.by],
  );
  const row = result.rows[0];
  if (!row) throw new PromptWriteRefused('not_found');
  return toDocument(row);
}

export async function deleteDocument(
  pool: pg.Pool,
  agentKey: string,
  id: string,
): Promise<void> {
  const agent = await findAgent(pool, agentKey);
  const result = await pool.query(
    'DELETE FROM public.prompt_documents WHERE id = $1 AND agent_id = $2',
    [id, agent.id],
  );
  if (result.rowCount === 0) throw new PromptWriteRefused('not_found');
}

/**
 * Rewrites every position from one ordered list of ids.
 *
 * The constraint is deferred for the duration (migration 0011): a swap puts
 * two documents on the same position partway through, and checking per row
 * would reject an arrangement that is valid by the time it is finished.
 *
 * The list must name every document exactly once. A partial list would leave
 * the rest sitting on positions this pass just handed out.
 */
export async function reorderDocuments(
  pool: pg.Pool,
  agentKey: string,
  ids: readonly string[],
): Promise<PromptDocumentRow[]> {
  const agent = await findAgent(pool, agentKey);

  return inTransaction(pool, async (client) => {
    const current = await client.query<{ id: string }>(
      'SELECT id FROM public.prompt_documents WHERE agent_id = $1',
      [agent.id],
    );
    const known = new Set(current.rows.map((row) => row.id));
    const given = new Set(ids);
    if (given.size !== ids.length || given.size !== known.size) {
      throw new PromptWriteRefused('bad_order');
    }
    for (const id of ids) if (!known.has(id)) throw new PromptWriteRefused('bad_order');

    await client.query(
      'SET CONSTRAINTS prompt_documents_agent_id_position_key DEFERRED',
    );

    // Sparse, so a document can later be inserted between two without
    // renumbering the rest.
    for (const [index, id] of ids.entries()) {
      await client.query(
        'UPDATE public.prompt_documents SET position = $3 WHERE id = $1 AND agent_id = $2',
        [id, agent.id, (index + 1) * 10],
      );
    }

    return readDocuments(client, agent.id);
  });
}

/**
 * Freezes the draft as the version the bot will serve.
 *
 * The assembled text is stored rather than recomputed at call time, and the
 * document set is snapshotted beside it — that snapshot is what a revert
 * reads, and it is the reason a version can be restored after the documents
 * have moved on.
 */
export async function publish(
  pool: pg.Pool,
  agentKey: string,
  publishedBy: string,
): Promise<PublishedVersion> {
  const agent = await findAgent(pool, agentKey);

  return inTransaction(pool, async (client) => {
    // The agent row is the lock. Two publishes at once would otherwise read
    // the same maximum version number and collide on the unique constraint,
    // and the loser would be an error rather than a second version.
    await client.query('SELECT id FROM public.agents WHERE id = $1 FOR UPDATE', [agent.id]);

    const documents = await readDocuments(client, agent.id);
    const body = assemblePrompt(documents);
    // An unprompted agent improvises the business's policies. Publishing
    // nothing is not a way to say "stop".
    if (body.length === 0) throw new PromptWriteRefused('empty');

    const latest = await client.query<{ version_number: number; body: string }>(
      `SELECT version_number, body FROM public.prompt_versions
        WHERE agent_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [agent.id],
    );
    if (latest.rows[0]?.body === body) throw new PromptWriteRefused('unchanged');

    const versionNumber = (latest.rows[0]?.version_number ?? 0) + 1;

    const inserted = await client.query<{ published_at: Date }>(
      `INSERT INTO public.prompt_versions
         (agent_id, version_number, body, snapshot, published_by)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING published_at`,
      [agent.id, versionNumber, body, JSON.stringify(documents), publishedBy],
    );

    return {
      versionNumber,
      publishedBy,
      publishedAt: inserted.rows[0]!.published_at.toISOString(),
      characters: body.length,
    };
  });
}

/**
 * Restores an old version into the draft.
 *
 * It does not rewind: the bot reads the highest version number, so moving
 * backwards would leave history disagreeing with what is being served. The
 * documents are replaced by the snapshot, and publishing them produces a new
 * version whose body happens to equal an older one.
 */
export async function revertTo(
  pool: pg.Pool,
  agentKey: string,
  versionNumber: number,
  by: string,
): Promise<PromptDocumentRow[]> {
  const agent = await findAgent(pool, agentKey);
  const version = await getVersion(pool, agentKey, versionNumber);

  return inTransaction(pool, async (client) => {
    await client.query('DELETE FROM public.prompt_documents WHERE agent_id = $1', [agent.id]);
    for (const [index, document] of version.documents.entries()) {
      await client.query(
        `INSERT INTO public.prompt_documents (agent_id, title, body, position, is_active, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          agent.id,
          document.title,
          document.body,
          document.position ?? (index + 1) * 10,
          document.isActive ?? true,
          by,
        ],
      );
    }
    return readDocuments(client, agent.id);
  });
}

async function findAgent(pool: pg.Pool, key: string): Promise<Agent> {
  const result = await pool.query<Agent>(
    'SELECT id, key, name FROM public.agents WHERE key = $1',
    [key],
  );
  const row = result.rows[0];
  if (!row) throw new PromptWriteRefused('no_agent');
  return row;
}

async function readDocuments(
  client: pg.Pool | PoolClient,
  agentId: string,
): Promise<PromptDocumentRow[]> {
  const result = await client.query(
    `SELECT id, title, body, position, is_active, updated_by, updated_at
       FROM public.prompt_documents
      WHERE agent_id = $1
      ORDER BY position`,
    [agentId],
  );
  return result.rows.map(toDocument);
}

async function readPublished(pool: pg.Pool, agentId: string): Promise<PublishedVersion | null> {
  const result = await pool.query<{
    version_number: number;
    published_by: string | null;
    published_at: Date;
    body: string;
  }>(
    `SELECT version_number, published_by, published_at, body
       FROM public.prompt_versions
      WHERE agent_id = $1 ORDER BY version_number DESC LIMIT 1`,
    [agentId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    versionNumber: row.version_number,
    publishedBy: row.published_by,
    publishedAt: row.published_at.toISOString(),
    characters: row.body.length,
  };
}

async function inTransaction<T>(
  pool: pg.Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

interface Row {
  id: string;
  title: string;
  body: string;
  position: number;
  is_active: boolean;
  updated_by: string | null;
  updated_at: Date;
}

function toDocument(row: Row): PromptDocumentRow {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    position: row.position,
    isActive: row.is_active,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at.toISOString(),
  };
}

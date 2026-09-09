import type pg from 'pg';

export interface PublishedPrompt {
  readonly agentKey: string;
  readonly versionNumber: number;
  readonly body: string;
}

/**
 * Loads the published system prompt for an agent.
 *
 * Reads prompt_versions, never prompt_documents: documents are the draft the
 * manager is still editing, and a half-finished sentence must not reach a
 * guest. bot_user has no grant on the documents table at all, so this is a
 * boundary rather than a convention.
 */
export async function loadPublishedPrompt(
  pool: pg.Pool,
  agentKey: string,
): Promise<PublishedPrompt | null> {
  const result = await pool.query<{ version_number: number; body: string }>(
    `SELECT v.version_number, v.body
       FROM public.prompt_versions v
       JOIN public.agents a ON a.id = v.agent_id
      WHERE a.key = $1
      ORDER BY v.version_number DESC
      LIMIT 1`,
    [agentKey],
  );

  const row = result.rows[0];
  if (!row) return null;

  return { agentKey, versionNumber: row.version_number, body: row.body };
}

/**
 * Caches the published prompt so it is not fetched on every guest message.
 *
 * The TTL is short and deliberately dumb: publishing happens in the admin
 * service, in a different process, so there is nothing here to invalidate it.
 * A manager who publishes waits at most this long to see the change.
 *
 * Ten seconds rather than a minute, because the wait is what the manager
 * feels and the saving is not what costs anything. The read is a single row
 * through prompt_versions_latest_idx, against a handler that already makes
 * several round trips per message — going from one refresh a minute to six
 * is not a number that appears anywhere. Under more than one replica this is
 * also the window in which two guests can be served different versions, and
 * that is a better reason to keep it small than the first one.
 */
export class PromptCache {
  #cached: { value: PublishedPrompt | null; fetchedAt: number } | undefined;

  constructor(
    private readonly pool: pg.Pool,
    private readonly agentKey: string,
    private readonly ttlMs = 10_000,
    private readonly now: () => number = Date.now,
  ) {}

  async get(): Promise<PublishedPrompt | null> {
    const cached = this.#cached;
    if (cached && this.now() - cached.fetchedAt < this.ttlMs) {
      return cached.value;
    }

    const value = await loadPublishedPrompt(this.pool, this.agentKey);
    this.#cached = { value, fetchedAt: this.now() };
    return value;
  }

  /** Drops the cached value; used by tests and by an explicit refresh. */
  clear(): void {
    this.#cached = undefined;
  }
}

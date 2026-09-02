import pg from 'pg';
import type { Client, DatabaseError } from 'pg';
import { OWNER_URL, urlForRole, type AppRole } from './config.js';

/** Postgres error code for insufficient privilege — a denied GRANT or a
 *  refused row-level security check. */
export const INSUFFICIENT_PRIVILEGE = '42501';
/** Postgres error code for a schema or relation that is not visible at all. */
export const UNDEFINED_TABLE = '42P01';

export async function connectAs(role: AppRole): Promise<Client> {
  const client = new pg.Client({ connectionString: urlForRole(role) });
  await client.connect();
  return client;
}

export async function connectAsOwner(): Promise<Client> {
  const client = new pg.Client({ connectionString: OWNER_URL });
  await client.connect();
  return client;
}

export interface SessionScope {
  conversationId?: string;
  guestId?: string;
}

/**
 * Runs `fn` in a transaction with the RLS session variables set, exactly as a
 * request handler does with SET LOCAL, and rolls back afterwards.
 *
 * The values are bound as parameters rather than interpolated: they come from a
 * verified inbound payload in production, and a test that builds them by string
 * concatenation would be testing a query the application never runs.
 */
export async function inSession<T>(
  client: Client,
  scope: SessionScope,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query('BEGIN');
  try {
    if (scope.conversationId !== undefined) {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.conversation_id',
        scope.conversationId,
      ]);
    }
    if (scope.guestId !== undefined) {
      await client.query('SELECT set_config($1, $2, true)', ['app.guest_id', scope.guestId]);
    }
    return await fn();
  } finally {
    await client.query('ROLLBACK');
  }
}

/**
 * Returns the error a query raised, or throws if it unexpectedly succeeded.
 *
 * Permission tests are worth having only because of their negative assertions,
 * so "this did not fail" has to be a loud failure with a message that says what
 * got through.
 */
export async function errorFrom(run: () => Promise<unknown>): Promise<DatabaseError> {
  try {
    await run();
  } catch (error) {
    return error as DatabaseError;
  }
  throw new Error('Expected the statement to be rejected, but it succeeded.');
}

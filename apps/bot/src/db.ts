import pg from 'pg';
import type { PoolClient } from 'pg';
import type { ConversationId } from '@luxury/shared';

/**
 * The bot's connection to Postgres, as bot_user.
 *
 * Every statement that touches conversation data runs inside
 * `withConversationSession`. RLS is driven by a session variable rather than
 * by a WHERE clause the caller has to remember, so a query written without
 * that scope returns nothing rather than returning everything.
 */
export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
}

/**
 * Runs `fn` in a transaction scoped to one conversation.
 *
 * `set_config(..., true)` is SET LOCAL: it lasts until the transaction ends,
 * so a pooled connection cannot leak one guest's scope into the next
 * request's query. The id is bound as a parameter — it arrives from a
 * verified inbound payload, and interpolating it would make the scope itself
 * injectable.
 */
export async function withConversationSession<T>(
  pool: pg.Pool,
  conversationId: ConversationId,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

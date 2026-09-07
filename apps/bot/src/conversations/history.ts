import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { ConversationTurn } from '../agent/index.js';

/** How much conversation history is replayed to the model. */
export const HISTORY_LIMIT = 20;

/**
 * Reads the recent turns of one conversation, oldest first.
 *
 * The mapping from a stored row to a model turn happens here rather than in
 * the agent layer, so the agent takes plain turns and never learns what a
 * `direction` column is.
 */
export async function loadHistory(
  pool: pg.Pool,
  conversationId: ConversationId,
  limit = HISTORY_LIMIT,
): Promise<ConversationTurn[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);

    const result = await client.query<{ direction: string; body: string }>(
      `SELECT direction, body
         FROM public.messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [conversationId, limit],
    );

    await client.query('COMMIT');

    return result.rows.reverse().map((row) => ({
      role: row.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      text: row.body,
    }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Stores what the agent said, so the manager sees the same thread the guest does. */
export async function recordOutbound(
  pool: pg.Pool,
  conversationId: ConversationId,
  text: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);
    await client.query(
      `INSERT INTO public.messages (conversation_id, direction, sender, body)
       VALUES ($1, 'outbound', 'agent', $2)`,
      [conversationId, text],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

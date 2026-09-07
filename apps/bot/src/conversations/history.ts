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

/**
 * Whether the agent still owes this conversation an answer.
 *
 * The last message being inbound means nothing has replied to it yet. This is
 * the right question to ask before generating a reply, and "did this delivery
 * store a new row" is not: a provider redelivers after a failed attempt, and
 * on that second delivery the row already exists. Keying the reply on storage
 * meant a transient model failure produced a stored message that was never
 * answered and never retried, because the retry was acknowledged with 200.
 */
export async function awaitsReply(
  pool: pg.Pool,
  conversationId: ConversationId,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);

    const result = await client.query<{ direction: string }>(
      `SELECT direction FROM public.messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [conversationId],
    );

    await client.query('COMMIT');
    return result.rows[0]?.direction === 'inbound';
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

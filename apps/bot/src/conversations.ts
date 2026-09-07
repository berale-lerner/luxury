import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { PoolClient } from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { InboundTextMessage } from './telegram/update.js';

const CHANNEL = 'telegram';

export interface RecordedInbound {
  readonly conversationId: ConversationId;
  /** False when this update had already been stored — a provider redelivery. */
  readonly stored: boolean;
  /** True while a manager holds the conversation; the agent stays silent. */
  readonly agentMuted: boolean;
}

/**
 * Stores one inbound guest message and returns the conversation it belongs to.
 *
 * Knows nothing about HTTP, Telegram's transport, or the model: it takes an
 * already-validated message and writes it (STANDARDS.md, use cases versus the
 * layers that call them).
 *
 * The whole thing runs in one transaction with the RLS scope set, so a
 * partially written conversation cannot outlive a failed message insert.
 */
export async function recordInboundMessage(
  pool: pg.Pool,
  inbound: InboundTextMessage,
): Promise<RecordedInbound> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Declare the chat being served before reading anything. Until this is
    // set, RLS shows the bot no conversations at all.
    await client.query('SELECT set_config($1, $2, true)', [
      'app.channel_chat_id',
      inbound.chatId,
    ]);

    const conversation = await findOrCreateConversation(client, inbound.chatId);

    // From here the narrower scope applies: this conversation's rows only.
    await client.query('SELECT set_config($1, $2, true)', [
      'app.conversation_id',
      conversation.id,
    ]);

    // ON CONFLICT DO NOTHING against the partial unique index on
    // (conversation_id, provider_update_id): a redelivered update writes
    // nothing and reports itself as already stored, so the agent does not
    // answer the same message twice.
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.messages
         (conversation_id, direction, sender, body, provider_update_id)
       VALUES ($1, 'inbound', 'guest', $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [conversation.id, inbound.text, inbound.updateId],
    );

    const stored = inserted.rowCount === 1;

    if (stored) {
      await client.query(
        'UPDATE public.conversations SET last_message_at = now() WHERE id = $1',
        [conversation.id],
      );
    }

    await client.query('COMMIT');

    return {
      conversationId: conversation.id as ConversationId,
      stored,
      agentMuted: conversation.agentMuted,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

interface ConversationRow {
  id: string;
  agentMuted: boolean;
}

async function findOrCreateConversation(
  client: PoolClient,
  chatId: string,
): Promise<ConversationRow> {
  const existing = await client.query<{ id: string; agent_muted: boolean }>(
    `SELECT id, agent_muted
       FROM public.conversations
      WHERE channel = $1 AND channel_chat_id = $2`,
    [CHANNEL, chatId],
  );

  const found = existing.rows[0];
  if (found) {
    return { id: found.id, agentMuted: found.agent_muted };
  }

  // The id is generated here and declared before the insert, because the
  // insert policy only accepts the conversation the request has claimed.
  const id = randomUUID();
  await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', id]);

  await client.query(
    `INSERT INTO public.conversations (id, channel, channel_chat_id)
     VALUES ($1, $2, $3)`,
    [id, CHANNEL, chatId],
  );

  return { id, agentMuted: false };
}

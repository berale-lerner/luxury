import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { DestinationResolver } from '@luxury/messaging';

/**
 * Where a conversation is delivered, read from the row.
 *
 * admin_user is not scoped by a session variable the way bot_user is, so this
 * is a plain lookup — but the shape is deliberately identical: the send layer
 * still takes a conversation id and resolves the address itself, and there is
 * still no function anywhere that accepts one.
 */
export function createDestinationResolver(pool: pg.Pool): DestinationResolver {
  return {
    async resolve(conversationId: ConversationId) {
      const result = await pool.query<{ channel: string; channel_chat_id: string }>(
        `SELECT channel, channel_chat_id FROM public.conversations WHERE id = $1`,
        [conversationId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(`No conversation ${conversationId} to deliver to.`);
      }
      return { channel: row.channel as 'telegram', chatId: row.channel_chat_id };
    },
  };
}

import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { DestinationResolver } from '@luxury/messaging';

/**
 * Resolves where a conversation is delivered, by reading the row.
 *
 * This is the half that gives the send layer's signature its meaning: the
 * address exists in the database and nowhere else in the call path, so no
 * caller and no model output can supply one.
 */
export function createDestinationResolver(pool: pg.Pool): DestinationResolver {
  return {
    async resolve(conversationId: ConversationId) {
      // The scope has to be declared even to read the row's own address:
      // RLS shows bot_user no conversation until the request says which one
      // it is serving. Without this the lookup silently returns nothing and
      // no reply is ever delivered.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', [
          'app.conversation_id',
          conversationId,
        ]);

        const result = await client.query<{ channel: string; channel_chat_id: string }>(
          `SELECT channel, channel_chat_id FROM public.conversations WHERE id = $1`,
          [conversationId],
        );

        await client.query('COMMIT');

        const row = result.rows[0];
        if (!row) {
          throw new Error(`No conversation ${conversationId} to deliver to.`);
        }
        return { channel: row.channel as 'telegram', chatId: row.channel_chat_id };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

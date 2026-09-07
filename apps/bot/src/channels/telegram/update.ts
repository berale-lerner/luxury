import { z } from 'zod';
import type { InboundTextMessage } from '../../conversations/index.js';

/**
 * The slice of a Telegram Update this service acts on.
 *
 * Deliberately narrow. Telegram's Update object carries dozens of optional
 * members; parsing only what is used means a field we never asked for cannot
 * reach the database or the model's context, and an unexpected shape fails
 * here rather than three layers down.
 *
 * The payload is untrusted input. It is validated at runtime because a
 * TypeScript type is gone by the time this arrives (STANDARDS.md).
 */

/** Telegram's own cap is 4096 characters; anything longer is not from Telegram. */
const MAX_TEXT_LENGTH = 4096;

export const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      message_id: z.number().int(),
      // Chat id is the delivery address. It is stored on the conversation and
      // read back by the send layer — never supplied by a caller or a model.
      chat: z.object({
        id: z.number().int(),
      }),
      from: z
        .object({
          id: z.number().int(),
          is_bot: z.boolean(),
        })
        .optional(),
      date: z.number().int(),
      text: z.string().min(1).max(MAX_TEXT_LENGTH),
    })
    .optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

/**
 * Narrows a valid update to the one case handled today.
 *
 * Anything else — an edit, a photo, a join event, a message from another bot —
 * is acknowledged and dropped. Returning 200 for these matters: a non-2xx
 * answer makes Telegram retry an update that will never become actionable.
 */
export function toInboundTextMessage(update: TelegramUpdate): InboundTextMessage | null {
  const message = update.message;
  if (!message) return null;
  if (message.from?.is_bot === true) return null;

  return {
    updateId: String(update.update_id),
    chatId: String(message.chat.id),
    text: message.text,
  };
}

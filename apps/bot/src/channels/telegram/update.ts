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
          // Self-chosen and changeable, so a label for a human reading a
          // list — never an identity check.
          first_name: z.string().max(200).optional(),
          last_name: z.string().max(200).optional(),
          username: z.string().max(200).optional(),
        })
        .optional(),
      // Unix seconds, UTC. Telegram states no timezone anywhere in an
      // update, so this is the moment and nothing about where the guest is.
      date: z.number().int(),
      text: z.string().min(1).max(MAX_TEXT_LENGTH),
    })
    .optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
type TelegramSender = NonNullable<NonNullable<TelegramUpdate['message']>['from']>;

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

  const name = contactName(message.from);

  return {
    updateId: String(update.update_id),
    chatId: String(message.chat.id),
    text: message.text,
    sentAt: sentAt(message.date),
    ...(name ? { contactName: name } : {}),
  };
}

/**
 * The platform's timestamp, bounded.
 *
 * It arrives in a payload, so it is input: a value in the future or from last
 * year would be used to decide whether the guest has already been answered,
 * and both readings are wrong in the direction of silence. Anything
 * implausible is treated as now, which is the safe end — it means the guest
 * gets told rather than ignored.
 */
function sentAt(unixSeconds: number): Date {
  const at = new Date(unixSeconds * 1000);
  const now = Date.now();
  const aDay = 24 * 60 * 60 * 1000;
  if (Number.isNaN(at.getTime()) || at.getTime() > now || now - at.getTime() > aDay) {
    return new Date(now);
  }
  return at;
}

/** First and last name if given, else the @username, else nothing. */
function contactName(from: TelegramSender | undefined): string | undefined {
  if (!from) return undefined;
  const full = [from.first_name, from.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  return from.username ? `@${from.username}` : undefined;
}

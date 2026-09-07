import { timingSafeEqual } from 'node:crypto';
import type { InboundChannel, InboundRequest, InboundResult } from '../channel.js';
import { telegramUpdateSchema, toInboundTextMessage } from './update.js';

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

/** Defined once: the route this channel serves and the URL it registers. */
export const TELEGRAM_WEBHOOK_PATH = '/telegram/webhook';

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * Lengths are compared first because timingSafeEqual throws on a mismatch;
 * that comparison reveals only the length, which an attacker choosing the
 * value already knows.
 */
function secretMatches(received: string | undefined, expected: string): boolean {
  if (received === undefined) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Telegram's implementation of the inbound port.
 *
 * Telegram authenticates a webhook with a secret token it echoes in a header,
 * set when the webhook is registered. Other platforms sign the body instead —
 * which is exactly why authentication belongs to the channel and not to the
 * shared route.
 */
export function createTelegramChannel(webhookSecret: string): InboundChannel {
  return {
    name: 'telegram',
    webhookPath: TELEGRAM_WEBHOOK_PATH,

    receive(request: InboundRequest): InboundResult {
      const header = request.headers[SECRET_HEADER];
      const received = Array.isArray(header) ? header[0] : header;

      if (!secretMatches(received, webhookSecret)) {
        return { kind: 'unauthenticated' };
      }

      const parsed = telegramUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return { kind: 'ignored', reason: 'failed_validation' };
      }

      const message = toInboundTextMessage(parsed.data);
      if (!message) {
        return { kind: 'ignored', reason: 'no_actionable_text' };
      }

      return { kind: 'message', message };
    },
  };
}

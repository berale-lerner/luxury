import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { recordInboundMessage } from '../conversations.js';
import type { ReplyDeps } from '../reply.js';
import { replyToConversation } from '../reply.js';
import { telegramUpdateSchema, toInboundTextMessage } from './update.js';

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

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

export interface WebhookDeps {
  readonly pool: pg.Pool;
  readonly webhookSecret: string;
  /** Omitted in tests that only exercise the intake path. */
  readonly reply?: Omit<ReplyDeps, 'pool'>;
}

/**
 * The Telegram webhook: the one internet-facing entry point in this service.
 *
 * There is no logged-in user behind it, so "protected" here means proving the
 * request came from Telegram (CLAUDE.md, "External integrations"). Everything
 * after that treats the body as hostile.
 *
 * Telegram redelivers whenever the endpoint does not answer 2xx in time, so
 * the reply code is a decision about retrying:
 *
 * - a payload this service cannot act on is permanent, and gets 200. Asking
 *   for it again would only produce the same result forever
 * - a failure to store it is transient — the database was unreachable, a
 *   statement timed out — and gets 500, because a retry is exactly what
 *   should happen. Swallowing it would silently lose a guest's message
 *
 * The deduplicating insert is what makes that retry safe to accept twice.
 */
export function registerTelegramWebhook(app: FastifyInstance, deps: WebhookDeps): void {
  app.post('/telegram/webhook', async (request: FastifyRequest, reply) => {
    const header = request.headers[SECRET_HEADER];
    const received = Array.isArray(header) ? header[0] : header;

    if (!secretMatches(received, deps.webhookSecret)) {
      request.log.warn({ event: 'telegram.webhook.rejected' }, 'secret token mismatch');
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const parsed = telegramUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      // Authentic but not a shape this service handles. Acknowledged so it is
      // not redelivered.
      request.log.warn({ event: 'telegram.webhook.unparsable' }, 'update failed validation');
      return reply.code(200).send({ ok: true });
    }

    const inbound = toInboundTextMessage(parsed.data);
    if (!inbound) {
      request.log.info(
        { event: 'telegram.webhook.ignored', updateId: parsed.data.update_id },
        'no actionable text in update',
      );
      return reply.code(200).send({ ok: true });
    }

    try {
      const result = await recordInboundMessage(deps.pool, inbound);
      request.log.info(
        {
          event: 'telegram.webhook.received',
          conversationId: result.conversationId,
          updateId: inbound.updateId,
          stored: result.stored,
          agentMuted: result.agentMuted,
        },
        'inbound message recorded',
      );

      // A redelivery is stored once and answered once. Without this check a
      // slow response would have the guest receive the same reply twice.
      if (result.stored && deps.reply) {
        await replyToConversation(
          { pool: deps.pool, ...deps.reply, log: (event) => request.log.info(event) },
          result.conversationId,
          result.agentMuted,
        );
      }
    } catch (error) {
      // Logged without the message body: conversation content is not written
      // to logs (STANDARDS.md).
      request.log.error(
        { event: 'telegram.webhook.failed', updateId: inbound.updateId, err: error },
        'failed to record inbound message',
      );
      // Transient: ask Telegram to send it again rather than lose it.
      return reply.code(500).send({ error: 'internal' });
    }

    return reply.code(200).send({ ok: true });
  });
}

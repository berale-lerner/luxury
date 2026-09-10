import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import {
  awaitsReply,
  recordInboundMessage,
  sendUnavailableNotice,
} from '../conversations/index.js';
import type { ReplyDeps } from '../reply.js';
import { replyToConversation } from '../reply.js';
import type { InboundChannel } from './channel.js';

export interface WebhookDeps {
  readonly pool: pg.Pool;
  readonly channels: readonly InboundChannel[];
  /** Omitted in tests that only exercise the intake path. */
  readonly reply?: Omit<ReplyDeps, 'pool'>;
}

/**
 * One route per channel, all sharing this handler.
 *
 * Authentication and parsing belong to the channel; what happens afterwards
 * is identical whichever platform the message came from, which is the point
 * of the port. Adding a platform adds an entry to `channels`, not a branch
 * here.
 *
 * The reply code is a decision about redelivery. Providers redeliver when the
 * endpoint does not answer 2xx in time (Telegram immediately, MiniHotel six
 * times over six hours), so:
 *
 * - a payload this service cannot act on is permanent, and gets 200. Asking
 *   for it again would only produce the same result forever
 * - a failure to store it is transient and gets 500, because a retry is
 *   exactly what should happen. Swallowing it would lose a guest's message
 *
 * The deduplicating insert is what makes accepting that retry safe.
 *
 * Failing to *answer* is the third case, and it is not the same as failing to
 * store. The message is safely recorded; what broke is downstream — a model
 * provider returning 503, most likely, which this service cannot fix. The
 * retries for that live in the agent layer, inside this request, bounded so
 * they cannot spend the platform's whole delivery budget. By the time an
 * error reaches here they are already spent, so asking the platform to
 * redeliver would only buy another round of the same failure a minute later,
 * with the guest still watching nothing happen.
 *
 * So this says so, and accepts the delivery. The guest gets a sentence
 * instead of silence, and the message is on record for a manager to pick up.
 */
export function registerChannelWebhooks(app: FastifyInstance, deps: WebhookDeps): void {
  for (const channel of deps.channels) {
    app.post(channel.webhookPath, async (request, reply) => {
      const result = channel.receive({ headers: request.headers, body: request.body });

      if (result.kind === 'unauthenticated') {
        request.log.warn(
          { event: 'channel.webhook.rejected', channel: channel.name },
          'request could not be proven to come from the platform',
        );
        return reply.code(401).send({ error: 'unauthorized' });
      }

      if (result.kind === 'ignored') {
        request.log.info(
          { event: 'channel.webhook.ignored', channel: channel.name, reason: result.reason },
          'nothing actionable in the update',
        );
        return reply.code(200).send({ ok: true });
      }

      const inbound = result.message;

      let recorded;
      try {
        recorded = await recordInboundMessage(deps.pool, inbound, channel.name);
        request.log.info(
          {
            event: 'channel.webhook.received',
            channel: channel.name,
            conversationId: recorded.conversationId,
            updateId: inbound.updateId,
            stored: recorded.stored,
            agentMuted: recorded.agentMuted,
          },
          'inbound message recorded',
        );
      } catch (error) {
        // Logged without the message body: conversation content is not
        // written to logs (STANDARDS.md).
        request.log.error(
          {
            event: 'channel.webhook.failed',
            channel: channel.name,
            updateId: inbound.updateId,
            err: error,
          },
          'failed to store inbound message',
        );
        // Transient: ask the platform to send it again rather than lose it.
        return reply.code(500).send({ error: 'internal' });
      }

      try {
        // Answered when the conversation is still waiting on one, rather than
        // when this particular delivery stored a row. A redelivery after a
        // failed attempt stores nothing, and keying on that left the guest's
        // message stored and permanently unanswered.
        if (deps.reply && (await awaitsReply(deps.pool, recorded.conversationId))) {
          await replyToConversation(
            { pool: deps.pool, ...deps.reply, log: (event) => request.log.info(event) },
            recorded.conversationId,
            recorded.agentMuted,
          );
        }
      } catch (error) {
        request.log.error(
          {
            event: 'channel.webhook.failed',
            channel: channel.name,
            updateId: inbound.updateId,
            err: error,
          },
          'failed to answer inbound message',
        );

        if (deps.reply) {
          await sendUnavailableNotice(
            {
              pool: deps.pool,
              messaging: deps.reply.messaging,
              log: (event) => request.log.info(event),
            },
            recorded.conversationId,
          );
        }

        return reply.code(200).send({ ok: true });
      }

      return reply.code(200).send({ ok: true });
    });
  }
}

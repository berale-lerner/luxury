import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { recordInboundMessage } from '../conversations/index.js';
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

      try {
        const recorded = await recordInboundMessage(deps.pool, inbound, channel.name);
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

        // A redelivery is stored once and answered once. Without this check a
        // slow response would have the guest receive the same reply twice.
        if (recorded.stored && deps.reply) {
          await replyToConversation(
            { pool: deps.pool, ...deps.reply, log: (event) => request.log.info(event) },
            recorded.conversationId,
            recorded.agentMuted,
          );
        }
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
          'failed to handle inbound message',
        );
        // Transient: ask the platform to send it again rather than lose it.
        return reply.code(500).send({ error: 'internal' });
      }

      return reply.code(200).send({ ok: true });
    });
  }
}

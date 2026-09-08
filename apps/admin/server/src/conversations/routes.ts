import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import type { ConversationId } from '@luxury/shared';
import type { MessagingClient } from '@luxury/messaging';
import {
  getConversation,
  listConversations,
  messagesSince,
  recordManagerMessage,
  setAgentMuted,
} from './queries.js';

const idSchema = z.string().uuid();
const sendSchema = z.object({ body: z.string().min(1).max(4096) });
/**
 * The cursor comes back exactly as it was issued. Validated anyway — it
 * arrives over the wire and is interpolated into a query as a timestamp and
 * a uuid, so its shape is not something to assume (STANDARDS.md).
 */
const cursorSchema = z.object({
  at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

const listSchema = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export interface ConversationRoutesDeps {
  readonly pool: pg.Pool;
  readonly messaging: MessagingClient;
}

/**
 * The conversation API behind the admin UI.
 *
 * Registered inside the guarded scope, so every route here has already been
 * proven to belong to a signed-in address on the allowlist. Nothing below
 * repeats that check, and nothing below may be moved outside that scope.
 */
export function registerConversationRoutes(
  app: FastifyInstance,
  deps: ConversationRoutesDeps,
): void {
  app.get('/api/conversations', async (request, reply) => {
    const query = listSchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: 'bad_query' });
    }
    return { conversations: await listConversations(deps.pool, query.data) };
  });

  app.get('/api/conversations/:id', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) {
      return reply.code(400).send({ error: 'bad_id' });
    }

    const found = await getConversation(deps.pool, id.data);
    if (!found) {
      return reply.code(404).send({ error: 'not_found' });
    }
    return found;
  });

  /**
   * What polling asks for: messages added since the client's cursor.
   *
   * Separate from the full-thread route rather than a parameter on it,
   * because they answer different questions — "give me this conversation"
   * and "give me what changed" — and only one of them grows with the length
   * of the thread.
   */
  app.get('/api/conversations/:id/messages', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) {
      return reply.code(400).send({ error: 'bad_id' });
    }

    const cursor = cursorSchema.safeParse(request.query);
    if (!cursor.success) {
      return reply.code(400).send({ error: 'bad_cursor' });
    }

    return messagesSince(deps.pool, id.data, cursor.data);
  });

  app.post('/api/conversations/:id/messages', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) {
      return reply.code(400).send({ error: 'bad_id' });
    }

    const parsed = sendSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'bad_body' });
    }

    const exists = await getConversation(deps.pool, id.data);
    if (!exists) {
      return reply.code(404).send({ error: 'not_found' });
    }

    // Sent before it is recorded: a stored message the guest never received
    // would show the manager a thread that does not match what happened.
    // The reverse — delivered but unrecorded — is recoverable by looking at
    // the channel, and is far less likely.
    await deps.messaging.sendToConversation(id.data as ConversationId, parsed.data.body);

    const message = await recordManagerMessage(deps.pool, id.data, parsed.data.body);

    request.log.info(
      {
        event: 'admin.message.sent',
        conversationId: id.data,
        by: request.admin?.email,
      },
      'manager sent a message',
    );

    return { message };
  });

  app.post('/api/conversations/:id/agent', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) {
      return reply.code(400).send({ error: 'bad_id' });
    }

    const parsed = z.object({ muted: z.boolean() }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'bad_body' });
    }

    await setAgentMuted(deps.pool, id.data, parsed.data.muted);
    request.log.info(
      {
        event: 'admin.agent.muted',
        conversationId: id.data,
        muted: parsed.data.muted,
        by: request.admin?.email,
      },
      'agent mute changed',
    );
    return { muted: parsed.data.muted };
  });

  app.get('/api/me', async (request) => ({ admin: request.admin }));
}

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type pg from 'pg';
import type { MessagingClient } from '@luxury/messaging';
import { createAdminGuard, type SessionReader } from './auth/session.js';
import { registerConversationRoutes } from './conversations/routes.js';

export interface BuildAppOptions {
  readonly pool: pg.Pool;
  readonly session: SessionReader;
  readonly messaging: MessagingClient;
  readonly logLevel?: string;
  /** Built SPA to serve. Omitted in tests, which drive the API directly. */
  readonly webRoot?: string;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: { level: options.logLevel ?? 'info' } });

  // Outside the guard: the load balancer has no session.
  app.get('/health', async () => ({ status: 'ok' }));

  // Everything else lives in a scope with the gate attached to it, rather
  // than a check inside each handler. A route added later is guarded by
  // where it is registered, which is harder to forget than a decorator.
  app.register(async (guarded) => {
    guarded.addHook('preHandler', createAdminGuard({ pool: options.pool, session: options.session }));
    registerConversationRoutes(guarded, { pool: options.pool, messaging: options.messaging });
  });

  if (options.webRoot) {
    app.register(fastifyStatic, { root: options.webRoot });
    // The SPA owns its routing; unknown paths return the shell rather than a
    // 404, and the API above has already claimed everything under /api.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.code(404).send({ error: 'not_found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

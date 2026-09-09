import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type pg from 'pg';
import type { MessagingClient } from '@luxury/messaging';
import { createAdminGuard, type SessionReader } from './auth/session.js';
import { assertRouteDeclaresRole, createRoleGate } from './auth/roles.js';
import { registerConversationRoutes } from './conversations/routes.js';
import { registerUserRoutes } from './users/routes.js';

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
    // Order is the design: who this is, then whether that is enough for the
    // route being asked for.
    guarded.addHook('preHandler', createAdminGuard({ pool: options.pool, session: options.session }));
    guarded.addHook('preHandler', createRoleGate());

    // The gate already fails closed for a route that declares nothing. This
    // moves the moment the omission is noticed from a manager's 403 in
    // production to a failure to start, here and in CI.
    guarded.addHook('onRoute', assertRouteDeclaresRole);

    registerConversationRoutes(guarded, { pool: options.pool, messaging: options.messaging });
    registerUserRoutes(guarded, { pool: options.pool });
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

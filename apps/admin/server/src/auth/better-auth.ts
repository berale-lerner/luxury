import { betterAuth } from 'better-auth';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import pg from 'pg';
import type { SessionReader } from './session.js';
import type { AdminConfig } from '../config.js';

/**
 * Google sign-in, through Better Auth.
 *
 * A library rather than a hand-assembled OAuth flow, which is what CLAUDE.md
 * requires. What it gives us is identity — who the visitor is — and nothing
 * more. Whether that identity may enter is the allowlist's decision, checked
 * separately on every request.
 */
export function createAuth(config: AdminConfig, pool: pg.Pool) {
  return betterAuth({
    database: pool,
    baseURL: config.PUBLIC_URL,
    secret: config.AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
      },
    },
    // No email/password: the only way in is Google, so there is no password
    // in this system to leak or to reset.
    emailAndPassword: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Reads the signed-in identity, or null. Says nothing about permission. */
export function createSessionReader(auth: Auth): SessionReader {
  return {
    async read(request: FastifyRequest) {
      const session = await auth.api.getSession({
        headers: toHeaders(request.headers),
      });
      if (!session?.user?.email) return null;
      return { email: session.user.email, name: session.user.name ?? null };
    },
  };
}

/** Mounts Better Auth's own routes: sign-in, callback, sign-out. */
export function registerAuthRoutes(app: FastifyInstance, auth: Auth): void {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const url = new URL(request.url, `${request.protocol}://${request.hostname}`);
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers: toHeaders(request.headers),
          ...(request.method !== 'GET' && request.body
            ? { body: JSON.stringify(request.body) }
            : {}),
        }),
      );

      reply.status(response.status);
      response.headers.forEach((value, key) => void reply.header(key, value));
      return reply.send(response.body ? await response.text() : null);
    },
  });
}

function toHeaders(source: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(',') : value);
  }
  return headers;
}

import type { FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { isAllowed } from './allowlist.js';

/** Who the request is, once both checks have passed. */
export interface AdminIdentity {
  readonly email: string;
  readonly name: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminIdentity;
  }
}

/** Reads the verified identity from the session, or null when signed out. */
export interface SessionReader {
  read(request: FastifyRequest): Promise<{ email: string; name: string | null } | null>;
}

export interface GuardDeps {
  readonly pool: pg.Pool;
  readonly session: SessionReader;
}

/**
 * The gate in front of every admin route.
 *
 * Two separate questions, and both have to be answered on every request:
 * who is this (the session), and are they allowed (the allowlist). Checking
 * the allowlist only at sign-in would leave a removed manager with a valid
 * session and full access until it expired.
 *
 * Registered as a hook on the whole API scope rather than per handler,
 * because a handler someone forgets to decorate should fail closed
 * (STANDARDS.md).
 */
export function createAdminGuard(deps: GuardDeps) {
  return async function guard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const identity = await deps.session.read(request);

    if (!identity) {
      await reply.code(401).send({ error: 'not_signed_in' });
      return;
    }

    if (!(await isAllowed(deps.pool, identity.email))) {
      // Logged: an authenticated stranger reaching the admin URL is worth
      // seeing. The email is the subject of the decision, not guest data.
      request.log.warn(
        { event: 'admin.access.denied', email: identity.email },
        'signed in but not on the allowlist',
      );
      await reply.code(403).send({ error: 'not_allowed' });
      return;
    }

    request.admin = { email: identity.email, name: identity.name };
  };
}

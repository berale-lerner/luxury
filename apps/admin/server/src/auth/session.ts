import type { FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { findAllowedAdmin } from './allowlist.js';
import type { AdminRole } from './roles.js';

/** Who the request is, once both checks have passed. */
export interface AdminIdentity {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: AdminRole;
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
 * session and full access until it expired — and the same applies to a role,
 * which is read here rather than carried in the session for that reason.
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

    const allowed = await findAllowedAdmin(deps.pool, identity.email);

    if (!allowed) {
      // Logged: an authenticated stranger reaching the admin URL is worth
      // seeing. The email is the subject of the decision, not guest data.
      request.log.warn(
        { event: 'admin.access.denied', email: identity.email },
        'signed in but not on the allowlist',
      );
      await reply.code(403).send({ error: 'not_allowed' });
      return;
    }

    // The email is the one the provider verified, not the one stored: they
    // are the same mailbox, and the session is the fresher fact.
    request.admin = {
      id: allowed.id,
      email: identity.email,
      name: identity.name,
      role: allowed.role,
    };
  };
}

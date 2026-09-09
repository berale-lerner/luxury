import type { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

/**
 * What someone on the allowlist may do.
 *
 * Ordered, and the order is the meaning: each role can do everything the one
 * before it can.
 *
 *   viewer   read conversations
 *   manager  and send messages, and mute the agent
 *   owner    and manage who is on this list
 *
 * Muting sits with manager rather than viewer because it changes what the
 * guest experiences, which is the line the roles are drawn on.
 */
export const ROLES = ['viewer', 'manager', 'owner'] as const;

export type AdminRole = (typeof ROLES)[number];

const RANK: Record<AdminRole, number> = { viewer: 0, manager: 1, owner: 2 };

export function isRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function atLeast(held: AdminRole, required: AdminRole): boolean {
  return RANK[held] >= RANK[required];
}

/**
 * The role a route requires, declared beside the route:
 *
 *   app.get('/api/conversations', { config: requires('viewer') }, handler)
 */
export function requires(role: AdminRole): { role: AdminRole } {
  return { role };
}

/** The requirement of a route that did not declare one. */
const UNDECLARED: AdminRole = 'owner';

/**
 * The second gate, after the guard has established who this is.
 *
 * A route that declares nothing requires the highest role, not the lowest.
 * That direction is the whole point: an endpoint written in a hurry and
 * registered without a `config` is then unreachable rather than open to
 * everyone with a viewer's session.
 */
export function createRoleGate() {
  return async function roleGate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // The guard runs first and has already answered 401/403 for anyone who
    // is not on the list at all; reaching here without an identity would mean
    // the hooks were reordered.
    const admin = request.admin;
    if (!admin) {
      await reply.code(401).send({ error: 'not_signed_in' });
      return;
    }

    const declared = (request.routeOptions.config as { role?: unknown } | undefined)?.role;
    const required = isRole(declared) ? declared : UNDECLARED;

    if (!atLeast(admin.role, required)) {
      request.log.warn(
        {
          event: 'admin.role.denied',
          email: admin.email,
          held: admin.role,
          required,
          route: request.routeOptions.url,
        },
        'signed in and allowed, but not for this route',
      );
      await reply.code(403).send({ error: 'insufficient_role', required });
      return;
    }
  };
}

/**
 * Startup check: every API route says what it needs.
 *
 * The gate above already fails closed, so this does not change what an
 * undeclared route permits — it changes when the omission is noticed, from a
 * manager's 403 in production to a failure to boot in development and CI.
 */
export function assertRouteDeclaresRole(route: RouteOptions): void {
  if (!route.url.startsWith('/api')) return;
  // HEAD is derived from GET by Fastify and carries the same config.
  if (!isRole((route.config as { role?: unknown } | undefined)?.role)) {
    throw new Error(
      `Route ${route.method} ${route.url} does not declare a required role. ` +
        `Add { config: requires('viewer' | 'manager' | 'owner') }.`,
    );
  }
}

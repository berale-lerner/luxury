import type { FastifyInstance, FastifyReply } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import { ROLES, requires } from '../auth/roles.js';
import {
  addUser,
  changeRole,
  listUsers,
  removeUser,
  UserWriteRefused,
  type UserWriteError,
} from './queries.js';

const roleSchema = z.enum(ROLES);
const idSchema = z.string().uuid();

/**
 * An address, validated rather than trusted to look like one.
 *
 * Lowercased and trimmed on the way in, because the lookup compares that way
 * and a row stored with different capitalisation would be a second entry for
 * the same mailbox.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(320);

const addSchema = z.object({ email: emailSchema, role: roleSchema });
const roleBodySchema = z.object({ role: roleSchema });

/** Refusals are the user's mistake, not the server's. */
const STATUS: Record<UserWriteError, number> = {
  not_found: 404,
  already_exists: 409,
  last_owner: 409,
  self: 409,
};

function refuse(reply: FastifyReply, error: unknown): FastifyReply | never {
  if (error instanceof UserWriteRefused) {
    return reply.code(STATUS[error.reason]).send({ error: error.reason });
  }
  throw error;
}

export interface UserRoutesDeps {
  readonly pool: pg.Pool;
}

/**
 * Managing who may enter the admin interface.
 *
 * Every route here is owner-only, and that is enforced on the server. The
 * screen hides what a viewer cannot use, but hiding a control is a courtesy
 * to the person using it, never the boundary (CLAUDE.md, "Admin access": the
 * allowlist is never enforced only in the UI, and a role is the same rule
 * over more surface).
 */
export function registerUserRoutes(app: FastifyInstance, deps: UserRoutesDeps): void {
  app.get('/api/users', { config: requires('owner') }, async () => ({
    users: await listUsers(deps.pool),
  }));

  app.post('/api/users', { config: requires('owner') }, async (request, reply) => {
    const body = addSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'bad_request' });

    try {
      const user = await addUser(deps.pool, {
        email: body.data.email,
        role: body.data.role,
        addedBy: request.admin!.email,
      });
      request.log.info(
        { event: 'admin.user.added', email: user.email, role: user.role, by: request.admin!.email },
        'address added to the allowlist',
      );
      return reply.code(201).send({ user });
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.patch('/api/users/:id', { config: requires('owner') }, async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    const body = roleBodySchema.safeParse(request.body);
    if (!id.success || !body.success) return reply.code(400).send({ error: 'bad_request' });

    try {
      const user = await changeRole(deps.pool, {
        id: id.data,
        role: body.data.role,
        actorId: request.admin!.id,
        actorEmail: request.admin!.email,
      });
      request.log.info(
        { event: 'admin.user.role_changed', email: user.email, role: user.role, by: request.admin!.email },
        'role changed',
      );
      return reply.send({ user });
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.delete('/api/users/:id', { config: requires('owner') }, async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'bad_request' });

    try {
      await removeUser(deps.pool, { id: id.data, actorId: request.admin!.id });
      request.log.info(
        { event: 'admin.user.removed', id: id.data, by: request.admin!.email },
        'address removed from the allowlist',
      );
      return reply.code(204).send();
    } catch (error) {
      return refuse(reply, error);
    }
  });
}

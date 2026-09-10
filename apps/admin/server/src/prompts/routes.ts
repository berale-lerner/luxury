import type { FastifyInstance, FastifyReply } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import { requires } from '../auth/roles.js';
import {
  createDocument,
  deleteDocument,
  getPrompt,
  getVersion,
  listAgents,
  listVersions,
  publish,
  PromptWriteRefused,
  reorderDocuments,
  revertTo,
  updateDocument,
  type PromptWriteError,
} from './queries.js';

const keySchema = z.string().min(1).max(64);
const idSchema = z.string().uuid();
const versionSchema = z.coerce.number().int().positive();

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(100_000).default(''),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().max(100_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'nothing to change' });

const orderSchema = z.object({ ids: z.array(idSchema).min(1).max(200) });

const STATUS: Record<PromptWriteError, number> = {
  no_agent: 404,
  not_found: 404,
  empty: 409,
  unchanged: 409,
  bad_order: 400,
};

function refuse(reply: FastifyReply, error: unknown): FastifyReply | never {
  if (error instanceof PromptWriteRefused) {
    return reply.code(STATUS[error.reason]).send({ error: error.reason });
  }
  throw error;
}

export interface PromptRoutesDeps {
  readonly pool: pg.Pool;
}

/**
 * The agent's system prompt: an ordered set of documents, edited as a draft
 * and published as a frozen version.
 *
 * Reading is a manager's; changing and publishing are an owner's. The
 * asymmetry is deliberate — an edit here changes what every guest is told,
 * immediately, with no deploy to roll back, which is a heavier action than
 * answering one of them.
 */
export function registerPromptRoutes(app: FastifyInstance, deps: PromptRoutesDeps): void {
  const read = { config: requires('manager') };
  const write = { config: requires('owner') };

  app.get('/api/agents', read, async () => ({ agents: await listAgents(deps.pool) }));

  app.get('/api/agents/:key/prompt', read, async (request, reply) => {
    const key = keySchema.safeParse((request.params as { key: string }).key);
    if (!key.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      return reply.send(await getPrompt(deps.pool, key.data));
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.get('/api/agents/:key/versions', read, async (request, reply) => {
    const key = keySchema.safeParse((request.params as { key: string }).key);
    if (!key.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      return reply.send({ versions: await listVersions(deps.pool, key.data) });
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.get('/api/agents/:key/versions/:number', read, async (request, reply) => {
    const params = request.params as { key: string; number: string };
    const key = keySchema.safeParse(params.key);
    const number = versionSchema.safeParse(params.number);
    if (!key.success || !number.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      return reply.send(await getVersion(deps.pool, key.data, number.data));
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.post('/api/agents/:key/documents', write, async (request, reply) => {
    const key = keySchema.safeParse((request.params as { key: string }).key);
    const body = createSchema.safeParse(request.body);
    if (!key.success || !body.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      const document = await createDocument(deps.pool, key.data, {
        ...body.data,
        by: request.admin!.email,
      });
      return reply.code(201).send({ document });
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.patch('/api/agents/:key/documents/:id', write, async (request, reply) => {
    const params = request.params as { key: string; id: string };
    const key = keySchema.safeParse(params.key);
    const id = idSchema.safeParse(params.id);
    const body = updateSchema.safeParse(request.body);
    if (!key.success || !id.success || !body.success) {
      return reply.code(400).send({ error: 'bad_request' });
    }
    try {
      const document = await updateDocument(deps.pool, key.data, {
        id: id.data,
        ...body.data,
        by: request.admin!.email,
      });
      return reply.send({ document });
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.delete('/api/agents/:key/documents/:id', write, async (request, reply) => {
    const params = request.params as { key: string; id: string };
    const key = keySchema.safeParse(params.key);
    const id = idSchema.safeParse(params.id);
    if (!key.success || !id.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      await deleteDocument(deps.pool, key.data, id.data);
      return reply.code(204).send();
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.post('/api/agents/:key/order', write, async (request, reply) => {
    const key = keySchema.safeParse((request.params as { key: string }).key);
    const body = orderSchema.safeParse(request.body);
    if (!key.success || !body.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      return reply.send({ documents: await reorderDocuments(deps.pool, key.data, body.data.ids) });
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.post('/api/agents/:key/publish', write, async (request, reply) => {
    const key = keySchema.safeParse((request.params as { key: string }).key);
    if (!key.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      const version = await publish(deps.pool, key.data, request.admin!.email);
      request.log.info(
        {
          event: 'prompt.published',
          agent: key.data,
          version: version.versionNumber,
          by: request.admin!.email,
        },
        'a new prompt version is now serving guests',
      );
      return reply.code(201).send({ version });
    } catch (error) {
      return refuse(reply, error);
    }
  });

  app.post('/api/agents/:key/versions/:number/revert', write, async (request, reply) => {
    const params = request.params as { key: string; number: string };
    const key = keySchema.safeParse(params.key);
    const number = versionSchema.safeParse(params.number);
    if (!key.success || !number.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      const documents = await revertTo(deps.pool, key.data, number.data, request.admin!.email);
      request.log.info(
        { event: 'prompt.reverted', agent: key.data, to: number.data, by: request.admin!.email },
        'documents restored from an earlier version — not yet published',
      );
      return reply.send({ documents });
    } catch (error) {
      return refuse(reply, error);
    }
  });
}

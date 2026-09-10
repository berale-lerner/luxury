/**
 * What a role may reach.
 *
 * The allowlist answers whether someone may be here at all; this answers what
 * they may do once they are. Both are decided on the server, so these tests
 * drive the real app — a control hidden in the interface proves nothing about
 * the endpoint behind it.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { buildApp } from '../../apps/admin/server/src/app.js';
import type { SessionReader } from '../../apps/admin/server/src/auth/session.js';
import {
  assertRouteDeclaresRole,
  atLeast,
  createRoleGate,
} from '../../apps/admin/server/src/auth/roles.js';
import { urlForRole } from '../helpers/config.js';

const VIEWER = 'roles-viewer@example.com';
const MANAGER = 'roles-manager@example.com';
const OWNER = 'roles-owner@example.com';
const PEOPLE = [VIEWER, MANAGER, OWNER];

const SOME_CONVERSATION = '00000000-0000-4000-8000-000000000000';

let pool: pg.Pool;
let admin: pg.Client;

function sessionOf(email: string): SessionReader {
  return { async read() { return { email, name: 'Test' }; } };
}

const messaging = {
  async sendToConversation() {
    return { channel: 'telegram' as const, providerMessageId: 'stub' };
  },
  async indicateTyping() {},
};

/** Runs one request against the real app as one of the three people. */
async function as(email: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string) {
  const app = buildApp({ pool, session: sessionOf(email), messaging, logLevel: 'silent' });
  await app.ready();
  try {
    return await app.inject({ method, url, payload: { body: 'hello', muted: true } });
  } finally {
    await app.close();
  }
}

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('admin_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();
  for (const [email, role] of [[VIEWER, 'viewer'], [MANAGER, 'manager'], [OWNER, 'owner']]) {
    await admin.query('INSERT INTO public.admin_allowlist (email, role) VALUES ($1, $2)', [
      email,
      role,
    ]);
  }
});

afterAll(async () => {
  await admin.query('DELETE FROM public.admin_allowlist WHERE email = ANY($1)', [PEOPLE]);
  await admin.end();
  await pool.end();
});

describe('a viewer', () => {
  it('reads conversations', async () => {
    expect((await as(VIEWER, 'GET', '/api/conversations')).statusCode).toBe(200);
  });

  it('cannot send a message', async () => {
    // The one that reaches a guest over Telegram.
    const response = await as(VIEWER, 'POST', `/api/conversations/${SOME_CONVERSATION}/messages`);
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'insufficient_role', required: 'manager' });
  });

  it('cannot mute the agent', async () => {
    // Muting changes what the guest experiences, which is the line the roles
    // are drawn on.
    expect(
      (await as(VIEWER, 'POST', `/api/conversations/${SOME_CONVERSATION}/agent`)).statusCode,
    ).toBe(403);
  });

  it('cannot see who else has access', async () => {
    expect((await as(VIEWER, 'GET', '/api/users')).statusCode).toBe(403);
  });
});

describe('a manager', () => {
  it('is past the role gate on sending', async () => {
    // 404 for a conversation that does not exist is the right kind of
    // failure: it means the request reached the handler.
    const response = await as(MANAGER, 'POST', `/api/conversations/${SOME_CONVERSATION}/messages`);
    expect(response.statusCode).not.toBe(403);
  });

  it('still cannot manage users', async () => {
    expect((await as(MANAGER, 'GET', '/api/users')).statusCode).toBe(403);
  });
});

describe('an owner', () => {
  it('manages users', async () => {
    expect((await as(OWNER, 'GET', '/api/users')).statusCode).toBe(200);
  });
});

describe('the prompt', () => {
  // Reading how the business talks is a manager's; changing it is not. An
  // edit here changes what every guest is told, immediately, with no deploy
  // to roll back — which is heavier than answering one of them.
  it('is readable by a manager', async () => {
    expect((await as(MANAGER, 'GET', '/api/agents')).statusCode).toBe(200);
  });

  it('is not readable by a viewer', async () => {
    expect((await as(VIEWER, 'GET', '/api/agents')).statusCode).toBe(403);
  });

  it.each([
    ['POST', '/api/agents/guest/documents'],
    ['POST', '/api/agents/guest/order'],
    ['POST', '/api/agents/guest/publish'],
    ['POST', '/api/agents/guest/versions/1/revert'],
    ['DELETE', `/api/agents/guest/documents/${SOME_CONVERSATION}`],
  ] as const)('is not changed by a manager: %s %s', async (method, url) => {
    const response = await as(MANAGER, method, url);
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: 'insufficient_role', required: 'owner' });
  });
});

/**
 * The gate driven directly, rather than through a server.
 *
 * fastify is a dependency of apps/admin and not of the test root, and pnpm's
 * layout means the root cannot import what it does not declare — which is the
 * package boundary doing its job. The gate is a plain function, so this asks
 * it the question without one.
 */
function gateFor(config: unknown) {
  const sent: { status?: number; body?: unknown } = {};
  const reply = {
    code(status: number) {
      sent.status = status;
      return this;
    },
    async send(body: unknown) {
      sent.body = body;
    },
  };
  const request = {
    admin: { id: 'x', email: VIEWER, name: null, role: 'viewer' as const },
    routeOptions: { config, url: '/api/forgot' },
    log: { warn() {} },
  };
  return { sent, run: () => createRoleGate()(request as never, reply as never) };
}

describe('a route that declares nothing', () => {
  it('requires the highest role rather than the lowest', async () => {
    // The direction is the whole point. An endpoint written in a hurry and
    // registered without a config must be unreachable, not open to every
    // viewer with a session.
    const { sent, run } = gateFor(undefined);
    await run();
    expect(sent.status).toBe(403);
    expect(sent.body).toEqual({ error: 'insufficient_role', required: 'owner' });
  });

  it('is not rescued by a config that names something else', async () => {
    // A typo in the field name is the same omission, and gets the same answer.
    const { sent, run } = gateFor({ roles: 'viewer' });
    await run();
    expect(sent.status).toBe(403);
  });

  it('fails at startup, so the omission is found before a manager finds it', () => {
    expect(() =>
      assertRouteDeclaresRole({ method: 'GET', url: '/api/forgot' } as never),
    ).toThrow(/does not declare a required role/);
  });

  it('is not required of routes outside the API', () => {
    // /health answers without a session at all: the load balancer has none.
    expect(() => assertRouteDeclaresRole({ method: 'GET', url: '/health' } as never)).not.toThrow();
  });
});

describe('the ordering of the roles', () => {
  it('is cumulative — each role can do what the one before it can', () => {
    expect(atLeast('owner', 'viewer')).toBe(true);
    expect(atLeast('manager', 'viewer')).toBe(true);
    expect(atLeast('viewer', 'manager')).toBe(false);
    expect(atLeast('manager', 'owner')).toBe(false);
  });
});

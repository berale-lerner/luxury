/**
 * The gate in front of the admin API.
 *
 * This page shows every guest conversation in the business, so the tests
 * that matter are the negative ones: that a stranger, and a signed-in
 * stranger, get nothing at all.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { buildApp } from '../../apps/admin/server/src/app.js';
import type { SessionReader } from '../../apps/admin/server/src/auth/session.js';
import { urlForRole } from '../helpers/config.js';
import { errorFrom, INSUFFICIENT_PRIVILEGE } from '../helpers/db.js';

const ALLOWED = 'manager@example.com';
const STRANGER = 'someone.else@example.com';

let pool: pg.Pool;
let admin: pg.Client;

/** Stands in for Better Auth: identity only, never permission. */
function sessionOf(email: string | null): SessionReader {
  return { async read() { return email ? { email, name: 'Test Manager' } : null; } };
}

const messaging = {
  async sendToConversation() {
    return { channel: 'telegram' as const, providerMessageId: 'stub' };
  },
};

function appFor(email: string | null) {
  return buildApp({ pool, session: sessionOf(email), messaging, logLevel: 'silent' });
}

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('admin_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();
  await admin.query(`INSERT INTO public.admin_allowlist (email) VALUES ($1)`, [ALLOWED]);
});

afterAll(async () => {
  await admin.query(`DELETE FROM public.admin_allowlist WHERE email = $1`, [ALLOWED]);
  await admin.end();
  await pool.end();
});

const ROUTES = [
  ['GET', '/api/me'],
  ['GET', '/api/conversations'],
  ['GET', '/api/conversations/00000000-0000-4000-8000-000000000000'],
  ['POST', '/api/conversations/00000000-0000-4000-8000-000000000000/messages'],
  ['POST', '/api/conversations/00000000-0000-4000-8000-000000000000/agent'],
] as const;

describe('a visitor who is not signed in', () => {
  it.each(ROUTES)('is refused on %s %s', async (method, url) => {
    const app = appFor(null);
    await app.ready();
    try {
      const response = await app.inject({ method, url, payload: {} });
      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});

describe('a visitor signed in but not on the allowlist', () => {
  it.each(ROUTES)('is refused on %s %s', async (method, url) => {
    const app = appFor(STRANGER);
    await app.ready();
    try {
      // Signing in with Google proves who someone is, not that they may
      // enter. Anyone on the internet can complete that flow.
      const response = await app.inject({ method, url, payload: {} });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('leaks nothing about what exists', async () => {
    const app = appFor(STRANGER);
    await app.ready();
    try {
      const response = await app.inject({ method: 'GET', url: '/api/conversations' });
      expect(response.json()).toEqual({ error: 'not_allowed' });
    } finally {
      await app.close();
    }
  });
});

describe('a manager on the allowlist', () => {
  it('is let through', async () => {
    const app = appFor(ALLOWED);
    await app.ready();
    try {
      const response = await app.inject({ method: 'GET', url: '/api/me' });
      expect(response.statusCode).toBe(200);
      expect(response.json().admin.email).toBe(ALLOWED);
    } finally {
      await app.close();
    }
  });

  it('loses access the moment the address is removed, without signing out', async () => {
    const app = appFor(ALLOWED);
    await app.ready();
    try {
      expect((await app.inject({ method: 'GET', url: '/api/me' })).statusCode).toBe(200);

      await admin.query(`DELETE FROM public.admin_allowlist WHERE email = $1`, [ALLOWED]);
      // Checked per request, not once at sign-in: otherwise a removed
      // manager keeps full access until the session expires.
      expect((await app.inject({ method: 'GET', url: '/api/me' })).statusCode).toBe(403);

      await admin.query(`INSERT INTO public.admin_allowlist (email) VALUES ($1)`, [ALLOWED]);
    } finally {
      await app.close();
    }
  });

  it('matches an address that differs only in case or spacing', async () => {
    const app = appFor(`  ${ALLOWED.toUpperCase()}  `);
    await app.ready();
    try {
      expect((await app.inject({ method: 'GET', url: '/api/me' })).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});

describe('the health endpoint', () => {
  it('answers without a session, because the load balancer has none', async () => {
    const app = appFor(null);
    await app.ready();
    try {
      const response = await app.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});

describe('the tables Better Auth stores sign-in state in', () => {
  it('are out of reach for the bot', async () => {
    const bot = new pg.Client({ connectionString: urlForRole('bot_user') });
    await bot.connect();
    try {
      for (const table of ['"user"', 'session', 'account', 'verification']) {
        const error = await errorFrom(() => bot.query(`SELECT * FROM public.${table}`));
        // public.account holds OAuth access and refresh tokens, which is the
        // strongest reason yet for the internet-facing service not to reach
        // any of these.
        expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
      }
    } finally {
      await bot.end();
    }
  });
});

describe('the sign-in screen', () => {
  it('starts the flow with a POST, which is what the library answers', async () => {
    const source = await readFile(
      new URL('../../apps/admin/web/src/SignIn.tsx', import.meta.url).pathname,
      'utf8',
    );
    // Better Auth returns the provider URL in a JSON body rather than
    // redirecting, so a plain <a href> reaches an endpoint that does not
    // answer GET. The first deployment shipped exactly that and 404ed.
    expect(source).toContain("method: 'POST'");
    expect(source).not.toContain('href="/api/auth/sign-in');
    expect(source).not.toContain('href="/api/auth/sign-out"');
  });
});

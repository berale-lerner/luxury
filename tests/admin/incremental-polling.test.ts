/**
 * Incremental polling of a thread.
 *
 * Polling used to re-read the whole conversation every eight seconds, which
 * is fine at four messages and wasteful at four hundred. Reading only what is
 * new is easy to get subtly wrong, and the tests below are the three ways it
 * goes wrong rather than a demonstration that it works.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { buildApp } from '../../apps/admin/server/src/app.js';
import type { SessionReader } from '../../apps/admin/server/src/auth/session.js';
import { messagesSince } from '../../apps/admin/server/src/conversations/queries.js';
import { urlForRole } from '../helpers/config.js';

const ALLOWED = 'poll-manager@example.com';

let pool: pg.Pool;
let db: pg.Client;
let conversationId: string;

const session: SessionReader = {
  async read() {
    return { email: ALLOWED, name: 'Manager' };
  },
};

const messaging = {
  async sendToConversation() {
    return { channel: 'telegram' as const, providerMessageId: 'stub' };
  },
};

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('admin_user') });
  db = new pg.Client({ connectionString: urlForRole('admin_user') });
  await db.connect();
  // manager, explicitly: sending a message and muting the agent both
  // reach the guest, so both sit above a viewer (migration 0010).
  await db.query(`INSERT INTO public.admin_allowlist (email, role) VALUES ($1, 'manager')`, [
    ALLOWED,
  ]);

  const conversation = await db.query<{ id: string }>(
    `INSERT INTO public.conversations (channel, channel_chat_id)
     VALUES ('telegram', 'poll-test') RETURNING id`,
  );
  conversationId = conversation.rows[0]!.id;
});

afterAll(async () => {
  await db.query(`DELETE FROM public.conversations WHERE channel_chat_id = 'poll-test'`);
  await db.query(`DELETE FROM public.admin_allowlist WHERE email = $1`, [ALLOWED]);
  await db.end();
  await pool.end();
});

/** Inserts at an explicit time, so ordering cases can be built deliberately. */
async function insertAt(body: string, at: string): Promise<{ id: string; createdAt: string }> {
  const row = await db.query<{ id: string; created_at: Date }>(
    `INSERT INTO public.messages (conversation_id, direction, sender, body, created_at)
     VALUES ($1, 'inbound', 'guest', $2, $3::timestamptz)
     RETURNING id, created_at`,
    [conversationId, body, at],
  );
  return { id: row.rows[0]!.id, createdAt: row.rows[0]!.created_at.toISOString() };
}

const BASE = '2026-03-01T10:00:00.000Z';

describe('reading only what is new', () => {
  it('returns the overlap window and nothing else when nothing is new', async () => {
    const first = await insertAt('one', BASE);
    const result = await messagesSince(pool, conversationId, {
      at: first.createdAt,
      id: first.id,
    });

    // The steady state. Not zero rows: the window is measured back from the
    // cursor, so the cursor's own row always falls inside it, and a row that
    // committed late is indistinguishable from one the client already has.
    // Paying a row or two per poll is the price of never losing a message,
    // and the client drops them by id.
    expect(result.messages.map((m) => m.body)).toEqual(['one']);
    expect(result.cursor).toEqual({ at: first.createdAt, id: first.id });
  });

  it('does not carry the older history along with what is new', async () => {
    const from = await insertAt('two', '2026-03-01T10:01:00.000Z');
    await insertAt('three', '2026-03-01T10:02:00.000Z');
    await insertAt('four', '2026-03-01T10:03:00.000Z');

    const result = await messagesSince(pool, conversationId, { at: from.createdAt, id: from.id });

    // 'one' predates the window by a minute and must not appear; that it
    // does not is the difference from re-reading the thread every poll.
    expect(result.messages.map((m) => m.body)).not.toContain('one');
    expect(result.messages.map((m) => m.body)).toContain('three');
    expect(result.messages.map((m) => m.body)).toContain('four');
    expect(result.cursor.id).toBe(result.messages[result.messages.length - 1]!.id);
  });
});

describe('the three ways a timestamp cursor goes wrong', () => {
  it('does not drop a message that shares a timestamp with the cursor', async () => {
    const shared = '2026-03-01T11:00:00.000Z';
    const a = await insertAt('same-time-a', shared);
    const b = await insertAt('same-time-b', shared);

    const [earlier, later] = [a, b].sort((x, y) => x.id.localeCompare(y.id));

    const result = await messagesSince(pool, conversationId, {
      at: earlier!.createdAt,
      id: earlier!.id,
    });

    // The failure this guards is a message silently never arriving. With the
    // timestamp alone and a strict `>`, the second of a pair sharing an
    // instant is dropped forever; the id in the tuple is what keeps it.
    expect(result.messages.map((m) => m.id)).toContain(later!.id);
  });

  it('still finds a row that committed late, behind the cursor', async () => {
    // Postgres stamps now() at transaction start, so a slow transaction can
    // become visible after a later one. The bot writing while the manager
    // writes is exactly this. Simulated by inserting a row with a timestamp
    // that predates a cursor already handed out.
    const ahead = await insertAt('committed-first', '2026-03-01T12:00:01.000Z');
    const behind = await insertAt('committed-late', '2026-03-01T12:00:00.500Z');

    const result = await messagesSince(pool, conversationId, {
      at: ahead.createdAt,
      id: ahead.id,
    });

    // Without the overlap window this row is stored, visible in the database,
    // and never delivered to the screen.
    expect(result.messages.map((m) => m.body)).toContain('committed-late');
  });

  it('re-reads the overlap window, which is why the client merges by id', async () => {
    const from = await insertAt('overlap-anchor', '2026-03-01T13:00:00.000Z');
    const result = await messagesSince(pool, conversationId, { at: from.createdAt, id: from.id });

    // Anything within the window may come back again. That is the trade the
    // overlap makes, and the reason duplicates have to be harmless.
    const ids = result.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the route', () => {
  function app() {
    return buildApp({ pool, session, messaging, logLevel: 'silent' });
  }

  it('hands out a cursor with the full thread', async () => {
    const server = app();
    await server.ready();
    try {
      const response = await server.inject({
        method: 'GET',
        url: `/api/conversations/${conversationId}`,
      });
      const body = response.json();
      // Issued by the server, so the browser never invents one from its own
      // clock.
      expect(body.cursor).toMatchObject({ at: expect.any(String), id: expect.any(String) });
      expect(body.cursor.id).toBe(body.messages[body.messages.length - 1].id);
    } finally {
      await server.close();
    }
  });

  it('rejects a cursor that is not a timestamp and a uuid', async () => {
    const server = app();
    await server.ready();
    try {
      const bad = await server.inject({
        method: 'GET',
        url: `/api/conversations/${conversationId}/messages?at=yesterday&id=nope`,
      });
      // It reaches a query as a timestamptz and a uuid; its shape is not
      // something to assume just because the server issued it.
      expect(bad.statusCode).toBe(400);
    } finally {
      await server.close();
    }
  });

  it('is behind the same guard as everything else', async () => {
    const server = buildApp({
      pool,
      session: { async read() { return null; } },
      messaging,
      logLevel: 'silent',
    });
    await server.ready();
    try {
      const response = await server.inject({
        method: 'GET',
        url: `/api/conversations/${conversationId}/messages?at=${encodeURIComponent(BASE)}&id=00000000-0000-4000-8000-000000000000`,
      });
      expect(response.statusCode).toBe(401);
    } finally {
      await server.close();
    }
  });
});

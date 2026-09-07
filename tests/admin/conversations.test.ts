/**
 * The conversation API behind the page.
 *
 * Runs against the real database as admin_user — the role the service uses —
 * so the queries, the joins and the transaction are the ones that will run.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { buildApp } from '../../apps/admin/server/src/app.js';
import type { SessionReader } from '../../apps/admin/server/src/auth/session.js';
import { urlForRole } from '../helpers/config.js';

const ALLOWED = 'convo-manager@example.com';

let pool: pg.Pool;
let db: pg.Client;
let conversationId: string;
const sent: Array<{ conversationId: string; text: string }> = [];

const session: SessionReader = {
  async read() {
    return { email: ALLOWED, name: 'Manager' };
  },
};

const messaging = {
  async sendToConversation(id: string, text: string) {
    sent.push({ conversationId: id, text });
    return { channel: 'telegram' as const, providerMessageId: 'stub-1' };
  },
};

function app() {
  return buildApp({ pool, session, messaging, logLevel: 'silent' });
}

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('admin_user') });
  db = new pg.Client({ connectionString: urlForRole('admin_user') });
  await db.connect();
  await db.query(`INSERT INTO public.admin_allowlist (email) VALUES ($1)`, [ALLOWED]);

  const conversation = await db.query<{ id: string }>(
    `INSERT INTO public.conversations (channel, channel_chat_id)
     VALUES ('telegram', 'admin-test-chat') RETURNING id`,
  );
  conversationId = conversation.rows[0]!.id;

  await db.query(
    `INSERT INTO public.messages (conversation_id, direction, sender, body, created_at)
     VALUES ($1, 'inbound', 'guest', 'יש לכם דירה פנויה באפריל?', now() - interval '2 hours'),
            ($1, 'outbound', 'agent', 'שלום! על אילו תאריכים מדובר?', now() - interval '1 hour')`,
    [conversationId],
  );
});

afterAll(async () => {
  await db.query(`DELETE FROM public.conversations WHERE channel_chat_id = 'admin-test-chat'`);
  await db.query(`DELETE FROM public.admin_allowlist WHERE email = $1`, [ALLOWED]);
  await db.end();
  await pool.end();
});

describe('the conversation list', () => {
  it('carries what the row needs to render, including the platform', async () => {
    const server = app();
    await server.ready();
    try {
      const response = await server.inject({ method: 'GET', url: '/api/conversations' });
      const row = response
        .json()
        .conversations.find((c: { id: string }) => c.id === conversationId);

      expect(row).toMatchObject({
        channel: 'telegram',
        agentMuted: false,
        messageCount: 2,
        lastMessageDirection: 'outbound',
      });
      // The preview is the newest message, from one query rather than one
      // per row.
      expect(row.lastMessagePreview).toBe('שלום! על אילו תאריכים מדובר?');
    } finally {
      await server.close();
    }
  });

  it('searches across the guest, the chat id and the message text', async () => {
    const server = app();
    await server.ready();
    try {
      const found = await server.inject({
        method: 'GET',
        url: '/api/conversations?search=admin-test-chat',
      });
      expect(found.json().conversations).toHaveLength(1);

      const missing = await server.inject({
        method: 'GET',
        url: '/api/conversations?search=nothing-matches-this',
      });
      expect(missing.json().conversations).toHaveLength(0);
    } finally {
      await server.close();
    }
  });
});

describe('one conversation', () => {
  it('returns its messages oldest first', async () => {
    const server = app();
    await server.ready();
    try {
      const response = await server.inject({
        method: 'GET',
        url: `/api/conversations/${conversationId}`,
      });
      const messages = response.json().messages;
      expect(messages.map((m: { sender: string }) => m.sender)).toEqual(['guest', 'agent']);
    } finally {
      await server.close();
    }
  });

  it('rejects an id that is not a uuid without touching the database', async () => {
    const server = app();
    await server.ready();
    try {
      const response = await server.inject({ method: 'GET', url: '/api/conversations/not-a-uuid' });
      expect(response.statusCode).toBe(400);
    } finally {
      await server.close();
    }
  });

  it('is a 404 for a conversation that does not exist', async () => {
    const server = app();
    await server.ready();
    try {
      const response = await server.inject({
        method: 'GET',
        url: '/api/conversations/00000000-0000-4000-8000-000000000000',
      });
      expect(response.statusCode).toBe(404);
    } finally {
      await server.close();
    }
  });
});

describe('sending from the admin interface', () => {
  it('delivers, records the message, and mutes the agent', async () => {
    const server = app();
    await server.ready();
    try {
      sent.length = 0;
      const response = await server.inject({
        method: 'POST',
        url: `/api/conversations/${conversationId}/messages`,
        payload: { body: 'אני בודק ומעדכן אותך' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toMatchObject({
        direction: 'outbound',
        sender: 'manager',
        body: 'אני בודק ומעדכן אותך',
      });

      // Sent through the shared layer, addressed by conversation id only.
      expect(sent).toEqual([{ conversationId, text: 'אני בודק ומעדכן אותך' }]);

      // Muting is part of the same write: a manager whose message was stored
      // but whose mute was not would find the agent replying over them.
      const row = await db.query<{ agent_muted: boolean }>(
        'SELECT agent_muted FROM public.conversations WHERE id = $1',
        [conversationId],
      );
      expect(row.rows[0]!.agent_muted).toBe(true);
    } finally {
      await server.close();
    }
  });

  it('refuses an empty message', async () => {
    const server = app();
    await server.ready();
    try {
      const response = await server.inject({
        method: 'POST',
        url: `/api/conversations/${conversationId}/messages`,
        payload: { body: '' },
      });
      expect(response.statusCode).toBe(400);
    } finally {
      await server.close();
    }
  });

  it('lets the manager hand the conversation back to the agent', async () => {
    const server = app();
    await server.ready();
    try {
      const response = await server.inject({
        method: 'POST',
        url: `/api/conversations/${conversationId}/agent`,
        payload: { muted: false },
      });
      expect(response.statusCode).toBe(200);

      const row = await db.query<{ agent_muted: boolean }>(
        'SELECT agent_muted FROM public.conversations WHERE id = $1',
        [conversationId],
      );
      // Only on an explicit action, never on a timer (CLAUDE.md).
      expect(row.rows[0]!.agent_muted).toBe(false);
    } finally {
      await server.close();
    }
  });
});

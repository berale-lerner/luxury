/**
 * Storing an inbound message, against the real database built from the
 * migrations and connected as bot_user — the role the service actually uses.
 *
 * A mocked database would pass these while the RLS policies and column grants
 * that carry the security are never exercised at all.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { recordInboundMessage } from '../../apps/bot/src/conversations/index.js';
import { urlForRole } from '../helpers/config.js';

let pool: pg.Pool;
let admin: pg.Client;

/** Distinct per test file so nothing collides with the seeded fixtures. */
const chat = (suffix: string) => `tg-persist-${suffix}`;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('bot_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();
});

afterAll(async () => {
  // Leaves the seeded fixtures untouched for the other suites.
  await admin.query(`DELETE FROM public.conversations WHERE channel_chat_id LIKE 'tg-persist-%'`);
  await admin.end();
  await pool.end();
});

async function messagesFor(conversationId: string) {
  const result = await admin.query(
    `SELECT direction, sender, body, provider_update_id
       FROM public.messages
      WHERE conversation_id = $1
      ORDER BY created_at`,
    [conversationId],
  );
  return result.rows;
}

describe('recording an inbound message', () => {
  it('creates the conversation on a first contact and stores the message', async () => {
    const result = await recordInboundMessage(pool, {
      updateId: '1001',
      chatId: chat('first'),
      text: 'Do you have anything free in April?',
    }, 'telegram');

    expect(result.stored).toBe(true);
    expect(result.agentMuted).toBe(false);

    const rows = await messagesFor(result.conversationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      direction: 'inbound',
      sender: 'guest',
      body: 'Do you have anything free in April?',
      provider_update_id: '1001',
    });
  });

  it('reuses the same conversation for the next message from that chat', async () => {
    const chatId = chat('returning');

    const first = await recordInboundMessage(pool, {
      updateId: '2001',
      chatId,
      text: 'Hello',
    }, 'telegram');
    const second = await recordInboundMessage(pool, {
      updateId: '2002',
      chatId,
      text: 'Are you there?',
    }, 'telegram');

    // The regression this guards: without a way to look a conversation up by
    // chat id, every message would open a new one.
    expect(second.conversationId).toBe(first.conversationId);
    expect(await messagesFor(first.conversationId)).toHaveLength(2);
  });

  it('stores a redelivered update only once', async () => {
    const chatId = chat('redelivery');
    const update = { updateId: '3001', chatId, text: 'Sent once, delivered twice' };

    const first = await recordInboundMessage(pool, update, 'telegram');
    const retry = await recordInboundMessage(pool, update, 'telegram');

    expect(first.stored).toBe(true);
    // Telegram retries whenever the endpoint was slow. Answering the same
    // guest twice is the failure this prevents.
    expect(retry.stored).toBe(false);
    expect(retry.conversationId).toBe(first.conversationId);
    expect(await messagesFor(first.conversationId)).toHaveLength(1);
  });

  it('keeps separate chats in separate conversations', async () => {
    const a = await recordInboundMessage(pool, {
      updateId: '4001',
      chatId: chat('sep-a'),
      text: 'from A',
    }, 'telegram');
    const b = await recordInboundMessage(pool, {
      updateId: '4002',
      chatId: chat('sep-b'),
      text: 'from B',
    }, 'telegram');

    expect(a.conversationId).not.toBe(b.conversationId);
    expect(await messagesFor(a.conversationId)).toHaveLength(1);
    expect(await messagesFor(b.conversationId)).toHaveLength(1);
  });

  it('reports a conversation a manager has taken over', async () => {
    const chatId = chat('muted');
    const opened = await recordInboundMessage(pool, {
      updateId: '5001',
      chatId,
      text: 'first',
    }, 'telegram');

    await admin.query('UPDATE public.conversations SET agent_muted = true WHERE id = $1', [
      opened.conversationId,
    ]);

    const next = await recordInboundMessage(pool, {
      updateId: '5002',
      chatId,
      text: 'second',
    }, 'telegram');

    // The message is still recorded — the manager needs to see it. What the
    // flag governs is whether the agent may answer.
    expect(next.stored).toBe(true);
    expect(next.agentMuted).toBe(true);
  });

  it('advances last_message_at when a message is stored', async () => {
    const result = await recordInboundMessage(pool, {
      updateId: '6001',
      chatId: chat('timestamp'),
      text: 'tick',
    }, 'telegram');

    const row = await admin.query(
      'SELECT last_message_at FROM public.conversations WHERE id = $1',
      [result.conversationId],
    );
    expect(row.rows[0].last_message_at).not.toBeNull();
  });
});

describe('the name the platform reports', () => {
  it('is stored when the conversation is created', async () => {
    const result = await recordInboundMessage(
      pool,
      { updateId: '7001', chatId: chat('named'), text: 'hello', contactName: 'Dana Cohen' },
      'telegram',
    );

    const row = await admin.query<{ contact_name: string | null }>(
      'SELECT contact_name FROM public.conversations WHERE id = $1',
      [result.conversationId],
    );
    expect(row.rows[0]!.contact_name).toBe('Dana Cohen');
  });

  it('follows a rename', async () => {
    const chatId = chat('renamed');
    const first = await recordInboundMessage(
      pool,
      { updateId: '7101', chatId, text: 'hello', contactName: 'Dana' },
      'telegram',
    );
    await recordInboundMessage(
      pool,
      { updateId: '7102', chatId, text: 'again', contactName: 'Dana Cohen' },
      'telegram',
    );

    const row = await admin.query<{ contact_name: string | null }>(
      'SELECT contact_name FROM public.conversations WHERE id = $1',
      [first.conversationId],
    );
    // People rename themselves; the list should show what they call
    // themselves now.
    expect(row.rows[0]!.contact_name).toBe('Dana Cohen');
  });

  it('leaves the stored name alone when a message carries none', async () => {
    const chatId = chat('nameless');
    const first = await recordInboundMessage(
      pool,
      { updateId: '7201', chatId, text: 'hello', contactName: 'Dana Cohen' },
      'telegram',
    );
    await recordInboundMessage(pool, { updateId: '7202', chatId, text: 'again' }, 'telegram');

    const row = await admin.query<{ contact_name: string | null }>(
      'SELECT contact_name FROM public.conversations WHERE id = $1',
      [first.conversationId],
    );
    expect(row.rows[0]!.contact_name).toBe('Dana Cohen');
  });
});

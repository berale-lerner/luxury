/**
 * Payload validation on the untrusted body.
 *
 * The response code carries meaning here: an authentic request that this
 * service cannot act on is permanent and must be acknowledged, or Telegram
 * redelivers it forever. Every case below is authentic — the secret is
 * correct — and differs only in shape.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { buildApp } from '../../apps/bot/src/app.js';
import { createTelegramChannel } from '../../apps/bot/src/channels/index.js';
import { urlForRole } from '../helpers/config.js';
import { telegramUpdateSchema, toInboundTextMessage } from '../../apps/bot/src/channels/telegram/update.js';

const SECRET = 'a-secret-of-at-least-16-chars';

// Derived from the function under test, so the suite needs no direct
// dependency on fastify: it belongs to apps/bot, not to the root.
let app: ReturnType<typeof buildApp>;
let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('bot_user') });
  app = buildApp({
    pool,
    channels: [createTelegramChannel(SECRET)],
    logLevel: 'silent',
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

function post(payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/telegram/webhook',
    headers: { 'x-telegram-bot-api-secret-token': SECRET },
    payload: payload as object,
  });
}

describe('telegram webhook payload validation', () => {
  it('acknowledges an update with no message member', async () => {
    const response = await post({ update_id: 10 });
    expect(response.statusCode).toBe(200);
  });

  it('acknowledges a malformed update rather than asking for it again', async () => {
    const response = await post({ nonsense: true });
    expect(response.statusCode).toBe(200);
  });

  it('acknowledges an update whose chat id is missing', async () => {
    const response = await post({
      update_id: 11,
      message: { message_id: 1, date: 1, text: 'hi' },
    });
    expect(response.statusCode).toBe(200);
  });
});

describe('update parsing', () => {
  const base = {
    update_id: 42,
    message: { message_id: 7, chat: { id: -100 }, date: 1, text: 'hello' },
  };

  it('narrows a text message and stringifies the ids', () => {
    const parsed = telegramUpdateSchema.parse(base);
    const inbound = toInboundTextMessage(parsed);
    expect(inbound).toEqual({ updateId: '42', chatId: '-100', text: 'hello' });
  });

  it('drops a message sent by another bot', () => {
    const parsed = telegramUpdateSchema.parse({
      ...base,
      message: { ...base.message, from: { id: 1, is_bot: true } },
    });
    expect(toInboundTextMessage(parsed)).toBeNull();
  });

  it('keeps a message from a human sender', () => {
    const parsed = telegramUpdateSchema.parse({
      ...base,
      message: { ...base.message, from: { id: 1, is_bot: false } },
    });
    expect(toInboundTextMessage(parsed)?.text).toBe('hello');
  });

  it('rejects an empty message body', () => {
    const result = telegramUpdateSchema.safeParse({
      ...base,
      message: { ...base.message, text: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects text longer than Telegram itself allows', () => {
    const result = telegramUpdateSchema.safeParse({
      ...base,
      message: { ...base.message, text: 'x'.repeat(4097) },
    });
    expect(result.success).toBe(false);
  });

  it('ignores members it was not asked to parse', () => {
    const parsed = telegramUpdateSchema.parse({
      ...base,
      edited_message: { message_id: 8, chat: { id: -100 }, date: 2, text: 'edited' },
      channel_post: { anything: 'at all' },
    });
    expect(Object.keys(parsed).sort()).toEqual(['message', 'update_id']);
  });
});

/**
 * The webhook is the one public endpoint in this service, and there is no
 * logged-in user behind it. These tests cover the only thing standing between
 * the internet and the database: proving the request came from Telegram.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { buildApp } from '../../apps/bot/src/app.js';
import { createTelegramChannel } from '../../apps/bot/src/channels/index.js';
import { urlForRole } from '../helpers/config.js';

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

function post(headers: Record<string, string>, payload: unknown) {
  return app.inject({ method: 'POST', url: '/telegram/webhook', headers, payload: payload as object });
}

const validUpdate = {
  update_id: 1,
  message: { message_id: 1, chat: { id: 123 }, date: 1, text: 'hello' },
};

describe('telegram webhook authentication', () => {
  it('rejects a request with no secret token header', async () => {
    const response = await post({}, validUpdate);
    expect(response.statusCode).toBe(401);
  });

  it('rejects a wrong secret token', async () => {
    const response = await post(
      { 'x-telegram-bot-api-secret-token': 'not-the-secret-at-all' },
      validUpdate,
    );
    expect(response.statusCode).toBe(401);
  });

  it('rejects a secret that is a prefix of the real one', async () => {
    const response = await post(
      { 'x-telegram-bot-api-secret-token': SECRET.slice(0, -1) },
      validUpdate,
    );
    expect(response.statusCode).toBe(401);
  });

  it('rejects an empty secret token', async () => {
    const response = await post({ 'x-telegram-bot-api-secret-token': '' }, validUpdate);
    expect(response.statusCode).toBe(401);
  });

  it('writes nothing to the database when the secret is wrong', async () => {
    const owner = new pg.Client({ connectionString: urlForRole('admin_user') });
    await owner.connect();
    try {
      const before = await owner.query('SELECT count(*)::int AS n FROM public.messages');
      await post({ 'x-telegram-bot-api-secret-token': 'wrong' }, validUpdate);
      const after = await owner.query('SELECT count(*)::int AS n FROM public.messages');
      expect(after.rows[0].n).toBe(before.rows[0].n);
    } finally {
      await owner.end();
    }
  });

  it('accepts the correct secret token', async () => {
    const response = await post(
      { 'x-telegram-bot-api-secret-token': SECRET },
      { ...validUpdate, update_id: 9001, message: { ...validUpdate.message, chat: { id: 9001 } } },
    );
    expect(response.statusCode).toBe(200);
  });
});

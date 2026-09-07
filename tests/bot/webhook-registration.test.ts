/**
 * Registering the webhook with Telegram on startup.
 *
 * Doing this from the service rather than an operator's terminal is what
 * keeps the bot token inside Railway — no laptop, no shell history. These
 * tests run against a stub Telegram, never the real API (TESTING.md).
 */
import { describe, expect, it } from 'vitest';
import { registerTelegramWebhook } from '../../apps/bot/src/channels/index.js';

/** A stand-in Telegram that records what it was asked. */
function stubTelegram(
  responses: Record<string, { ok: boolean; result?: unknown; description?: string }>,
) {
  const calls: Array<{ method: string; body: Record<string, unknown> }> = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const method = String(url).split('/').pop()!;
    calls.push({ method, body: JSON.parse(String(init.body)) });
    const payload = responses[method] ?? { ok: true, result: {} };
    return { json: async () => payload } as Response;
  }) as typeof fetch;

  return { calls, restore: () => void (globalThis.fetch = original) };
}

const base = {
  botToken: 'stub-token',
  webhookSecret: 'a-secret-of-at-least-16-chars',
  publicUrl: 'https://bot-production.up.railway.app',
  path: '/telegram/webhook',
};

describe('registering the webhook', () => {
  it('sends the url, the secret, and only the updates it acts on', async () => {
    const telegram = stubTelegram({
      setWebhook: { ok: true, result: true },
      getMe: { ok: true, result: { username: 'luxury_bot' } },
    });

    try {
      const registered = await registerTelegramWebhook(base);

      expect(registered).toEqual({
        url: 'https://bot-production.up.railway.app/telegram/webhook',
        username: 'luxury_bot',
      });

      const setWebhook = telegram.calls.find((call) => call.method === 'setWebhook')!;
      expect(setWebhook.body['url']).toBe('https://bot-production.up.railway.app/telegram/webhook');
      expect(setWebhook.body['secret_token']).toBe(base.webhookSecret);
      // Asking for less means less untrusted payload at a public endpoint.
      expect(setWebhook.body['allowed_updates']).toEqual(['message']);
    } finally {
      telegram.restore();
    }
  });

  it('tolerates a trailing slash on the public url', async () => {
    const telegram = stubTelegram({
      setWebhook: { ok: true, result: true },
      getMe: { ok: true, result: { username: 'luxury_bot' } },
    });

    try {
      const registered = await registerTelegramWebhook({
        ...base,
        publicUrl: 'https://bot-production.up.railway.app/',
      });
      expect(registered.url).toBe('https://bot-production.up.railway.app/telegram/webhook');
    } finally {
      telegram.restore();
    }
  });

  it('refuses to register a plain http address', async () => {
    const telegram = stubTelegram({});
    try {
      // The secret token travels in a header on every request.
      await expect(
        registerTelegramWebhook({ ...base, publicUrl: 'http://insecure.example.com' }),
      ).rejects.toThrow(/https/);
      expect(telegram.calls).toEqual([]);
    } finally {
      telegram.restore();
    }
  });

  it('surfaces a rejection from Telegram', async () => {
    const telegram = stubTelegram({
      setWebhook: { ok: false, description: 'Bad Request: bad webhook: HTTPS url must be provided' },
    });

    try {
      await expect(registerTelegramWebhook(base)).rejects.toThrow(/bad webhook/);
    } finally {
      telegram.restore();
    }
  });

  it('never puts the token in the error it raises', async () => {
    const telegram = stubTelegram({
      setWebhook: { ok: false, description: 'Unauthorized' },
    });

    try {
      const error = (await registerTelegramWebhook({
        ...base,
        botToken: 'a-very-secret-token',
      }).then(
        () => new Error('expected the registration to be rejected'),
        (e: unknown) => e as Error,
      )) as Error;

      // An error message reaches logs, and a token that reaches a log is a
      // token to rotate (CLAUDE.md, "Operations").
      expect(error.message).not.toContain('a-very-secret-token');
    } finally {
      telegram.restore();
    }
  });
});

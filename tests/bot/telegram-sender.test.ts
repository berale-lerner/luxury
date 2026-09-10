/**
 * The Telegram adapter, against a stub of Telegram.
 *
 * Written because a production question — "why does the guest see no typing
 * indicator?" — could not be answered from the logs. The chat action was sent
 * and its response ignored, so a rejection looked exactly like a success.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, afterEach } from 'vitest';
import { createTelegramSender } from '@luxury/messaging';

interface Received {
  readonly path: string;
  readonly body: unknown;
}

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
});

/** A stand-in for Telegram that answers however the test needs it to. */
async function stubTelegram(reply: (path: string) => { status: number; body: unknown }) {
  const received: Received[] = [];

  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk as Buffer));
    request.on('end', () => {
      const path = request.url ?? '';
      received.push({ path, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      const answer = reply(path);
      response.writeHead(answer.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(answer.body));
    });
  });

  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server!.address() as AddressInfo;

  return { received, baseUrl: `http://127.0.0.1:${port}` };
}

describe('the typing indicator', () => {
  it('asks Telegram for a typing action on the resolved chat', async () => {
    const telegram = await stubTelegram(() => ({ status: 200, body: { ok: true } }));
    const sender = createTelegramSender({
      credentials: { telegramBotToken: 'token' },
      baseUrl: telegram.baseUrl,
    });

    await sender.indicateTyping!({ chatId: 'tg-77' });

    expect(telegram.received).toHaveLength(1);
    expect(telegram.received[0]!.path).toContain('/sendChatAction');
    expect(telegram.received[0]!.body).toEqual({ chat_id: 'tg-77', action: 'typing' });
  });

  it('throws when Telegram rejects it, so the failure reaches a log', async () => {
    const telegram = await stubTelegram(() => ({
      status: 403,
      body: { ok: false, description: 'bot was blocked by the user' },
    }));
    const sender = createTelegramSender({
      credentials: { telegramBotToken: 'token' },
      baseUrl: telegram.baseUrl,
    });

    // Nothing acts on this — the router swallows it — but a rejection that
    // looks identical to a success is a question nobody can answer later.
    await expect(sender.indicateTyping!({ chatId: 'tg-77' })).rejects.toThrow();
  });
});

describe('sending a message', () => {
  it('carries the text and returns the provider id', async () => {
    const telegram = await stubTelegram(() => ({
      status: 200,
      body: { ok: true, result: { message_id: 4242 } },
    }));
    const sender = createTelegramSender({
      credentials: { telegramBotToken: 'token' },
      baseUrl: telegram.baseUrl,
    });

    const result = await sender.send({ chatId: 'tg-77' }, 'Yes, we do.');

    expect(result).toEqual({ channel: 'telegram', providerMessageId: '4242' });
    expect(telegram.received[0]!.body).toEqual({ chat_id: 'tg-77', text: 'Yes, we do.' });
  });

  it('does not put the token in the error when Telegram refuses', async () => {
    const telegram = await stubTelegram(() => ({ status: 400, body: { ok: false } }));
    const sender = createTelegramSender({
      credentials: { telegramBotToken: 'super-secret-token' },
      baseUrl: telegram.baseUrl,
    });

    const error = await sender.send({ chatId: 'tg-77' }, 'Hello').catch((cause: Error) => cause);

    // The URL contains the token, so an error that echoed it would put a
    // credential in the logs (STANDARDS.md).
    expect(String(error)).not.toContain('super-secret-token');
  });
});

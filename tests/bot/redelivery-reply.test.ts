/**
 * Answering after a failed attempt.
 *
 * The bug this covers was found in production: the reply was attempted only
 * when a delivery stored a new row, so a transient model failure left the
 * guest's message stored and permanently unanswered. The provider's retry
 * stored nothing, the code skipped the reply, and the 200 told the provider
 * to stop trying.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import type { ModelClient, ModelResponse } from '../../apps/bot/src/agent/index.js';
import { PromptCache } from '../../apps/bot/src/agent/index.js';
import { buildApp } from '../../apps/bot/src/app.js';
import { createTelegramChannel } from '../../apps/bot/src/channels/index.js';
import { awaitsReply } from '../../apps/bot/src/conversations/index.js';
import { urlForRole } from '../helpers/config.js';

const SECRET = 'a-secret-of-at-least-16-chars';

let bot: pg.Pool;
let admin: pg.Client;
let agentId: string;

beforeAll(async () => {
  bot = new pg.Pool({ connectionString: urlForRole('bot_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();

  const agent = await admin.query<{ id: string }>(
    `INSERT INTO public.agents (key, name) VALUES ('redelivery', 'Redelivery test') RETURNING id`,
  );
  agentId = agent.rows[0]!.id;
  await admin.query(
    `INSERT INTO public.prompt_versions (agent_id, version_number, body, snapshot)
     VALUES ($1, 1, 'You are the assistant.', '[]'::jsonb)`,
    [agentId],
  );
});

afterAll(async () => {
  await admin.query(`DELETE FROM public.conversations WHERE channel_chat_id LIKE '9955%'`);
  await admin.query(`DELETE FROM public.agents WHERE key = 'redelivery'`);
  await admin.end();
  await bot.end();
});

/** Fails the given number of times, then answers — a transient outage. */
function flakyModel(failures: number, reply: string) {
  let attempts = 0;
  const model: ModelClient = {
    provider: 'flaky',
    async complete(): Promise<ModelResponse> {
      attempts += 1;
      if (attempts <= failures) {
        throw Object.assign(new Error('model unavailable'), { status: 503 });
      }
      return { kind: 'text', text: reply };
    },
  };
  return { model, attempts: () => attempts };
}

function appWith(model: ModelClient, sent: string[]) {
  return buildApp({
    pool: bot,
    channels: [createTelegramChannel(SECRET)],
    logLevel: 'silent',
    reply: {
      prompts: new PromptCache(bot, 'redelivery'),
      agent: { model },
      messaging: {
        async sendToConversation(_conversationId, text) {
          sent.push(text);
          return { channel: 'telegram', providerMessageId: 'stub' };
        },
      },
    },
  });
}

function deliver(app: ReturnType<typeof buildApp>, chatId: number, updateId: number) {
  return app.inject({
    method: 'POST',
    url: '/telegram/webhook',
    headers: { 'x-telegram-bot-api-secret-token': SECRET },
    payload: {
      update_id: updateId,
      message: { message_id: 1, chat: { id: chatId }, date: 1, text: 'Do you have space?' },
    },
  });
}

describe('a redelivery after the model failed', () => {
  it('answers on the retry instead of dropping the message', async () => {
    const sent: string[] = [];
    const flaky = flakyModel(1, 'Yes, we do.');
    const app = appWith(flaky.model, sent);
    await app.ready();

    try {
      // First delivery: the model is down, so the provider is asked to retry.
      const first = await deliver(app, 995551, 900001);
      expect(first.statusCode).toBe(500);
      expect(sent).toEqual([]);

      // The retry stores nothing — the row already exists — but the
      // conversation is still waiting on an answer.
      const second = await deliver(app, 995551, 900001);
      expect(second.statusCode).toBe(200);
      expect(sent).toEqual(['Yes, we do.']);
      expect(flaky.attempts()).toBe(2);
    } finally {
      await app.close();
    }
  });

  it('does not answer twice when the first attempt succeeded', async () => {
    const sent: string[] = [];
    const app = appWith(flakyModel(0, 'Yes, we do.').model, sent);
    await app.ready();

    try {
      await deliver(app, 995552, 900002);
      // A redelivery of an update already answered must stay silent.
      await deliver(app, 995552, 900002);
      expect(sent).toEqual(['Yes, we do.']);
    } finally {
      await app.close();
    }
  });
});

describe('knowing whether a reply is owed', () => {
  it('is true after an inbound message and false once answered', async () => {
    const sent: string[] = [];
    const app = appWith(flakyModel(1, 'Answered.').model, sent);
    await app.ready();

    try {
      await deliver(app, 995553, 900003);
      const conversation = await admin.query<{ id: string }>(
        `SELECT id FROM public.conversations WHERE channel_chat_id = '995553'`,
      );
      const id = conversation.rows[0]!.id as never;

      expect(await awaitsReply(bot, id)).toBe(true);
      await deliver(app, 995553, 900003);
      expect(await awaitsReply(bot, id)).toBe(false);
    } finally {
      await app.close();
    }
  });
});

/**
 * What the guest is told when no answer is coming.
 *
 * A model provider returning 503 is not something this service can fix. The
 * platform's redeliveries are the retry, and they are finite: after enough of
 * them the guest gets a sentence rather than more silence, and the delivery is
 * accepted so the platform stops asking.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import type { ModelClient, ModelResponse } from '../../apps/bot/src/agent/index.js';
import { PromptCache } from '../../apps/bot/src/agent/index.js';
import { buildApp } from '../../apps/bot/src/app.js';
import { createTelegramChannel } from '../../apps/bot/src/channels/index.js';
import { MAX_DELIVERY_ATTEMPTS } from '../../apps/bot/src/conversations/index.js';
import { urlForRole } from '../helpers/config.js';

const SECRET = 'a-secret-of-at-least-16-chars';
const CHAT_PREFIX = '9977';

let bot: pg.Pool;
let admin: pg.Client;
let template: string;

beforeAll(async () => {
  bot = new pg.Pool({ connectionString: urlForRole('bot_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();

  const agent = await admin.query<{ id: string }>(
    `INSERT INTO public.agents (key, name) VALUES ('fallback', 'Fallback test') RETURNING id`,
  );
  await admin.query(
    `INSERT INTO public.prompt_versions (agent_id, version_number, body, snapshot)
     VALUES ($1, 1, 'You are the assistant.', '[]'::jsonb)`,
    [agent.rows[0]!.id],
  );

  const seeded = await admin.query<{ body: string }>(
    `SELECT body FROM public.message_templates WHERE key = 'agent_unavailable'`,
  );
  template = seeded.rows[0]!.body;
});

afterAll(async () => {
  await admin.query(`DELETE FROM public.conversations WHERE channel_chat_id LIKE $1`, [
    `${CHAT_PREFIX}%`,
  ]);
  await admin.query(`DELETE FROM public.agents WHERE key = 'fallback'`);
  await admin.end();
  await bot.end();
});

/** A provider that is simply down, for as long as the test needs it to be. */
const brokenModel: ModelClient = {
  provider: 'broken',
  async complete(): Promise<ModelResponse> {
    throw Object.assign(new Error('model unavailable'), { status: 503 });
  },
};

function appWith(model: ModelClient, sent: string[]) {
  return buildApp({
    pool: bot,
    channels: [createTelegramChannel(SECRET)],
    logLevel: 'silent',
    reply: {
      prompts: new PromptCache(bot, 'fallback'),
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

function deliver(app: ReturnType<typeof buildApp>, chatId: string, updateId: number) {
  return app.inject({
    method: 'POST',
    url: '/telegram/webhook',
    headers: { 'x-telegram-bot-api-secret-token': SECRET },
    payload: {
      update_id: updateId,
      message: { message_id: 1, chat: { id: Number(chatId) }, date: 1, text: 'Do you have space?' },
    },
  });
}

async function messagesIn(chatId: string) {
  const result = await admin.query<{ direction: string; sender: string; body: string }>(
    `SELECT m.direction, m.sender, m.body
       FROM public.messages m
       JOIN public.conversations c ON c.id = m.conversation_id
      WHERE c.channel_chat_id = $1
      ORDER BY m.created_at, m.id`,
    [chatId],
  );
  return result.rows;
}

describe('a provider that stays down', () => {
  it('asks for a retry until the last attempt, then tells the guest', async () => {
    const chat = `${CHAT_PREFIX}01`;
    const sent: string[] = [];
    const app = appWith(brokenModel, sent);
    await app.ready();

    try {
      // Every delivery before the last asks the platform to try again. Two
      // failures could be one bad minute at a provider.
      for (let attempt = 1; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
        const response = await deliver(app, chat, 970001);
        expect(response.statusCode).toBe(500);
        expect(sent).toEqual([]);
      }

      // The last one says so and accepts the delivery: another retry would
      // reach the same broken thing.
      const final = await deliver(app, chat, 970001);
      expect(final.statusCode).toBe(200);
      expect(sent).toEqual([template]);
    } finally {
      await app.close();
    }
  });

  it('records the notice as system, not as the agent', async () => {
    const chat = `${CHAT_PREFIX}02`;
    const app = appWith(brokenModel, []);
    await app.ready();

    try {
      for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
        await deliver(app, chat, 970002);
      }

      const rows = await messagesIn(chat);
      expect(rows).toEqual([
        { direction: 'inbound', sender: 'guest', body: 'Do you have space?' },
        { direction: 'outbound', sender: 'system', body: template },
      ]);
      // The model produced nothing. Recording this as 'agent' would credit it
      // with words it never wrote, and would replay them to it as history.
      expect(rows.some((row) => row.sender === 'agent')).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('says it once, and stops', async () => {
    const chat = `${CHAT_PREFIX}03`;
    const sent: string[] = [];
    const app = appWith(brokenModel, sent);
    await app.ready();

    try {
      for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS + 3; attempt += 1) {
        await deliver(app, chat, 970003);
      }
      // After the notice the last message is outbound, so the conversation is
      // no longer waiting on an answer and nothing further is attempted.
      expect(sent).toEqual([template]);
    } finally {
      await app.close();
    }
  });

  it('still answers a new message once the provider recovers', async () => {
    const chat = `${CHAT_PREFIX}04`;
    const sent: string[] = [];
    let down = true;
    const model: ModelClient = {
      provider: 'recovering',
      async complete(): Promise<ModelResponse> {
        if (down) throw Object.assign(new Error('model unavailable'), { status: 503 });
        return { kind: 'text', text: 'Yes, we do.' };
      },
    };
    const app = appWith(model, sent);
    await app.ready();

    try {
      for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
        await deliver(app, chat, 970004);
      }
      expect(sent).toEqual([template]);

      // The notice is not a dead end for the conversation.
      down = false;
      const later = await deliver(app, chat, 970005);
      expect(later.statusCode).toBe(200);
      expect(sent).toEqual([template, 'Yes, we do.']);
    } finally {
      await app.close();
    }
  });
});

describe('counting deliveries', () => {
  it('counts redeliveries of one update rather than storing them', async () => {
    const chat = `${CHAT_PREFIX}05`;
    const app = appWith(brokenModel, []);
    await app.ready();

    try {
      await deliver(app, chat, 970006);
      await deliver(app, chat, 970006);

      const rows = await admin.query<{ delivery_attempts: number }>(
        `SELECT m.delivery_attempts
           FROM public.messages m
           JOIN public.conversations c ON c.id = m.conversation_id
          WHERE c.channel_chat_id = $1 AND m.direction = 'inbound'`,
        [chat],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]!.delivery_attempts).toBe(2);
    } finally {
      await app.close();
    }
  });

  it('does not raise the count for a message that was answered', async () => {
    const chat = `${CHAT_PREFIX}06`;
    const app = appWith({ provider: 'ok', async complete() { return { kind: 'text', text: 'Hi.' }; } }, []);
    await app.ready();

    try {
      await deliver(app, chat, 970007);
      const rows = await admin.query<{ delivery_attempts: number }>(
        `SELECT m.delivery_attempts
           FROM public.messages m
           JOIN public.conversations c ON c.id = m.conversation_id
          WHERE c.channel_chat_id = $1 AND m.direction = 'inbound'`,
        [chat],
      );
      expect(rows.rows[0]!.delivery_attempts).toBe(1);
    } finally {
      await app.close();
    }
  });
});

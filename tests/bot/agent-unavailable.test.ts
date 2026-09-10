/**
 * What happens when the model will not answer.
 *
 * Found in production: Gemini returned 503 and the guest saw nothing at all,
 * across three redeliveries, for an hour. Two things follow from that — the
 * wait has to be visible while it is happening, and it has to end in words
 * rather than in the platform quietly giving up.
 *
 * The retries live inside one request, bounded, so the platform's delivery
 * budget is not spent on a provider that is already known to be failing.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import type { ModelClient, ModelResponse } from '../../apps/bot/src/agent/index.js';
import { PromptCache } from '../../apps/bot/src/agent/index.js';
import { buildApp } from '../../apps/bot/src/app.js';
import { createTelegramChannel } from '../../apps/bot/src/channels/index.js';
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

/** Counts calls, so "two attempts" is asserted rather than assumed. */
function countingModel(behaviour: (call: number) => ModelResponse | Promise<ModelResponse>) {
  let calls = 0;
  const model: ModelClient = {
    provider: 'counting',
    async complete(): Promise<ModelResponse> {
      calls += 1;
      return behaviour(calls);
    },
  };
  return { model, calls: () => calls };
}

const unavailable = () => {
  throw Object.assign(new Error('model unavailable'), { status: 503 });
};

function appWith(model: ModelClient, options: { sent: string[]; typing: string[] }) {
  return buildApp({
    pool: bot,
    channels: [createTelegramChannel(SECRET)],
    logLevel: 'silent',
    reply: {
      prompts: new PromptCache(bot, 'fallback'),
      // No real waiting: the backoff is behaviour under test, not a delay
      // the suite should sit through.
      agent: { model, backoffMs: 0, sleep: async () => {} },
      messaging: {
        async sendToConversation(_conversationId, text) {
          options.sent.push(text);
          return { channel: 'telegram', providerMessageId: 'stub' };
        },
        async indicateTyping(conversationId) {
          options.typing.push(conversationId);
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

describe('a provider that is down', () => {
  it('is asked twice, then the guest is told', async () => {
    const chat = `${CHAT_PREFIX}01`;
    const sent: string[] = [];
    const typing: string[] = [];
    const model = countingModel(unavailable);
    const app = appWith(model.model, { sent, typing });
    await app.ready();

    try {
      const response = await deliver(app, chat, 970001);

      expect(model.calls()).toBe(2);
      expect(sent).toEqual([template]);
      // 200, not 500: the retries are already spent, so a redelivery would
      // only buy another round of the same failure a minute later.
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('records the notice as system, not as the agent', async () => {
    const chat = `${CHAT_PREFIX}02`;
    const app = appWith(countingModel(unavailable).model, { sent: [], typing: [] });
    await app.ready();

    try {
      await deliver(app, chat, 970002);

      expect(await messagesIn(chat)).toEqual([
        { direction: 'inbound', sender: 'guest', body: 'Do you have space?' },
        { direction: 'outbound', sender: 'system', body: template },
      ]);
    } finally {
      await app.close();
    }
  });

  it('says it once, however many times the update is redelivered', async () => {
    const chat = `${CHAT_PREFIX}03`;
    const sent: string[] = [];
    const app = appWith(countingModel(unavailable).model, { sent, typing: [] });
    await app.ready();

    try {
      await deliver(app, chat, 970003);
      // After the notice the last message is outbound, so the conversation is
      // no longer waiting on an answer and nothing further is attempted.
      await deliver(app, chat, 970003);
      await deliver(app, chat, 970003);
      expect(sent).toEqual([template]);
    } finally {
      await app.close();
    }
  });
});

describe('a provider that stumbles once', () => {
  it('answers on the second attempt, and the guest never learns of the first', async () => {
    const chat = `${CHAT_PREFIX}04`;
    const sent: string[] = [];
    const model = countingModel((call) =>
      call === 1 ? unavailable() : { kind: 'text', text: 'Yes, we do.' },
    );
    const app = appWith(model.model, { sent, typing: [] });
    await app.ready();

    try {
      const response = await deliver(app, chat, 970004);
      expect(response.statusCode).toBe(200);
      expect(model.calls()).toBe(2);
      expect(sent).toEqual(['Yes, we do.']);
      // This is the case the retry exists for: no notice, no redelivery.
      expect(sent).not.toContain(template);
    } finally {
      await app.close();
    }
  });
});

describe('a refusal', () => {
  it('is not retried, and is not a failure to answer', async () => {
    const chat = `${CHAT_PREFIX}05`;
    const sent: string[] = [];
    const model = countingModel(() => ({ kind: 'refusal', category: 'SAFETY' }));
    const app = appWith(model.model, { sent, typing: [] });
    await app.ready();

    try {
      const response = await deliver(app, chat, 970005);
      // The model answered, and the answer was no. Asking again would be
      // arguing with it, and apologising would misdescribe what happened.
      expect(model.calls()).toBe(1);
      expect(sent).toEqual([]);
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});

describe('the typing hint', () => {
  it('starts before the model is asked, so the wait is visible', async () => {
    const chat = `${CHAT_PREFIX}06`;
    const typing: string[] = [];
    let typingWhenAsked = 0;
    const model: ModelClient = {
      provider: 'observant',
      async complete(): Promise<ModelResponse> {
        typingWhenAsked = typing.length;
        return { kind: 'text', text: 'Yes, we do.' };
      },
    };
    const app = appWith(model, { sent: [], typing });
    await app.ready();

    try {
      await deliver(app, chat, 970006);
      // The point of it is the moment right after the guest presses send,
      // not five seconds later.
      expect(typingWhenAsked).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('is still shown while the model is failing', async () => {
    const chat = `${CHAT_PREFIX}07`;
    const typing: string[] = [];
    const app = appWith(countingModel(unavailable).model, { sent: [], typing });
    await app.ready();

    try {
      await deliver(app, chat, 970007);
      // The failing wait is the one that reads as being ignored.
      expect(typing.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});

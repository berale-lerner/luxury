/**
 * Answering a message that was stored but never answered.
 *
 * The bug this covers was found in production: the reply was attempted only
 * when a delivery stored a new row, so a message that arrived once and was
 * not answered stayed unanswered forever — a redelivery stored nothing, the
 * code took that as "already handled", and the 200 told the provider to stop.
 *
 * The model's own failures no longer reach this path; they are retried inside
 * the request and end in a notice to the guest (agent-unavailable.test.ts).
 * What is still true, and still worth holding, is the rule underneath: what
 * decides whether to answer is whether the conversation is waiting for one,
 * never whether this particular delivery wrote a row.
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
        async indicateTyping() {},
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

/** The intake path alone: it stores the message and answers nothing. */
function intakeOnly() {
  return buildApp({
    pool: bot,
    channels: [createTelegramChannel(SECRET)],
    logLevel: 'silent',
  });
}

describe('a message stored by a delivery that did not answer it', () => {
  it('is answered on the next delivery, not treated as handled', async () => {
    const sent: string[] = [];

    // A delivery that stores and does not answer — the state the bug left
    // behind, produced here without pretending a model failed.
    const intake = intakeOnly();
    await intake.ready();
    try {
      expect((await deliver(intake, 995551, 900001)).statusCode).toBe(200);
    } finally {
      await intake.close();
    }

    const conversation = await admin.query<{ id: string }>(
      `SELECT id FROM public.conversations WHERE channel_chat_id = '995551'`,
    );
    expect(await awaitsReply(bot, conversation.rows[0]!.id as never)).toBe(true);

    const app = appWith(flakyModel(0, 'Yes, we do.').model, sent);
    await app.ready();
    try {
      // Stores nothing — the row already exists — and answers anyway,
      // because the conversation is still waiting.
      const second = await deliver(app, 995551, 900001);
      expect(second.statusCode).toBe(200);
      expect(sent).toEqual(['Yes, we do.']);
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
    const intake = intakeOnly();
    await intake.ready();
    try {
      await deliver(intake, 995553, 900003);
    } finally {
      await intake.close();
    }

    const conversation = await admin.query<{ id: string }>(
      `SELECT id FROM public.conversations WHERE channel_chat_id = '995553'`,
    );
    const id = conversation.rows[0]!.id as never;
    expect(await awaitsReply(bot, id)).toBe(true);

    const app = appWith(flakyModel(0, 'Answered.').model, []);
    await app.ready();
    try {
      await deliver(app, 995553, 900003);
      expect(await awaitsReply(bot, id)).toBe(false);
    } finally {
      await app.close();
    }
  });
});

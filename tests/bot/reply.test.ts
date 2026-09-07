/**
 * The reply loop, end to end against the real database, with the model and
 * Telegram replaced by fakes.
 *
 * Neither is called for real: TESTING.md rules out live external APIs, and
 * the point of these tests is the code around the model, not the model.
 */
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { MessagingClient } from '@luxury/messaging';
import { recordInboundMessage } from '../../apps/bot/src/conversations/index.js';
import { replyToConversation } from '../../apps/bot/src/reply.js';
import { createDestinationResolver } from '../../apps/bot/src/conversations/index.js';
import { PromptCache } from '../../apps/bot/src/agent/index.js';
import { urlForRole } from '../helpers/config.js';

let bot: pg.Pool;
let admin: pg.Client;
let agentId: string;

/** Records what was sent, so assertions can be about the destination too. */
function fakeMessaging() {
  const sent: Array<{ conversationId: string; text: string }> = [];
  const client: MessagingClient = {
    async sendToConversation(conversationId, text) {
      sent.push({ conversationId, text });
      return { channel: 'telegram', providerMessageId: `fake-${sent.length}` };
    },
  };
  return { client, sent };
}

/** Stands in for the Anthropic client, at the one method the agent calls. */
function fakeModel(reply: string, onCall?: (params: any) => void) {
  return {
    client: {
      messages: {
        async create(params: any) {
          onCall?.(params);
          return {
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: reply }],
          };
        },
      },
    } as any,
  };
}

beforeAll(async () => {
  bot = new pg.Pool({ connectionString: urlForRole('bot_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();

  const agent = await admin.query<{ id: string }>(
    `INSERT INTO public.agents (key, name) VALUES ('reply-test', 'Reply test agent')
     RETURNING id`,
  );
  agentId = agent.rows[0]!.id;
  await admin.query(
    `INSERT INTO public.prompt_versions (agent_id, version_number, body, snapshot)
     VALUES ($1, 1, 'You are the assistant for a holiday apartment business.', '[]'::jsonb)`,
    [agentId],
  );
});

afterAll(async () => {
  await admin.query(`DELETE FROM public.conversations WHERE channel_chat_id LIKE 'tg-reply-%'`);
  await admin.query(`DELETE FROM public.agents WHERE key IN ('reply-test', 'reply-unpublished')`);
  await admin.end();
  await bot.end();
});

let counter = 0;
beforeEach(() => {
  counter += 1;
});

async function openConversation(text: string): Promise<{ id: ConversationId; muted: boolean }> {
  const recorded = await recordInboundMessage(bot, {
    updateId: `reply-${counter}-1`,
    chatId: `tg-reply-${counter}`,
    text,
  });
  return { id: recorded.conversationId, muted: recorded.agentMuted };
}

function deps(overrides: Partial<Parameters<typeof replyToConversation>[0]> = {}) {
  const messaging = fakeMessaging();
  return {
    messaging,
    value: {
      pool: bot,
      prompts: new PromptCache(bot, 'reply-test'),
      agent: fakeModel('Yes, we have availability in April.'),
      messaging: messaging.client,
      ...overrides,
    } as Parameters<typeof replyToConversation>[0],
  };
}

describe('replying to a conversation', () => {
  it('sends the model\'s answer and stores it as an outbound message', async () => {
    const conversation = await openConversation('Do you have anything in April?');
    const { value, messaging } = deps();

    const outcome = await replyToConversation(value, conversation.id, conversation.muted);

    expect(outcome).toEqual({ status: 'sent', promptVersion: 1 });
    expect(messaging.sent).toHaveLength(1);
    expect(messaging.sent[0]).toMatchObject({
      conversationId: conversation.id,
      text: 'Yes, we have availability in April.',
    });

    const stored = await admin.query(
      `SELECT direction, sender, body FROM public.messages
        WHERE conversation_id = $1 ORDER BY created_at`,
      [conversation.id],
    );
    expect(stored.rows).toHaveLength(2);
    expect(stored.rows[1]).toMatchObject({
      direction: 'outbound',
      sender: 'agent',
      body: 'Yes, we have availability in April.',
    });
  });

  it('stays silent when a manager has taken the conversation over', async () => {
    const conversation = await openConversation('Hello?');
    await admin.query('UPDATE public.conversations SET agent_muted = true WHERE id = $1', [
      conversation.id,
    ]);

    const { value, messaging } = deps();
    const outcome = await replyToConversation(value, conversation.id, true);

    // Enforced in code. A prompt instruction would be a request, not a rule.
    expect(outcome).toEqual({ status: 'skipped', reason: 'agent_muted' });
    expect(messaging.sent).toHaveLength(0);
  });

  it('stays silent when nothing has been published for the agent', async () => {
    await admin.query(
      `INSERT INTO public.agents (key, name) VALUES ('reply-unpublished', 'No prompt yet')`,
    );
    const conversation = await openConversation('Are you there?');
    const { value, messaging } = deps({ prompts: new PromptCache(bot, 'reply-unpublished') });

    const outcome = await replyToConversation(value, conversation.id, false);

    // An agent with no prompt would improvise the business's policies.
    expect(outcome).toEqual({ status: 'skipped', reason: 'no_published_prompt' });
    expect(messaging.sent).toHaveLength(0);
  });

  it('sends the published prompt as the system prompt, marked cacheable', async () => {
    const conversation = await openConversation('What time is check-in?');
    let seen: any;
    const { value } = deps({ agent: fakeModel('Check-in is at 15:00.', (p) => (seen = p)) });

    await replyToConversation(value, conversation.id, false);

    expect(seen.system[0].text).toBe('You are the assistant for a holiday apartment business.');
    // The published prompt is identical on every message, so it is the stable
    // prefix worth caching.
    expect(seen.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(seen.model).toBe('claude-opus-5');
  });

  it('replays the conversation so far, oldest first', async () => {
    const conversation = await openConversation('First question');
    const { value: first } = deps();
    await replyToConversation(first, conversation.id, false);

    await recordInboundMessage(bot, {
      updateId: `reply-${counter}-2`,
      chatId: `tg-reply-${counter}`,
      text: 'Second question',
    });

    let seen: any;
    const { value } = deps({ agent: fakeModel('Answer two.', (p) => (seen = p)) });
    await replyToConversation(value, conversation.id, false);

    expect(seen.messages.map((m: any) => [m.role, m.content])).toEqual([
      ['user', 'First question'],
      ['assistant', 'Yes, we have availability in April.'],
      ['user', 'Second question'],
    ]);
  });

  it('sends nothing when the model declines', async () => {
    const conversation = await openConversation('Something disallowed');
    const messaging = fakeMessaging();
    const refusing = {
      client: {
        messages: {
          async create() {
            return { stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [] };
          },
        },
      } as any,
    };

    const outcome = await replyToConversation(
      {
        pool: bot,
        prompts: new PromptCache(bot, 'reply-test'),
        agent: refusing,
        messaging: messaging.client,
      },
      conversation.id,
      false,
    );

    expect(outcome).toEqual({ status: 'skipped', reason: 'refused' });
    expect(messaging.sent).toHaveLength(0);
  });
});

describe('resolving where a reply goes', () => {
  it('reads the destination from the conversation row', async () => {
    const conversation = await openConversation('Hello');
    const resolver = createDestinationResolver(bot);

    const destination = await resolver.resolve(conversation.id);

    // The address exists in the database and nowhere else in the call path:
    // no caller and no model output can supply one.
    expect(destination).toEqual({ channel: 'telegram', chatId: `tg-reply-${counter}` });
  });

  it('refuses to deliver to a conversation that does not exist', async () => {
    const resolver = createDestinationResolver(bot);
    await expect(
      resolver.resolve('00000000-0000-4000-8000-000000000000' as ConversationId),
    ).rejects.toThrow();
  });
});

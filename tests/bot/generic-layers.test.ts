/**
 * That the two ports are actually generic, exercised rather than asserted
 * from the type signatures.
 *
 * The claim being tested is narrow and worth stating: a second provider is a
 * sibling adapter, and a second platform is a registry entry. Neither
 * requires touching the reply loop, the storage path, or the route.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import type { ChannelName, ConversationId } from '@luxury/shared';
import {
  createMessagingRouter,
  UnsupportedChannelError,
  type ChannelSender,
  type DestinationResolver,
} from '@luxury/messaging';
import type { ModelClient, ModelRequest, ModelResponse } from '../../apps/bot/src/agent/index.js';
import { generateReply, AgentRefusedError } from '../../apps/bot/src/agent/index.js';
import type { InboundChannel, InboundRequest } from '../../apps/bot/src/channels/index.js';
import { buildApp } from '../../apps/bot/src/app.js';
import { recordInboundMessage } from '../../apps/bot/src/conversations/index.js';
import { urlForRole } from '../helpers/config.js';

let bot: pg.Pool;
let admin: pg.Client;

beforeAll(async () => {
  bot = new pg.Pool({ connectionString: urlForRole('bot_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();
});

afterAll(async () => {
  await admin.query(`DELETE FROM public.conversations WHERE channel_chat_id LIKE 'generic-%'`);
  await admin.end();
  await bot.end();
});

/** A provider that is not Anthropic, implemented against the port alone. */
function otherProvider(reply: string): ModelClient {
  return {
    provider: 'some-other-vendor',
    async complete(_request: ModelRequest): Promise<ModelResponse> {
      return { kind: 'text', text: reply };
    },
  };
}

describe('the model port', () => {
  it('works with a provider that has nothing to do with Anthropic', async () => {
    const reply = await generateReply(
      { model: otherProvider('Answered by a different vendor.') },
      'A system prompt.',
      7,
      [{ role: 'user', text: 'Hello' }],
    );

    expect(reply).toEqual({ text: 'Answered by a different vendor.', promptVersion: 7 });
  });

  it('reports which provider refused', async () => {
    const refusing: ModelClient = {
      provider: 'some-other-vendor',
      async complete() {
        return { kind: 'refusal', category: 'policy' };
      },
    };

    const error = await generateReply(
      { model: refusing },
      'A system prompt.',
      1,
      [{ role: 'user', text: 'Hello' }],
    ).catch((e: unknown) => e);

    // Refusal is a shape every provider has; the category is theirs.
    expect(error).toBeInstanceOf(AgentRefusedError);
    expect((error as AgentRefusedError).provider).toBe('some-other-vendor');
    expect((error as AgentRefusedError).category).toBe('policy');
  });
});

describe('the channel port', () => {
  /** A platform that authenticates by signature rather than a header token. */
  function signatureChannel(secret: string): InboundChannel {
    return {
      name: 'whatsapp',
      webhookPath: '/whatsapp/webhook',
      receive(request: InboundRequest) {
        const body = request.body as { signature?: string; from?: string; text?: string; id?: string };
        if (body.signature !== secret) return { kind: 'unauthenticated' };
        if (!body.text) return { kind: 'ignored', reason: 'no_text' };
        return {
          kind: 'message',
          message: { updateId: body.id ?? '1', chatId: body.from ?? 'unknown', text: body.text },
        };
      },
    };
  }

  it('registers a second platform without changing the route or the handler', async () => {
    const app = buildApp({
      pool: bot,
      channels: [signatureChannel('a-signature')],
      logLevel: 'silent',
    });
    await app.ready();

    try {
      const rejected = await app.inject({
        method: 'POST',
        url: '/whatsapp/webhook',
        payload: { signature: 'wrong', from: 'generic-wa-1', text: 'hi', id: 'g1' },
      });
      expect(rejected.statusCode).toBe(401);

      const accepted = await app.inject({
        method: 'POST',
        url: '/whatsapp/webhook',
        payload: { signature: 'a-signature', from: 'generic-wa-1', text: 'hi', id: 'g1' },
      });
      expect(accepted.statusCode).toBe(200);

      // Stored on the channel it arrived on, through the same path Telegram uses.
      const rows = await admin.query(
        `SELECT channel FROM public.conversations WHERE channel_chat_id = 'generic-wa-1'`,
      );
      expect(rows.rows[0]?.channel).toBe('whatsapp');
    } finally {
      await app.close();
    }
  });

  it('keeps the same chat id on two platforms as two conversations', async () => {
    const shared = 'generic-same-id';
    const viaTelegram = await recordInboundMessage(
      bot,
      { updateId: 'g-10', chatId: shared, text: 'from telegram' },
      'telegram',
    );
    const viaWhatsapp = await recordInboundMessage(
      bot,
      { updateId: 'g-11', chatId: shared, text: 'from whatsapp' },
      'whatsapp',
    );

    // The uniqueness that matters is (channel, chat id), not the id alone.
    expect(viaTelegram.conversationId).not.toBe(viaWhatsapp.conversationId);
  });
});

describe('the send router', () => {
  function recordingSender(channel: ChannelName) {
    const sent: Array<{ chatId: string; text: string }> = [];
    const sender: ChannelSender = {
      channel,
      async send(destination, text) {
        sent.push({ chatId: destination.chatId, text });
        return { channel, providerMessageId: `${channel}-1` };
      },
    };
    return { sender, sent };
  }

  function resolverFor(channel: ChannelName, chatId: string): DestinationResolver {
    return { async resolve() { return { channel, chatId }; } };
  }

  it('dispatches to the platform the conversation lives on', async () => {
    const telegram = recordingSender('telegram');
    const whatsapp = recordingSender('whatsapp');

    const router = createMessagingRouter({
      resolver: resolverFor('whatsapp', 'wa-42'),
      senders: [telegram.sender, whatsapp.sender],
    });

    await router.sendToConversation('c1' as ConversationId, 'Confirmed.');

    // The caller named neither a channel nor an address.
    expect(whatsapp.sent).toEqual([{ chatId: 'wa-42', text: 'Confirmed.' }]);
    expect(telegram.sent).toEqual([]);
  });

  it('fails loudly for a platform it was not configured to send on', async () => {
    const router = createMessagingRouter({
      resolver: resolverFor('instagram', 'ig-1'),
      senders: [recordingSender('telegram').sender],
    });

    // Silence here would leave a guest waiting forever with nothing logged.
    await expect(router.sendToConversation('c1' as ConversationId, 'Hello')).rejects.toBeInstanceOf(
      UnsupportedChannelError,
    );
  });

  it('exposes no way to send to an address', () => {
    const router = createMessagingRouter({
      resolver: resolverFor('telegram', 'tg-1'),
      senders: [recordingSender('telegram').sender],
    });

    // The guarantee is structural: one method, and it takes a conversation.
    expect(Object.keys(router)).toEqual(['sendToConversation']);
    expect(router.sendToConversation).toHaveLength(2);
  });
});

import type { ConversationId } from '@luxury/shared';
import type {
  Channel,
  DestinationResolver,
  MessagingClient,
  MessagingCredentials,
  SendResult,
} from './types.js';

const TELEGRAM_API = 'https://api.telegram.org';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface TelegramClientOptions {
  /** Passed in by the service that owns them. This package reads no env. */
  readonly credentials: MessagingCredentials;
  readonly resolver: DestinationResolver;
  readonly timeoutMs?: number;
  readonly baseUrl?: string;
  readonly log?: (event: Record<string, unknown>) => void;
}

/**
 * The only way this system sends a message.
 *
 * `sendToConversation` takes a conversation id and looks the destination up.
 * There is deliberately no overload that accepts an address: a function that
 * took one, reachable from the internet-facing service, is what turns a
 * prompt injection into a message sent somewhere it should not go.
 *
 * Timeout and logging live here so every caller gets them without
 * remembering to (CLAUDE.md, "Outbound messages").
 */
export function createTelegramClient(options: TelegramClientOptions): MessagingClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl ?? TELEGRAM_API;
  const log = options.log ?? (() => {});

  return {
    async sendToConversation(conversationId: ConversationId, text: string): Promise<SendResult> {
      const destination = await options.resolver.resolve(conversationId);

      if (destination.channel !== 'telegram') {
        throw new Error(`This client sends on telegram, not ${destination.channel}.`);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      try {
        const response = await fetch(
          `${baseUrl}/bot${options.credentials.telegramBotToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chat_id: destination.chatId, text }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          // The body can echo the request; the message text is not logged
          // (STANDARDS.md), so only the status is recorded.
          throw new TelegramSendError(response.status);
        }

        const payload = (await response.json()) as {
          ok: boolean;
          result?: { message_id: number };
        };

        if (!payload.ok || payload.result === undefined) {
          throw new TelegramSendError(response.status);
        }

        log({
          event: 'messaging.sent',
          channel: 'telegram' satisfies Channel,
          conversationId,
          durationMs: Date.now() - startedAt,
        });

        return { channel: 'telegram', providerMessageId: String(payload.result.message_id) };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export class TelegramSendError extends Error {
  constructor(readonly status: number) {
    super(`Telegram rejected the send with status ${status}`);
    this.name = 'TelegramSendError';
  }
}

import type { ChannelSender, MessagingCredentials, SendResult } from './types.js';

const TELEGRAM_API = 'https://api.telegram.org';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface TelegramSenderOptions {
  /** Passed in by the service that owns them. This package reads no env. */
  readonly credentials: MessagingCredentials;
  readonly timeoutMs?: number;
  readonly baseUrl?: string;
}

/**
 * Telegram's implementation of the outbound port.
 *
 * It is handed an already-resolved destination, so it has no way to look one
 * up and no way to be given one by a caller. The router owns that lookup;
 * this file owns Telegram's HTTP shape and nothing else.
 *
 * The timeout lives here because a hung request to a platform would otherwise
 * hold a guest's reply open indefinitely.
 */
export function createTelegramSender(options: TelegramSenderOptions): ChannelSender {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl ?? TELEGRAM_API;

  return {
    channel: 'telegram',

    async send(destination, text): Promise<SendResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

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
          // The body can echo the request, and message text is not logged
          // (STANDARDS.md), so only the status is carried.
          throw new TelegramSendError(response.status);
        }

        const payload = (await response.json()) as {
          ok: boolean;
          result?: { message_id: number };
        };

        if (!payload.ok || payload.result === undefined) {
          throw new TelegramSendError(response.status);
        }

        return { channel: 'telegram', providerMessageId: String(payload.result.message_id) };
      } finally {
        clearTimeout(timer);
      }
    },

    /**
     * Telegram's "typing…".
     *
     * It expires after about five seconds, or the moment a message is sent —
     * there is no way to stop it early and no need for one, because the reply
     * itself clears it. A caller that expects to wait longer than that sends
     * this again.
     */
    async indicateTyping(destination): Promise<void> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        await fetch(`${baseUrl}/bot${options.credentials.telegramBotToken}/sendChatAction`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: destination.chatId, action: 'typing' }),
          signal: controller.signal,
        });
        // The response is not checked. There is nothing to do about a
        // rejected chat action, and the router swallows the throw anyway.
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

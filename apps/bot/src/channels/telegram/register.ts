import type { ChannelName } from '@luxury/shared';

const TELEGRAM_API = 'https://api.telegram.org';

export interface RegisterWebhookOptions {
  readonly botToken: string;
  readonly webhookSecret: string;
  /** Public origin of this service, e.g. https://bot-production.up.railway.app */
  readonly publicUrl: string;
  readonly path: string;
  readonly baseUrl?: string;
}

/**
 * Tells Telegram where to deliver, on startup.
 *
 * Telegram pushes rather than being polled, so something has to register the
 * URL and the secret token it echoes back. Doing it here rather than from an
 * operator's terminal means the bot token never has to leave the service that
 * owns it — no laptop, no shell history, no chat.
 *
 * setWebhook is idempotent, so running it on every boot is safe: registering
 * the same URL and secret again changes nothing.
 */
export async function registerTelegramWebhook(
  options: RegisterWebhookOptions,
): Promise<{ url: string; username: string }> {
  const url = `${options.publicUrl.replace(/\/$/, '')}${options.path}`;

  if (!url.startsWith('https://')) {
    // Telegram refuses plain http, and so should we: the secret token travels
    // in a header on every request.
    throw new Error(`Telegram only delivers to https; refusing to register ${url}`);
  }

  await call(options, 'setWebhook', {
    url,
    secret_token: options.webhookSecret,
    // Only messages are acted on. Asking for less means less untrusted
    // payload arriving at a public endpoint.
    allowed_updates: ['message'],
  });

  const me = (await call(options, 'getMe', {})) as { username: string };
  return { url, username: me.username };
}

async function call(
  options: RegisterWebhookOptions,
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${options.baseUrl ?? TELEGRAM_API}/bot${options.botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!payload.ok) {
    // The description is Telegram's, and never contains the token.
    throw new Error(`Telegram rejected ${method}: ${payload.description ?? response.status}`);
  }
  return payload.result;
}

export const TELEGRAM_CHANNEL: ChannelName = 'telegram';

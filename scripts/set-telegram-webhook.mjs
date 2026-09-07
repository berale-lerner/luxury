/**
 * Points a Telegram bot at this service's webhook.
 *
 * Telegram pushes updates rather than being polled, so it has to be told the
 * URL, and told the secret token it should echo back on every request. That
 * token is the whole of the webhook's authentication (CLAUDE.md, "External
 * integrations") — the same value the service checks in TELEGRAM_WEBHOOK_SECRET.
 *
 * Usage:
 *   node scripts/set-telegram-webhook.mjs <https://host> [--delete] [--info]
 *
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from the environment.
 * Neither is printed: a token that reaches a terminal, a log or a chat is a
 * token to rotate.
 */
const API = 'https://api.telegram.org';

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set.');
  process.exit(1);
}

async function call(method, body) {
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`Telegram rejected ${method}: ${payload.description ?? response.status}`);
  }
  return payload.result;
}

const args = process.argv.slice(2);

if (args.includes('--info')) {
  const info = await call('getWebhookInfo');
  console.log(
    JSON.stringify(
      {
        url: info.url,
        pending_update_count: info.pending_update_count,
        last_error_message: info.last_error_message,
        last_error_date: info.last_error_date
          ? new Date(info.last_error_date * 1000).toISOString()
          : undefined,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (args.includes('--delete')) {
  await call('deleteWebhook', { drop_pending_updates: true });
  console.log('webhook removed');
  process.exit(0);
}

const host = args.find((arg) => arg.startsWith('http'));
if (!host) {
  console.error('Usage: node scripts/set-telegram-webhook.mjs <https://host> [--delete] [--info]');
  process.exit(1);
}
if (!host.startsWith('https://')) {
  // Telegram refuses plain http, and so should we: the secret token travels
  // in a header on every request.
  console.error('Telegram only delivers to https.');
  process.exit(1);
}
if (!secret || secret.length < 16) {
  console.error('TELEGRAM_WEBHOOK_SECRET must be set and at least 16 characters.');
  process.exit(1);
}

const url = `${host.replace(/\/$/, '')}/telegram/webhook`;
await call('setWebhook', {
  url,
  secret_token: secret,
  // We only act on messages; asking for less means less untrusted payload
  // arriving at a public endpoint.
  allowed_updates: ['message'],
  drop_pending_updates: true,
});

const me = await call('getMe');
console.log(`webhook set to ${url} for @${me.username}`);

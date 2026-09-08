/**
 * A development entry point that skips Google sign-in.
 *
 * Deliberately a separate file rather than a flag on the real one. A flag can
 * be switched on in the wrong environment; this cannot, because
 * `pnpm start` — what Railway runs — is `dist/index.js`, and nothing in that
 * file's import graph reaches here. A structure test asserts that.
 *
 * What it replaces is *identity* only. The guard, the allowlist check and
 * every route are the production ones, so the address below still has to be
 * in admin_allowlist. Development therefore exercises the same path the
 * deployed service does, minus the round trip to Google.
 *
 * Usage:
 *   pnpm dev:admin
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createMessagingRouter, createTelegramSender } from '@luxury/messaging';
import { buildApp } from './app.js';
import { createPool } from './db.js';
import { createDestinationResolver } from './conversations/destination.js';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  /** The address this session claims to be. Must be on the allowlist. */
  DEV_ADMIN_EMAIL: z.string().email(),
  /** Optional: without it, sending from the UI fails loudly rather than silently. */
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment for the development server:',
    parsed.error.issues.map((i) => i.path.join('.')).join(', '),
  );
  process.exit(1);
}
const config = parsed.data;

const pool = createPool(config.DATABASE_URL);

const app = buildApp({
  pool,
  logLevel: 'info',
  // The only substitution. Everything downstream is the real thing.
  session: {
    async read() {
      return { email: config.DEV_ADMIN_EMAIL, name: 'Development' };
    },
  },
  messaging: createMessagingRouter({
    resolver: createDestinationResolver(pool),
    senders: config.TELEGRAM_BOT_TOKEN
      ? [createTelegramSender({ credentials: { telegramBotToken: config.TELEGRAM_BOT_TOKEN } })]
      : [],
  }),
  // dist/web, beside this file — not apps/admin/web, which is the
  // source Vite builds *from* and whose index.html points at a .tsx
  // entry no browser can load.
  webRoot: join(dirname(fileURLToPath(import.meta.url)), 'web'),
});

app.log.warn(
  { event: 'admin.dev_server' },
  `sign-in is stubbed as ${config.DEV_ADMIN_EMAIL} — development only`,
);

// Bound to the loopback interface, not 0.0.0.0. Even started on a machine
// that is reachable from elsewhere, this server is not.
await app.listen({ port: config.PORT, host: '127.0.0.1' });

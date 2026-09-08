import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMessagingRouter, createTelegramSender } from '@luxury/messaging';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { buildApp } from './app.js';
import { createAuth, createSessionReader, registerAuthRoutes } from './auth/better-auth.js';
import { createDestinationResolver } from './conversations/destination.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const auth = createAuth(config, pool);

const app = buildApp({
  pool,
  session: createSessionReader(auth),
  logLevel: config.LOG_LEVEL,
  // The manager's messages go out through the same layer the bot uses, so
  // rate limiting, timeouts and the conversation-id-only signature apply to
  // them too (CLAUDE.md, "Outbound messages").
  messaging: createMessagingRouter({
    resolver: createDestinationResolver(pool),
    senders: [
      createTelegramSender({ credentials: { telegramBotToken: config.TELEGRAM_BOT_TOKEN } }),
    ],
  }),
  // dist/web, beside this file — not apps/admin/web, which is the
  // source Vite builds *from* and whose index.html points at a .tsx
  // entry no browser can load.
  webRoot: join(dirname(fileURLToPath(import.meta.url)), 'web'),
});

registerAuthRoutes(app, auth);

const close = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => void close('SIGTERM'));
process.on('SIGINT', () => void close('SIGINT'));

await app.listen({ port: config.PORT, host: '0.0.0.0' });

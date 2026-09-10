import { createMessagingRouter, createTelegramSender } from '@luxury/messaging';
import { loadConfig, modelSelection, providerKeys } from './config.js';
import { createPool } from './db.js';
import { buildApp } from './app.js';
import { PromptCache, createModel } from './agent/index.js';
import {
  createTelegramChannel,
  registerTelegramWebhook,
  TELEGRAM_WEBHOOK_PATH,
} from './channels/index.js';
import { createDestinationResolver } from './conversations/index.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);

// Where the two generic layers are given their concrete implementations, and
// the only place in the service that names a provider or a platform.
const app = buildApp({
  pool,
  logLevel: config.LOG_LEVEL,
  channels: [createTelegramChannel(config.TELEGRAM_WEBHOOK_SECRET)],
  reply: {
    prompts: new PromptCache(pool, config.AGENT_KEY),
    timeZone: config.TIMEZONE,
    agent: { model: createModel(modelSelection(config), providerKeys(config)) },
    // Credentials are handed to the messaging package here. It never reads
    // them itself (CLAUDE.md, "Architecture").
    messaging: createMessagingRouter({
      resolver: createDestinationResolver(pool),
      senders: [
        createTelegramSender({
          credentials: { telegramBotToken: config.TELEGRAM_BOT_TOKEN },
        }),
      ],
    }),
  },
});

const close = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => void close('SIGTERM'));
process.on('SIGINT', () => void close('SIGINT'));

await app.listen({ port: config.PORT, host: '0.0.0.0' });

// Registered after the server is listening, so Telegram never delivers to a
// port that is not answering yet. Only where there is a public address to
// register: locally the webhook is pointed at a tunnel by hand.
if (config.RAILWAY_PUBLIC_DOMAIN) {
  try {
    const registered = await registerTelegramWebhook({
      botToken: config.TELEGRAM_BOT_TOKEN,
      webhookSecret: config.TELEGRAM_WEBHOOK_SECRET,
      publicUrl: `https://${config.RAILWAY_PUBLIC_DOMAIN}`,
      path: TELEGRAM_WEBHOOK_PATH,
    });
    app.log.info(
      { event: 'telegram.webhook.registered', url: registered.url, bot: registered.username },
      'telegram will deliver here',
    );
  } catch (error) {
    // Not fatal. The service is up and can still be reached; what is broken
    // is delivery, and a running service with a loud log is easier to
    // diagnose than a crash loop.
    app.log.error({ event: 'telegram.webhook.registration_failed', err: error }, 'could not register the webhook');
  }
}

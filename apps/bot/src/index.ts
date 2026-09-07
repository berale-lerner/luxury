import Anthropic from '@anthropic-ai/sdk';
import { createMessagingRouter, createTelegramSender } from '@luxury/messaging';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { buildApp } from './app.js';
import { PromptCache, createAnthropicModel } from './agent/index.js';
import { createTelegramChannel } from './channels/index.js';
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
    agent: {
      model: createAnthropicModel({
        client: new Anthropic({ apiKey: config.ANTHROPIC_API_KEY }),
      }),
    },
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

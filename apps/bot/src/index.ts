import Anthropic from '@anthropic-ai/sdk';
import { createTelegramClient } from '@luxury/messaging';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { buildApp } from './app.js';
import { PromptCache } from './agent/index.js';
import { createDestinationResolver } from './conversations/index.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);

const app = buildApp({
  pool,
  webhookSecret: config.TELEGRAM_WEBHOOK_SECRET,
  logLevel: config.LOG_LEVEL,
  reply: {
    prompts: new PromptCache(pool, config.AGENT_KEY),
    agent: { client: new Anthropic({ apiKey: config.ANTHROPIC_API_KEY }) },
    // Credentials are handed to the messaging package here. It never reads
    // them itself (CLAUDE.md, "Architecture").
    messaging: createTelegramClient({
      credentials: { telegramBotToken: config.TELEGRAM_BOT_TOKEN },
      resolver: createDestinationResolver(pool),
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

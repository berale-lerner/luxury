import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { buildApp } from './app.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const app = buildApp({
  pool,
  webhookSecret: config.TELEGRAM_WEBHOOK_SECRET,
  logLevel: config.LOG_LEVEL,
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

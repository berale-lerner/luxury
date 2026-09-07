import Fastify, { type FastifyInstance } from 'fastify';
import type pg from 'pg';
import { registerTelegramWebhook } from './telegram/webhook.js';

export interface BuildAppOptions {
  readonly pool: pg.Pool;
  readonly webhookSecret: string;
  readonly logLevel?: string;
}

/**
 * Builds the server without starting it, so tests drive the real routes
 * through fastify.inject rather than a stand-in.
 */
export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: { level: options.logLevel ?? 'info' },
    // Telegram sends small JSON payloads; a cap keeps an oversized body from
    // being parsed at all on a public endpoint.
    bodyLimit: 1_048_576,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  registerTelegramWebhook(app, {
    pool: options.pool,
    webhookSecret: options.webhookSecret,
  });

  return app;
}

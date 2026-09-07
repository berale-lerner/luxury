import { z } from 'zod';

/**
 * Environment for apps/bot, validated once at boot.
 *
 * A missing webhook secret must stop the process, not disable the check: a
 * service that starts without it would accept any POST to the webhook and
 * still look healthy. Failing here makes that impossible to deploy by
 * accident.
 *
 * These are read at the service level only. Nothing in packages/ reads env
 * (CLAUDE.md, "Architecture").
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  /** Which agent's published prompt this service serves. */
  AGENT_KEY: z.string().min(1).default('guest'),
  /**
   * Set by Railway. Present in a deployed environment and absent locally,
   * which is exactly the condition for registering the webhook: a laptop
   * has no public address to register.
   */
  RAILWAY_PUBLIC_DOMAIN: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type BotConfig = Readonly<z.infer<typeof schema>>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment for apps/bot: ${missing}`);
  }
  return Object.freeze(parsed.data);
}

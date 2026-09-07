import { z } from 'zod';
import { PROVIDERS, type ProviderKeys, type ModelSelection } from './agent/registry.js';

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

  /**
   * Which provider answers guests. Keys are optional individually — a
   * service configures the providers it uses — but the selected one must
   * have its key, which is checked after parsing.
   */
  MODEL_PROVIDER: z.enum(PROVIDERS).default('anthropic'),
  /** Optional. Each adapter has a sensible default for its provider. */
  MODEL_NAME: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
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

  const config = parsed.data;

  // Checked at boot rather than on the first guest message. A service that
  // starts without the key for the provider it was told to use would look
  // healthy and fail silently the moment someone wrote to it.
  const keys = providerKeys(config);
  if (!keys[config.MODEL_PROVIDER]) {
    throw new Error(
      `MODEL_PROVIDER is "${config.MODEL_PROVIDER}" but no key for it is set on this service.`,
    );
  }

  return Object.freeze(config);
}

/** The provider keys held by this service, in the shape the registry takes. */
export function providerKeys(config: BotConfig): ProviderKeys {
  return { anthropic: config.ANTHROPIC_API_KEY, gemini: config.GEMINI_API_KEY };
}

/** The choice this service was configured to make, ready for the registry. */
export function modelSelection(config: BotConfig): ModelSelection {
  return {
    provider: config.MODEL_PROVIDER,
    ...(config.MODEL_NAME ? { model: config.MODEL_NAME } : {}),
  };
}

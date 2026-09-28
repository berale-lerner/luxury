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
/** `KEY=` with nothing after it, as .env.example has, means unset. */
function optionalSetting<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), inner.optional());
}

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
   * Where the apartments are, as an IANA name. The agent is told the local
   * time so it can talk about "this evening" the way the guest and the owner
   * both mean it — a server in Amsterdam otherwise reasons in its own hours.
   */
  TIMEZONE: z.string().min(1).default('Asia/Jerusalem'),
  /**
   * Set by Railway. Present in a deployed environment and absent locally,
   * which is exactly the condition for registering the webhook: a laptop
   * has no public address to register.
   */
  RAILWAY_PUBLIC_DOMAIN: z.string().min(1).optional(),
  // MiniHotel, for the availability tool. Optional as a group: without it
  // the agent is simply not offered the tool. The three credentials are
  // all-or-nothing, checked below.
  MINIHOTEL_USERNAME: optionalSetting(z.string().min(1)),
  MINIHOTEL_PASSWORD: optionalSetting(z.string().min(1)),
  MINIHOTEL_HOTEL_ID: optionalSetting(z.string().min(1)),
  MINIHOTEL_RATE_CODE: optionalSetting(z.string().min(1)).transform((v) => v ?? 'USD'),
  /** Staging points this at the sandbox, or leaves it unset (work/0013). */
  MINIHOTEL_ARI_URL: optionalSetting(z.string().url()),
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

  const miniHotel = [config.MINIHOTEL_USERNAME, config.MINIHOTEL_PASSWORD, config.MINIHOTEL_HOTEL_ID];
  if (miniHotel.some(Boolean) && !miniHotel.every(Boolean)) {
    // A half-set group would start a bot whose tool fails on every guest's
    // question. Names only, never values.
    const missing = ['MINIHOTEL_USERNAME', 'MINIHOTEL_PASSWORD', 'MINIHOTEL_HOTEL_ID'].filter((_, i) => !miniHotel[i]);
    throw new Error(`Invalid environment for apps/bot: ${missing.join(', ')} (required with the other MINIHOTEL_ settings)`);
  }

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

export interface MiniHotelSettings {
  readonly credentials: { readonly username: string; readonly password: string; readonly hotelId: string };
  readonly rateCode: string;
  readonly ariUrl?: string;
}

/** The MiniHotel group, or null when this service has none. */
export function miniHotelSettings(config: BotConfig): MiniHotelSettings | null {
  if (!config.MINIHOTEL_USERNAME || !config.MINIHOTEL_PASSWORD || !config.MINIHOTEL_HOTEL_ID) return null;
  return {
    credentials: {
      username: config.MINIHOTEL_USERNAME,
      password: config.MINIHOTEL_PASSWORD,
      hotelId: config.MINIHOTEL_HOTEL_ID,
    },
    rateCode: config.MINIHOTEL_RATE_CODE,
    ...(config.MINIHOTEL_ARI_URL ? { ariUrl: config.MINIHOTEL_ARI_URL } : {}),
  };
}

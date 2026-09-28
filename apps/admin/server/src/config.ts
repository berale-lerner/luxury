import { z } from 'zod';

/**
 * Environment for apps/admin, validated once at boot.
 *
 * This service reaches every schema, business included, so a missing auth
 * setting must stop the process rather than start one that serves guest
 * conversations to whoever finds the URL.
 */
/** `KEY=` with nothing after it, as .env.example has, means unset. */
function optionalSetting<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), inner.optional());
}

const schema = z.object({
  DATABASE_URL: z.string().min(1),

  // Google sign-in. Absent means nobody can sign in, which is why the
  // service refuses to start rather than serving an open dashboard.
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  /** Signs session cookies. */
  AUTH_SECRET: z.string().min(32),
  /** Public origin, used for the OAuth callback and cookie scope. */
  PUBLIC_URL: z.string().url(),

  /** Sends the manager's own messages. Owned by this service. */
  TELEGRAM_BOT_TOKEN: z.string().min(1),

  /** Which day "today" is on the availability screen. */
  TIMEZONE: z.string().min(1).default('Asia/Jerusalem'),

  // MiniHotel. Optional as a group: without it the service still starts and
  // the availability screen says it is not configured. The three credentials
  // are all-or-nothing (checked below) so a half-set group is a boot failure
  // rather than a confusing vendor error later.
  MINIHOTEL_USERNAME: optionalSetting(z.string().min(1)),
  MINIHOTEL_PASSWORD: optionalSetting(z.string().min(1)),
  MINIHOTEL_HOTEL_ID: optionalSetting(z.string().min(1)),
  MINIHOTEL_RATE_CODE: optionalSetting(z.string().min(1)).transform((v) => v ?? 'USD'),
  /** Staging points this at the sandbox (MINIHOTEL.md, "החלטות"). */
  MINIHOTEL_ARI_URL: optionalSetting(z.string().url()),

  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const MINIHOTEL_CREDENTIALS = ['MINIHOTEL_USERNAME', 'MINIHOTEL_PASSWORD', 'MINIHOTEL_HOTEL_ID'] as const;

const checked = schema.superRefine((env, context) => {
  const present = MINIHOTEL_CREDENTIALS.filter((key) => env[key] !== undefined);
  if (present.length === 0 || present.length === MINIHOTEL_CREDENTIALS.length) return;
  for (const key of MINIHOTEL_CREDENTIALS) {
    if (env[key] === undefined) context.addIssue({ code: 'custom', path: [key], message: 'required with the other MINIHOTEL_ credentials' });
  }
});

export type AdminConfig = Readonly<z.infer<typeof schema>>;

export interface MiniHotelSettings {
  readonly credentials: { readonly username: string; readonly password: string; readonly hotelId: string };
  readonly rateCode: string;
  readonly ariUrl?: string;
}

/** The MiniHotel group, or null when this environment has none. */
export function miniHotelSettings(config: AdminConfig): MiniHotelSettings | null {
  if (!config.MINIHOTEL_USERNAME || !config.MINIHOTEL_PASSWORD || !config.MINIHOTEL_HOTEL_ID) {
    return null;
  }
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig {
  const parsed = checked.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment for apps/admin: ${missing}`);
  }
  return Object.freeze(parsed.data);
}

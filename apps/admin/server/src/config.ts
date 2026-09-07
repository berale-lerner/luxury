import { z } from 'zod';

/**
 * Environment for apps/admin, validated once at boot.
 *
 * This service reaches every schema, business included, so a missing auth
 * setting must stop the process rather than start one that serves guest
 * conversations to whoever finds the URL.
 */
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

  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AdminConfig = Readonly<z.infer<typeof schema>>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment for apps/admin: ${missing}`);
  }
  return Object.freeze(parsed.data);
}

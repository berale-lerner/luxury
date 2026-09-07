import pg from 'pg';

/**
 * The admin connection, as admin_user.
 *
 * Unlike the bot, this role reaches every schema and is not scoped by a
 * session variable — which is exactly why the allowlist in front of it is the
 * security boundary, and why it is checked on every request rather than once
 * at sign-in.
 */
export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
}

import type pg from 'pg';

/**
 * Whether a signed-in email is allowed into the admin interface.
 *
 * Signing in with Google proves who someone is. It does not prove they are
 * allowed in — anyone on the internet with a Google account can complete that
 * flow. This is the check that decides, and it runs on the server on every
 * request (CLAUDE.md, "Admin access").
 *
 * Comparison is case-insensitive and trimmed, because an address that differs
 * only in case is the same mailbox and a manager typing it into the UI should
 * not have to know that.
 */
export async function isAllowed(pool: pg.Pool, email: string): Promise<boolean> {
  const result = await pool.query<{ ok: boolean }>(
    `SELECT true AS ok FROM public.admin_allowlist
      WHERE lower(email) = lower(btrim($1)) LIMIT 1`,
    [email],
  );
  return result.rowCount === 1;
}

/** The allowlist, for the screen that manages it. */
export async function listAllowed(pool: pg.Pool): Promise<Array<{ email: string; addedBy: string | null }>> {
  const result = await pool.query<{ email: string; added_by: string | null }>(
    `SELECT email, added_by FROM public.admin_allowlist ORDER BY email`,
  );
  return result.rows.map((row) => ({ email: row.email, addedBy: row.added_by }));
}

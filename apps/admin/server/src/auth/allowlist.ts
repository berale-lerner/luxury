import type pg from 'pg';
import { isRole, type AdminRole } from './roles.js';

export interface AllowedAdmin {
  readonly id: string;
  readonly email: string;
  readonly role: AdminRole;
}

/**
 * Looks up a signed-in address on the allowlist.
 *
 * Signing in with Google proves who someone is. It does not prove they are
 * allowed in — anyone on the internet with a Google account can complete that
 * flow. This is the check that decides, and it runs on the server on every
 * request (CLAUDE.md, "Admin access").
 *
 * Returns the row rather than a boolean, because the same lookup answers the
 * second question too: not just whether they may be here, but what they may
 * do. Two queries would be two chances for the answers to disagree.
 *
 * Comparison is case-insensitive and trimmed, because an address that differs
 * only in case is the same mailbox and a manager typing it into the UI should
 * not have to know that.
 */
export async function findAllowedAdmin(
  pool: pg.Pool,
  email: string,
): Promise<AllowedAdmin | null> {
  const result = await pool.query<{ id: string; email: string; role: string }>(
    `SELECT id, email, role FROM public.admin_allowlist
      WHERE lower(email) = lower(btrim($1)) LIMIT 1`,
    [email],
  );

  const row = result.rows[0];
  if (!row) return null;

  // A role the code does not recognise is not a reason to guess upwards. It
  // means the database is ahead of this deployment, and the safe reading of
  // an unknown permission is the smallest one.
  return { id: row.id, email: row.email, role: isRole(row.role) ? row.role : 'viewer' };
}

import type pg from 'pg';
import type { PoolClient } from 'pg';
import { isRole, type AdminRole } from '../auth/roles.js';

export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly addedBy: string | null;
  readonly createdAt: string;
  readonly roleChangedBy: string | null;
  readonly roleChangedAt: string | null;
}

/** Refusals the routes turn into a 4xx, rather than a 500 with a stack. */
export type UserWriteError =
  | 'not_found'
  | 'already_exists'
  | 'last_owner'
  | 'self';

export class UserWriteRefused extends Error {
  constructor(readonly reason: UserWriteError) {
    super(reason);
  }
}

export async function listUsers(pool: pg.Pool): Promise<AdminUser[]> {
  const result = await pool.query(
    `SELECT id, email, role, added_by, created_at, role_changed_by, role_changed_at
       FROM public.admin_allowlist
      ORDER BY email`,
  );
  return result.rows.map(toUser);
}

export async function addUser(
  pool: pg.Pool,
  input: { email: string; role: AdminRole; addedBy: string },
): Promise<AdminUser> {
  const result = await pool.query(
    `INSERT INTO public.admin_allowlist (email, role, added_by, role_changed_by, role_changed_at)
     VALUES (lower(btrim($1)), $2, $3, $3, now())
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, role, added_by, created_at, role_changed_by, role_changed_at`,
    [input.email, input.role, input.addedBy],
  );

  const row = result.rows[0];
  // The address is stored lowercased and the unique index is on the column,
  // so a second attempt at the same mailbox conflicts rather than creating a
  // duplicate with different capitalisation.
  if (!row) throw new UserWriteRefused('already_exists');
  return toUser(row);
}

/**
 * Changes what someone may do.
 *
 * Two rules, both enforced here rather than by hiding a control:
 *
 * - nobody changes their own role. Not a courtesy — it is how an account
 *   locks itself out with one mis-click
 * - the last owner survives. Checked under a lock, because the obvious
 *   version of this check is wrong: two demotions running at once each see
 *   the other owner in their own snapshot, both conclude they are safe, and
 *   the list ends with nobody who can administer it
 */
export async function changeRole(
  pool: pg.Pool,
  input: { id: string; role: AdminRole; actorId: string; actorEmail: string },
): Promise<AdminUser> {
  if (input.id === input.actorId) throw new UserWriteRefused('self');

  return inTransaction(pool, async (client) => {
    const target = await lockTarget(client, input.id);
    if (target.role === 'owner' && input.role !== 'owner') {
      await requireAnotherOwner(client, input.id);
    }

    const result = await client.query(
      `UPDATE public.admin_allowlist
          SET role = $2, role_changed_by = $3, role_changed_at = now()
        WHERE id = $1
      RETURNING id, email, role, added_by, created_at, role_changed_by, role_changed_at`,
      [input.id, input.role, input.actorEmail],
    );
    return toUser(result.rows[0]);
  });
}

/** Same two rules: not yourself, and not the last owner. */
export async function removeUser(
  pool: pg.Pool,
  input: { id: string; actorId: string },
): Promise<void> {
  if (input.id === input.actorId) throw new UserWriteRefused('self');

  await inTransaction(pool, async (client) => {
    const target = await lockTarget(client, input.id);
    if (target.role === 'owner') await requireAnotherOwner(client, input.id);
    await client.query('DELETE FROM public.admin_allowlist WHERE id = $1', [input.id]);
  });
}

async function lockTarget(client: PoolClient, id: string): Promise<{ role: AdminRole }> {
  const result = await client.query<{ role: string }>(
    'SELECT role FROM public.admin_allowlist WHERE id = $1 FOR UPDATE',
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new UserWriteRefused('not_found');
  return { role: isRole(row.role) ? row.role : 'viewer' };
}

/**
 * Refuses unless an owner other than `id` remains.
 *
 * `FOR UPDATE` on every owner row is what makes this safe. A concurrent
 * transaction demoting a different owner has to wait here, and when it is let
 * through Postgres re-evaluates the rows it was waiting on — so it sees the
 * committed demotion rather than the snapshot it started with, and finds no
 * one left to fall back on.
 *
 * `count(*)` cannot be used: Postgres rejects FOR UPDATE with an aggregate.
 * The rows are counted after they are locked, which is the same answer.
 */
async function requireAnotherOwner(client: PoolClient, id: string): Promise<void> {
  const owners = await client.query<{ id: string }>(
    `SELECT id FROM public.admin_allowlist WHERE role = 'owner' FOR UPDATE`,
  );
  const others = owners.rows.filter((row) => row.id !== id);
  if (others.length === 0) throw new UserWriteRefused('last_owner');
}

async function inTransaction<T>(
  pool: pg.Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

interface Row {
  id: string;
  email: string;
  role: string;
  added_by: string | null;
  created_at: Date;
  role_changed_by: string | null;
  role_changed_at: Date | null;
}

function toUser(row: Row): AdminUser {
  return {
    id: row.id,
    email: row.email,
    role: isRole(row.role) ? row.role : 'viewer',
    addedBy: row.added_by,
    createdAt: row.created_at.toISOString(),
    roleChangedBy: row.role_changed_by,
    roleChangedAt: row.role_changed_at?.toISOString() ?? null,
  };
}

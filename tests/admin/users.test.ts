/**
 * The rules that keep the allowlist usable.
 *
 * Two of them exist because of how they fail rather than how they work: an
 * account that removes its own access, and a list that ends with nobody who
 * can administer it. Neither is recoverable from inside the application.
 */
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import {
  addUser,
  changeRole,
  listUsers,
  removeUser,
  UserWriteRefused,
} from '../../apps/admin/server/src/users/queries.js';
import { urlForRole } from '../helpers/config.js';

const PREFIX = 'users-test-';

let pool: pg.Pool;
let admin: pg.Client;

/** The person doing the changing. Never one of the rows under test. */
let actorId: string;

async function insert(email: string, role: string): Promise<string> {
  const result = await admin.query<{ id: string }>(
    'INSERT INTO public.admin_allowlist (email, role) VALUES ($1, $2) RETURNING id',
    [`${PREFIX}${email}`, role],
  );
  return result.rows[0]!.id;
}

async function roleOf(id: string): Promise<string | undefined> {
  const result = await admin.query<{ role: string }>(
    'SELECT role FROM public.admin_allowlist WHERE id = $1',
    [id],
  );
  return result.rows[0]?.role;
}

async function ownerCount(): Promise<number> {
  const result = await admin.query<{ n: string }>(
    `SELECT count(*) AS n FROM public.admin_allowlist WHERE role = 'owner' AND email LIKE $1`,
    [`${PREFIX}%`],
  );
  return Number(result.rows[0]!.n);
}

async function refusalFrom(work: () => Promise<unknown>): Promise<string> {
  try {
    await work();
  } catch (error) {
    if (error instanceof UserWriteRefused) return error.reason;
    throw error;
  }
  throw new Error('expected the write to be refused, and it was not');
}

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: urlForRole('admin_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();
});

beforeEach(async () => {
  await admin.query('DELETE FROM public.admin_allowlist WHERE email LIKE $1', [`${PREFIX}%`]);
  actorId = await insert('actor@example.com', 'owner');
});

afterAll(async () => {
  await admin.query('DELETE FROM public.admin_allowlist WHERE email LIKE $1', [`${PREFIX}%`]);
  await admin.end();
  await pool.end();
});

describe('adding someone', () => {
  it('stores the address lowercased, so one mailbox is one row', async () => {
    const user = await addUser(pool, {
      email: `  ${PREFIX}Mixed.Case@Example.COM  `,
      role: 'viewer',
      addedBy: 'test',
    });
    expect(user.email).toBe(`${PREFIX}mixed.case@example.com`);

    // The same mailbox typed differently is a conflict, not a second entry.
    const reason = await refusalFrom(() =>
      addUser(pool, {
        email: `${PREFIX}MIXED.CASE@example.com`,
        role: 'owner',
        addedBy: 'test',
      }),
    );
    expect(reason).toBe('already_exists');
  });

  it('records who added them', async () => {
    await addUser(pool, { email: `${PREFIX}new@example.com`, role: 'manager', addedBy: 'boss@x' });
    const stored = (await listUsers(pool)).find((u) => u.email === `${PREFIX}new@example.com`);
    expect(stored?.addedBy).toBe('boss@x');
    expect(stored?.role).toBe('manager');
  });
});

describe('your own row', () => {
  it('cannot be demoted', async () => {
    const reason = await refusalFrom(() =>
      changeRole(pool, { id: actorId, role: 'viewer', actorId, actorEmail: 'a@x' }),
    );
    expect(reason).toBe('self');
    expect(await roleOf(actorId)).toBe('owner');
  });

  it('cannot be deleted', async () => {
    expect(await refusalFrom(() => removeUser(pool, { id: actorId, actorId }))).toBe('self');
    expect(await roleOf(actorId)).toBe('owner');
  });
});

describe('the last owner', () => {
  it('cannot be demoted', async () => {
    // actorId is the only owner, and someone else is doing the demoting.
    const other = await insert('other@example.com', 'viewer');
    const reason = await refusalFrom(() =>
      changeRole(pool, { id: actorId, role: 'viewer', actorId: other, actorEmail: 'o@x' }),
    );
    expect(reason).toBe('last_owner');
    expect(await ownerCount()).toBe(1);
  });

  it('cannot be deleted', async () => {
    const other = await insert('other@example.com', 'viewer');
    expect(await refusalFrom(() => removeUser(pool, { id: actorId, actorId: other }))).toBe(
      'last_owner',
    );
    expect(await ownerCount()).toBe(1);
  });

  it('survives two demotions racing each other', async () => {
    // The check that looks obviously correct is not: under READ COMMITTED
    // each transaction sees the other owner in its own snapshot, both
    // conclude they are safe, and the list ends with nobody who can
    // administer it. The lock in requireAnotherOwner is what prevents that,
    // and this is the test that would fail without it.
    await admin.query('DELETE FROM public.admin_allowlist WHERE id = $1', [actorId]);
    const first = await insert('owner-a@example.com', 'owner');
    const second = await insert('owner-b@example.com', 'owner');
    const outsider = await insert('outsider@example.com', 'viewer');

    const results = await Promise.allSettled([
      changeRole(pool, { id: first, role: 'viewer', actorId: outsider, actorEmail: 'o@x' }),
      changeRole(pool, { id: second, role: 'viewer', actorId: outsider, actorEmail: 'o@x' }),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(UserWriteRefused);
    expect(await ownerCount()).toBe(1);
  });

  it('is not protected once a second owner exists', async () => {
    const second = await insert('owner-b@example.com', 'owner');
    const outsider = await insert('outsider@example.com', 'viewer');
    await changeRole(pool, { id: second, role: 'manager', actorId: outsider, actorEmail: 'o@x' });
    expect(await roleOf(second)).toBe('manager');
  });
});

describe('a row that is gone', () => {
  it('is a refusal rather than a silent success', async () => {
    const ghost = '00000000-0000-4000-8000-0000000000ff';
    expect(await refusalFrom(() => removeUser(pool, { id: ghost, actorId }))).toBe('not_found');
  });
});

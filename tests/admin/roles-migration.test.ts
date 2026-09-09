/**
 * Migration 0010, on a database that had rows before it ran.
 *
 * This is the one thing in the change that cannot be fixed from inside the
 * application if it is wrong: every manager on the list becomes a viewer, and
 * the screen that would restore them is the screen they can no longer reach.
 * The fix would be an INSERT by hand in production, which is what the whole
 * change exists to remove.
 *
 * A fresh test database has no rows to promote, so this builds one that does:
 * a separate database in the same container, migrated up to 0009, seeded, and
 * then taken through 0010 — the real file, not a copy of its intent.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { OWNER_URL } from '../helpers/config.js';

const MIGRATIONS = new URL('../../migrations', import.meta.url).pathname;
const SCRATCH = 'luxury_migration_0010';
const BEFORE = '0010';

let scratch: pg.Client;

function urlFor(database: string): string {
  const url = new URL(OWNER_URL);
  url.pathname = `/${database}`;
  return url.toString();
}

async function apply(client: pg.Client, files: string[]): Promise<void> {
  for (const file of files) {
    await client.query(await readFile(join(MIGRATIONS, file), 'utf8'));
  }
}

beforeAll(async () => {
  const maintenance = new pg.Client({ connectionString: OWNER_URL });
  await maintenance.connect();
  await maintenance.query(`DROP DATABASE IF EXISTS ${SCRATCH}`);
  await maintenance.query(`CREATE DATABASE ${SCRATCH}`);
  await maintenance.end();

  scratch = new pg.Client({ connectionString: urlFor(SCRATCH) });
  await scratch.connect();

  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort();
  // Role creation is idempotent, so a second database in the same cluster
  // replays these without colliding with the test database's roles.
  await apply(
    scratch,
    files.filter((file) => file < BEFORE),
  );
}, 30_000);

afterAll(async () => {
  await scratch?.end();
  const maintenance = new pg.Client({ connectionString: OWNER_URL });
  await maintenance.connect();
  await maintenance.query(`DROP DATABASE IF EXISTS ${SCRATCH}`);
  await maintenance.end();
});

describe('an allowlist that existed before roles did', () => {
  it('keeps every permission its members already had', async () => {
    await scratch.query(
      `INSERT INTO public.admin_allowlist (email) VALUES ('before@example.com'), ('also@example.com')`,
    );

    await apply(scratch, ['0010_admin_roles.sql']);

    const result = await scratch.query<{ email: string; role: string }>(
      'SELECT email, role FROM public.admin_allowlist ORDER BY email',
    );
    // They administered the system when the list was binary. Anything less
    // than owner takes away something they had.
    expect(result.rows).toEqual([
      { email: 'also@example.com', role: 'owner' },
      { email: 'before@example.com', role: 'owner' },
    ]);
  });

  it('gives anyone added afterwards the least, not the most', async () => {
    await scratch.query(
      `INSERT INTO public.admin_allowlist (email) VALUES ('after@example.com')`,
    );
    const result = await scratch.query<{ role: string }>(
      `SELECT role FROM public.admin_allowlist WHERE email = 'after@example.com'`,
    );
    expect(result.rows[0]?.role).toBe('viewer');
  });

  it('refuses a role the code does not implement', async () => {
    await expect(
      scratch.query(
        `INSERT INTO public.admin_allowlist (email, role) VALUES ('bad@example.com', 'superuser')`,
      ),
    ).rejects.toThrow();
  });
});

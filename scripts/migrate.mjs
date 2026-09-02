/**
 * Migration runner.
 *
 * Applies migrations/*.sql in filename order and records each one in
 * migrations.applied. Migrations are the single source of truth for roles,
 * GRANTs and RLS, so this is the only path by which a database — local, test,
 * staging or production — gets its permission model.
 *
 * Usage:
 *   node scripts/migrate.mjs [connection-string] [--reset]
 *
 * The connection string is an operator/CI input (argument, or
 * MIGRATE_DATABASE_URL). It is not a service environment variable: apps/bot and
 * apps/admin each hold their own DATABASE_URL, at the service level, and
 * neither of them is the role that runs migrations.
 *
 * --reset drops the schemas and the application roles and rebuilds from the
 * first migration. Test databases only.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const APP_ROLES = ['bot_user', 'admin_user'];

async function reset(client) {
  await client.query('DROP SCHEMA IF EXISTS business CASCADE');
  await client.query('DROP SCHEMA IF EXISTS migrations CASCADE');
  await client.query('DROP SCHEMA IF EXISTS public CASCADE');
  await client.query('CREATE SCHEMA public');
  for (const role of APP_ROLES) {
    await client.query(
      `DO $$
       BEGIN
         IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${role}') THEN
           EXECUTE 'DROP OWNED BY ${role}';
           EXECUTE 'DROP ROLE ${role}';
         END IF;
       END
       $$`,
    );
  }
}

async function ensureLedger(client) {
  await client.query('CREATE SCHEMA IF NOT EXISTS migrations');
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations.applied (
      filename    text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function migrate({ connectionString, reset: shouldReset = false, log = () => {} }) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    if (shouldReset) {
      log('reset: dropping schemas and application roles');
      await reset(client);
    }
    await ensureLedger(client);

    const { rows } = await client.query('SELECT filename FROM migrations.applied');
    const already = new Set(rows.map((row) => row.filename));

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    const applied = [];

    for (const filename of files) {
      if (already.has(filename)) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf8');
      log(`applying ${filename}`);
      // Each migration file manages its own transaction.
      await client.query(sql);
      await client.query('INSERT INTO migrations.applied (filename) VALUES ($1)', [filename]);
      applied.push(filename);
    }
    return applied;
  } finally {
    await client.end();
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  const connectionString = args.find((a) => !a.startsWith('--')) ?? process.env.MIGRATE_DATABASE_URL;

  if (!connectionString) {
    console.error('No connection string. Pass one as an argument or set MIGRATE_DATABASE_URL.');
    process.exit(1);
  }

  const applied = await migrate({
    connectionString,
    reset: shouldReset,
    log: (message) => console.log(message),
  });
  console.log(applied.length ? `applied ${applied.length} migration(s)` : 'already up to date');
}

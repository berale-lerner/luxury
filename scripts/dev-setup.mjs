/**
 * Prepares the local development database: migrate, then set the role
 * passwords the service connects with.
 *
 * Migrations create bot_user and admin_user without passwords, because a
 * password belongs to an environment and never to git (CLAUDE.md,
 * "Operations"). The values here are for the throwaway container in
 * docker-compose.dev.yml and exist nowhere else.
 */
import pg from 'pg';
import { migrate } from './migrate.mjs';

const OWNER_URL =
  process.env.DEV_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55433/luxury_dev';

const PASSWORDS = { bot_user: 'dev_bot_pw', admin_user: 'dev_admin_pw' };

await migrate({ connectionString: OWNER_URL });

const owner = new pg.Client({ connectionString: OWNER_URL });
await owner.connect();
try {
  for (const [role, password] of Object.entries(PASSWORDS)) {
    await owner.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
  }
  console.log('roles ready: bot_user, admin_user');
} finally {
  await owner.end();
}

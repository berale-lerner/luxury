/**
 * Builds the test database from the migration files and nothing else.
 *
 * If the schema under test were assembled any other way, the suite would be
 * verifying a database that does not exist in the code — which is the specific
 * failure mode TESTING.md rules out.
 */
import pg from 'pg';
// @ts-expect-error — plain .mjs runner, shared with the CLI entry point.
import { migrate } from '../../scripts/migrate.mjs';
import { OWNER_URL, ROLE_PASSWORDS } from './config.js';
import { seed } from './fixtures.js';

export default async function setup(): Promise<void> {
  await migrate({ connectionString: OWNER_URL, reset: true });

  const owner = new pg.Client({ connectionString: OWNER_URL });
  await owner.connect();
  try {
    // Migrations create the roles; passwords are per environment and never in
    // git. In this container they are throwaway values from config.ts.
    for (const [role, password] of Object.entries(ROLE_PASSWORDS)) {
      await owner.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
    }
    await seed(owner);
  } finally {
    await owner.end();
  }
}

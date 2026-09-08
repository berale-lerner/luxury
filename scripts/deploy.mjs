/**
 * What runs once per deploy, as the owner role.
 *
 * Three steps, in order, all of which need privileges neither application
 * role has and all of which must therefore happen inside Railway. Running
 * them from a laptop would mean production credentials on a laptop, which
 * CLAUDE.md rules out.
 *
 *   1. migrate                — roles, GRANTs, RLS
 *   2. sync role passwords    — migrations create roles without one
 *   3. seed the allowlist     — the first manager has no other way in
 *   4. publish the prompt     — only if it changed
 *
 * Step 3 is a stopgap. The design has the owner publishing from the admin
 * screen with draft-then-publish (DESIGN.md); until that exists, an
 * environment with no published version has a bot that starts and stays
 * silent. It is written to defer to the admin UI the moment that lands: it
 * compares the assembled text against the current published version and does
 * nothing when they match, so it neither climbs the version number on every
 * deploy nor overwrites something the owner published by hand.
 */
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { migrate } from './migrate.mjs';
import { assemble } from './publish-prompt.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Gives each application role the password its service connects with.
 *
 * Migrations deliberately create the roles without one: a password belongs to
 * an environment, and putting it in a migration would put it in git. The
 * values come from this service's own environment, which is also where the
 * consuming service reads them from, so the two cannot drift apart.
 */
export async function syncRolePasswords(client, passwords) {
  for (const [role, password] of Object.entries(passwords)) {
    if (!password) {
      // Not fatal: an environment may not run every service yet. It is worth
      // saying out loud, because the symptom otherwise is a service that
      // cannot authenticate and no obvious reason why.
      console.warn(`no password provided for ${role}; leaving it unset`);
      continue;
    }
    // Parameterised through format() rather than interpolated: the password
    // is a secret from the environment, and a naive string concat here would
    // both break on quotes and log it on error.
    await client.query(`ALTER ROLE ${role} PASSWORD $1`.replace('$1', quote(password)));
    console.log(`password set for ${role}`);
  }
}

/**
 * Puts the initial managers on the allowlist.
 *
 * A bootstrap step, and it exists because of a genuine circularity: the
 * allowlist is managed from a screen inside apps/admin, and nobody can reach
 * that screen until they are on the allowlist. Something outside the
 * interface has to place the first entry, and it cannot be a person with a
 * psql prompt — production credentials do not leave Railway (CLAUDE.md).
 *
 * Additive only. It never removes an address, so a manager taken off the
 * list in the UI does not come back on the next deploy.
 */
export async function seedAllowlist(client, emails) {
  const wanted = emails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (wanted.length === 0) return { added: [] };

  const added = [];
  for (const email of wanted) {
    const result = await client.query(
      `INSERT INTO public.admin_allowlist (email, added_by)
       VALUES ($1, 'deploy')
       ON CONFLICT (email) DO NOTHING
       RETURNING email`,
      [email],
    );
    if (result.rowCount === 1) added.push(email);
  }

  console.log(
    added.length > 0
      ? `allowlist: added ${added.join(', ')}`
      : `allowlist: ${wanted.length} address(es) already present`,
  );
  return { added };
}

/** Postgres literal quoting, so a password containing a quote still works. */
function quote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function publishIfChanged(client, agentKey, root = ROOT) {
  const dir = join(root, 'prompts', agentKey);

  let documents;
  let body;
  try {
    ({ documents, body } = await assemble(dir));
  } catch {
    console.log(`no prompt files under prompts/${agentKey}; nothing to publish`);
    return { published: false };
  }

  const agent = await client.query('SELECT id FROM public.agents WHERE key = $1', [agentKey]);
  if (agent.rowCount === 0) {
    console.warn(`no agent with key "${agentKey}"; skipping publish`);
    return { published: false };
  }
  const agentId = agent.rows[0].id;

  const current = await client.query(
    `SELECT version_number, body FROM public.prompt_versions
      WHERE agent_id = $1 ORDER BY version_number DESC LIMIT 1`,
    [agentId],
  );

  if (current.rows[0]?.body === body) {
    console.log(`prompt for "${agentKey}" unchanged at version ${current.rows[0].version_number}`);
    return { published: false, versionNumber: current.rows[0].version_number };
  }

  const versionNumber = (current.rows[0]?.version_number ?? 0) + 1;

  await client.query('BEGIN');
  try {
    await client.query('DELETE FROM public.prompt_documents WHERE agent_id = $1', [agentId]);
    for (const doc of documents) {
      await client.query(
        `INSERT INTO public.prompt_documents (agent_id, title, body, position, updated_by)
         VALUES ($1, $2, $3, $4, 'deploy')`,
        [agentId, doc.title, doc.body, doc.position],
      );
    }
    await client.query(
      `INSERT INTO public.prompt_versions
         (agent_id, version_number, body, snapshot, published_by)
       VALUES ($1, $2, $3, $4::jsonb, 'deploy')`,
      [agentId, versionNumber, body, JSON.stringify(documents)],
    );
    await client.query('COMMIT');
    console.log(`published version ${versionNumber} for "${agentKey}"`);
    return { published: true, versionNumber };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const connectionString = process.env.MIGRATE_DATABASE_URL;
  if (!connectionString) {
    console.error('MIGRATE_DATABASE_URL is not set.');
    process.exit(1);
  }

  await migrate({ connectionString });

  const owner = new pg.Client({ connectionString });
  await owner.connect();
  try {
    await syncRolePasswords(owner, {
      bot_user: process.env.BOT_DB_PASSWORD,
      admin_user: process.env.ADMIN_DB_PASSWORD,
    });
    await seedAllowlist(owner, process.env.ADMIN_ALLOWLIST ?? '');
    await publishIfChanged(owner, process.env.AGENT_KEY ?? 'guest');
  } finally {
    await owner.end();
  }
}

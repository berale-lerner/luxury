/**
 * Publishes a prompt version from files on disk.
 *
 * A stopgap. The design has the owner editing these documents in the admin
 * UI, with draft-then-publish and a preview (DESIGN.md); that screen does not
 * exist yet, and without some way to publish, the bot starts up and stays
 * silent because nothing has been published for its agent.
 *
 * It writes both tables, the same way the admin screen will: the documents as
 * the editable set, and a frozen version as what the bot actually serves.
 *
 * Usage:
 *   node scripts/publish-prompt.mjs <agent-key> [--dir prompts/<agent-key>]
 *
 * Connection string from PUBLISH_DATABASE_URL or the first positional after
 * the flags. This is an operator input, not a service variable — it needs to
 * write, which neither application role may do.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Documents are concatenated in filename order, so the prefix is the order. */
const SEPARATOR = '\n\n---\n\n';

function parseArgs(argv) {
  const args = { agentKey: undefined, dir: undefined, url: undefined, by: undefined };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') args.dir = argv[++i];
    else if (arg === '--url') args.url = argv[++i];
    else if (arg === '--by') args.by = argv[++i];
    else rest.push(arg);
  }
  args.agentKey = rest[0];
  args.url ??= process.env.PUBLISH_DATABASE_URL;
  return args;
}

/**
 * Reads the documents and joins them, shared with the deploy step so the
 * ordering and the separator have exactly one definition.
 */
export async function assemble(dir) {
  const documents = await readDocuments(dir);
  return { documents, body: documents.map((doc) => doc.body).join(SEPARATOR) };
}

async function readDocuments(dir) {
  const entries = (await readdir(dir)).filter((name) => name.endsWith('.md')).sort();
  if (entries.length === 0) {
    throw new Error(`No .md files in ${dir}. A version with no documents is not publishable.`);
  }
  return Promise.all(
    entries.map(async (name, index) => ({
      title: name.replace(/^\d+[-_]?/, '').replace(/\.md$/, ''),
      body: (await readFile(join(dir, name), 'utf8')).trim(),
      // Sparse, so a document can be inserted between two later without
      // renumbering the rest.
      position: (index + 1) * 10,
    })),
  );
}

export async function publish({ connectionString, agentKey, dir, publishedBy }) {
  const { documents, body } = await assemble(dir);

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');

    const agent = await client.query('SELECT id FROM public.agents WHERE key = $1', [agentKey]);
    if (agent.rowCount === 0) {
      throw new Error(`No agent with key "${agentKey}". Add one before publishing for it.`);
    }
    const agentId = agent.rows[0].id;

    // The documents are replaced wholesale: this script's input is the files,
    // so anything only in the database was not meant to survive.
    await client.query('DELETE FROM public.prompt_documents WHERE agent_id = $1', [agentId]);
    for (const doc of documents) {
      await client.query(
        `INSERT INTO public.prompt_documents (agent_id, title, body, position, updated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [agentId, doc.title, doc.body, doc.position, publishedBy],
      );
    }

    const next = await client.query(
      `SELECT coalesce(max(version_number), 0) + 1 AS n
         FROM public.prompt_versions WHERE agent_id = $1`,
      [agentId],
    );
    const versionNumber = next.rows[0].n;

    await client.query(
      `INSERT INTO public.prompt_versions
         (agent_id, version_number, body, snapshot, published_by)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [agentId, versionNumber, body, JSON.stringify(documents), publishedBy],
    );

    await client.query('COMMIT');
    return { versionNumber, documents: documents.length, characters: body.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  if (!args.agentKey) {
    console.error('Usage: node scripts/publish-prompt.mjs <agent-key> [--dir DIR] [--url URL]');
    process.exit(1);
  }
  if (!args.url) {
    console.error('No connection string. Pass --url or set PUBLISH_DATABASE_URL.');
    process.exit(1);
  }

  const dir = args.dir ?? join(ROOT, 'prompts', args.agentKey);
  const result = await publish({
    connectionString: args.url,
    agentKey: args.agentKey,
    dir,
    publishedBy: args.by ?? 'cli',
  });

  console.log(
    `published version ${result.versionNumber} for "${args.agentKey}": ` +
      `${result.documents} document(s), ${result.characters} characters`,
  );
}

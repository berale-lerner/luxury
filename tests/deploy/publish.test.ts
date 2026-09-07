/**
 * The deploy step that publishes the prompt.
 *
 * It runs on every deploy, so the property that matters is that it does
 * nothing when nothing changed. Without that it would climb the version
 * number on each push, and — once the admin screen exists — overwrite what
 * the owner published by hand with whatever is in the repository.
 */
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
// @ts-expect-error — plain .mjs, shared with the deploy entry point.
import { publishIfChanged, syncRolePasswords } from '../../scripts/deploy.mjs';
import { OWNER_URL } from '../helpers/config.js';

let owner: pg.Client;
let root: string;

const AGENT = 'deploy-test';

beforeAll(async () => {
  owner = new pg.Client({ connectionString: OWNER_URL });
  await owner.connect();
  await owner.query(`INSERT INTO public.agents (key, name) VALUES ($1, 'Deploy test')`, [AGENT]);

  root = await mkdtemp(join(tmpdir(), 'luxury-prompts-'));
  await mkdir(join(root, 'prompts', AGENT), { recursive: true });
});

afterAll(async () => {
  await owner.query(`DELETE FROM public.agents WHERE key = $1`, [AGENT]);
  await owner.end();
  await rm(root, { recursive: true, force: true });
});

async function writePrompt(name: string, body: string): Promise<void> {
  await writeFile(join(root, 'prompts', AGENT, name), body, 'utf8');
}

describe('publishing on deploy', () => {
  it('publishes the first version', async () => {
    await writePrompt('010-role.md', 'You are the assistant.');
    expect(await publishIfChanged(owner, AGENT, root)).toEqual({
      published: true,
      versionNumber: 1,
    });
  });

  it('does nothing when the text is unchanged', async () => {
    // The whole point: a deploy that changed nothing else must not publish.
    expect(await publishIfChanged(owner, AGENT, root)).toEqual({
      published: false,
      versionNumber: 1,
    });
  });

  it('publishes a new version when the text changes', async () => {
    await writePrompt('010-role.md', 'You are the assistant. Check-in is at 15:00.');
    expect(await publishIfChanged(owner, AGENT, root)).toEqual({
      published: true,
      versionNumber: 2,
    });
  });

  it('treats an added document as a change, and keeps filename order', async () => {
    await writePrompt('005-first.md', 'Read me first.');

    expect(await publishIfChanged(owner, AGENT, root)).toEqual({
      published: true,
      versionNumber: 3,
    });

    const stored = await owner.query<{ body: string }>(
      `SELECT body FROM public.prompt_versions
        WHERE agent_id = (SELECT id FROM public.agents WHERE key = $1)
          AND version_number = 3`,
      [AGENT],
    );
    // Assembly is concatenation, so the filename prefix is the order.
    expect(stored.rows[0]!.body.indexOf('Read me first')).toBeLessThan(
      stored.rows[0]!.body.indexOf('You are the assistant'),
    );
  });

  it('publishes nothing for an agent with no prompt directory', async () => {
    expect(await publishIfChanged(owner, 'no-such-agent', root)).toEqual({ published: false });
  });
});

describe('syncing role passwords', () => {
  it('sets a password the service can then authenticate with', async () => {
    await syncRolePasswords(owner, { bot_user: "quote'and space" });

    const url = new URL(OWNER_URL);
    url.username = 'bot_user';
    url.password = "quote'and space";

    // A password containing a quote is the case naive concatenation breaks on.
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();
    await client.end();

    // Put back what the rest of the suite connects with.
    await syncRolePasswords(owner, { bot_user: 'test_bot_pw' });
  });

  it('leaves a role alone when no password is provided', async () => {
    await syncRolePasswords(owner, { admin_user: undefined });

    const url = new URL(OWNER_URL);
    url.username = 'admin_user';
    url.password = 'test_admin_pw';
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();
    await client.end();
  });
});

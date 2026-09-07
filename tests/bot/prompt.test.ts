/**
 * The published prompt, and the boundary between what is published and what
 * is still being written.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { loadPublishedPrompt, PromptCache } from '../../apps/bot/src/agent/index.js';
import { urlForRole } from '../helpers/config.js';
import { errorFrom, INSUFFICIENT_PRIVILEGE } from '../helpers/db.js';

let bot: pg.Pool;
let admin: pg.Client;
let agentId: string;

beforeAll(async () => {
  bot = new pg.Pool({ connectionString: urlForRole('bot_user') });
  admin = new pg.Client({ connectionString: urlForRole('admin_user') });
  await admin.connect();

  const agent = await admin.query<{ id: string }>(
    `INSERT INTO public.agents (key, name) VALUES ('prompt-test', 'Prompt test agent')
     RETURNING id`,
  );
  agentId = agent.rows[0]!.id;
});

afterAll(async () => {
  await admin.query(`DELETE FROM public.agents WHERE key = 'prompt-test'`);
  await admin.end();
  await bot.end();
});

async function publish(versionNumber: number, body: string): Promise<void> {
  await admin.query(
    `INSERT INTO public.prompt_versions (agent_id, version_number, body, snapshot)
     VALUES ($1, $2, $3, '[]'::jsonb)`,
    [agentId, versionNumber, body],
  );
}

describe('loading the published prompt', () => {
  it('returns null while nothing has been published', async () => {
    expect(await loadPublishedPrompt(bot, 'prompt-test')).toBeNull();
  });

  it('returns the published body', async () => {
    await publish(1, 'Answer politely. Check-in is at 15:00.');
    const prompt = await loadPublishedPrompt(bot, 'prompt-test');
    expect(prompt).toMatchObject({ versionNumber: 1, body: 'Answer politely. Check-in is at 15:00.' });
  });

  it('serves the newest version once a second is published', async () => {
    await publish(2, 'Answer politely. Check-in is at 16:00.');
    const prompt = await loadPublishedPrompt(bot, 'prompt-test');
    expect(prompt?.versionNumber).toBe(2);
    expect(prompt?.body).toContain('16:00');
  });

  it('returns null for an agent that does not exist', async () => {
    expect(await loadPublishedPrompt(bot, 'no-such-agent')).toBeNull();
  });
});

describe('the draft boundary', () => {
  it('refuses the bot any access to prompt_documents', async () => {
    // Drafts are the text the manager has not decided to serve. This is a
    // grant, not a convention, so a future query cannot reach them by mistake.
    const error = await errorFrom(() => bot.query('SELECT body FROM public.prompt_documents'));
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses the bot the snapshot column it has no use for', async () => {
    const error = await errorFrom(() => bot.query('SELECT snapshot FROM public.prompt_versions'));
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses the bot any write to a published version', async () => {
    const error = await errorFrom(() =>
      bot.query(`UPDATE public.prompt_versions SET body = 'rewritten'`),
    );
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe('prompt caching', () => {
  it('reads once within the TTL and again after it expires', async () => {
    let now = 1_000;
    const cache = new PromptCache(bot, 'prompt-test', 60_000, () => now);

    const first = await cache.get();
    expect(first?.versionNumber).toBe(2);

    await publish(3, 'A newly published version.');

    // Still inside the window: the manager's change is not visible yet, which
    // is the trade the cache makes.
    expect((await cache.get())?.versionNumber).toBe(2);

    now += 60_001;
    expect((await cache.get())?.versionNumber).toBe(3);
  });
});

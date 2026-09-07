/**
 * The separation between the model layer and the platform layer, asserted.
 *
 * apps/bot has three layers and one seam:
 *
 *   agent/          asks Claude for text
 *   channels/       speaks a platform's protocol, inbound
 *   conversations/  what the database knows about a thread
 *   reply.ts        the only module that touches both agent and messaging
 *
 * The rule that matters is not tidiness. "The code sends, not the agent"
 * (CLAUDE.md, "Outbound messages") holds because the agent layer has no way
 * to reach a channel — a module that cannot import a sender cannot acquire a
 * send tool by accident, in this slice or in a later one. Directory layout
 * alone would not survive a hurried afternoon; this does.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../..', import.meta.url).pathname;
const BOT = 'apps/bot/src';

async function filesIn(dir: string): Promise<string[]> {
  const entries = await readdir(join(ROOT, dir), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name));
}

/** Every `from '...'` specifier in a file. */
async function importsOf(path: string): Promise<string[]> {
  const source = await readFile(path, 'utf8');
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]!);
}

async function importsAcross(dir: string): Promise<Array<{ file: string; specifier: string }>> {
  const found: Array<{ file: string; specifier: string }> = [];
  for (const file of await filesIn(dir)) {
    for (const specifier of await importsOf(file)) {
      found.push({ file: file.slice(ROOT.length), specifier });
    }
  }
  return found;
}

describe('the model layer', () => {
  it('never imports the outbound messaging package', async () => {
    const offenders = (await importsAcross(`${BOT}/agent`)).filter(({ specifier }) =>
      specifier.startsWith('@luxury/messaging'),
    );
    // If this fails, the agent can send. That is the whole boundary.
    expect(offenders).toEqual([]);
  });

  it('never imports a channel', async () => {
    const offenders = (await importsAcross(`${BOT}/agent`)).filter(({ specifier }) =>
      specifier.includes('channels/'),
    );
    expect(offenders).toEqual([]);
  });

  it('does not reach for a platform SDK directly either', async () => {
    const offenders = (await importsAcross(`${BOT}/agent`)).filter(({ specifier }) =>
      /telegram|whatsapp|instagram/i.test(specifier),
    );
    expect(offenders).toEqual([]);
  });
});

describe('the provider boundary', () => {
  it('confines every vendor SDK import to agent/providers', async () => {
    const offenders: string[] = [];
    for (const file of await filesIn(BOT)) {
      const relative = file.slice(ROOT.length);
      if (relative.startsWith(`${BOT}/agent/providers/`)) continue;
      // index.ts constructs the concrete client; that is what a composition
      // root is for, and it is one file to read.
      if (relative === `${BOT}/index.ts`) continue;

      const specifiers = await importsOf(file);
      if (specifiers.some((s) => /@anthropic-ai\/|openai|@google\/|mistralai|cohere/.test(s))) {
        offenders.push(relative);
      }
    }
    // A vendor type leaking into the reply loop is how a "provider-agnostic"
    // layer quietly stops being one.
    expect(offenders).toEqual([]);
  });

  it('keeps the model port free of any vendor vocabulary', async () => {
    const source = await readFile(join(ROOT, BOT, 'agent/model.ts'), 'utf8');
    for (const word of ['anthropic', 'claude', 'openai', 'gpt', 'gemini']) {
      expect(source.toLowerCase()).not.toContain(word);
    }
  });
});

describe('the channel layer', () => {
  it('never imports the model layer', async () => {
    const offenders = (await importsAcross(`${BOT}/channels`)).filter(
      ({ specifier }) => specifier.includes('/agent/') || specifier.endsWith('/agent'),
    );
    // A channel that could call the model would become a second seam, and
    // the rule would then have two places to be broken instead of one.
    expect(offenders).toEqual([]);
  });

  it('never imports the Anthropic SDK', async () => {
    const offenders = (await importsAcross(`${BOT}/channels`)).filter(({ specifier }) =>
      specifier.startsWith('@anthropic-ai/'),
    );
    expect(offenders).toEqual([]);
  });
});

describe('the seam', () => {
  it('is the only module in the service that imports both layers', async () => {
    const withBoth: string[] = [];
    for (const file of await filesIn(BOT)) {
      const specifiers = await importsOf(file);
      const touchesModel = specifiers.some(
        (s) => s.startsWith('@anthropic-ai/') || s.includes('/agent/') || s.endsWith('/agent'),
      );
      const touchesSending = specifiers.some((s) => s.startsWith('@luxury/messaging'));
      if (touchesModel && touchesSending) {
        withBoth.push(file.slice(ROOT.length));
      }
    }
    // index.ts builds the object graph and so names both by construction;
    // reply.ts is where they actually meet.
    expect(withBoth.sort()).toEqual(['apps/bot/src/index.ts', 'apps/bot/src/reply.ts']);
  });
});

describe('the conversation layer', () => {
  it('never imports the Anthropic SDK', async () => {
    const offenders = (await importsAcross(`${BOT}/conversations`)).filter(({ specifier }) =>
      specifier.startsWith('@anthropic-ai/'),
    );
    // It may name a model *type* for the history mapping, but it does not
    // call the model.
    expect(offenders).toEqual([]);
  });
});

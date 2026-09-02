/**
 * The package boundaries, asserted rather than trusted.
 *
 * pnpm's non-flat node_modules already makes an undeclared import fail to
 * resolve. What it cannot catch is a boundary crossed by *declaring* the
 * dependency — adding a channel SDK to packages/shared, or having the
 * messaging client read its own credentials. Those are the cases here.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../..', import.meta.url).pathname;

async function packageJson(dir: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(ROOT, dir, 'package.json'), 'utf8'));
}

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(join(ROOT, dir), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('packages/shared', () => {
  it('has no runtime dependencies at all', async () => {
    const pkg = await packageJson('packages/shared');
    expect(pkg['dependencies']).toBeUndefined();
  });

  it('pins Zod as a peer dependency through the workspace catalog', async () => {
    const pkg = await packageJson('packages/shared');
    // One version for everyone: two copies of Zod in memory means types that
    // do not line up and instanceof checks that fail for no visible reason.
    expect(pkg['peerDependencies']).toEqual({ zod: 'catalog:' });
  });

  it('reads no environment variables and opens no database connection', async () => {
    for (const file of await sourceFiles('packages/shared/src')) {
      const source = await readFile(file, 'utf8');
      expect(source, `${file} reads the environment`).not.toMatch(/process\.env/);
      expect(source, `${file} imports a database driver`).not.toMatch(/from 'pg'/);
    }
  });
});

describe('packages/messaging', () => {
  it('never reads credentials from the environment — they are passed in', async () => {
    for (const file of await sourceFiles('packages/messaging/src')) {
      const source = await readFile(file, 'utf8');
      expect(source, `${file} reads the environment`).not.toMatch(/process\.env/);
    }
  });
});

describe('the two services', () => {
  it('do not depend on each other', async () => {
    const bot = await packageJson('apps/bot');
    const admin = await packageJson('apps/admin');

    expect(Object.keys(bot['dependencies'] as object)).not.toContain('@luxury/admin');
    expect(Object.keys(admin['dependencies'] as object)).not.toContain('@luxury/bot');
  });

  it('each declares its own environment, and the repo root declares none', async () => {
    const rootEntries = await readdir(ROOT);
    expect(rootEntries).not.toContain('.env.example');
    expect(rootEntries).not.toContain('.env');

    for (const app of ['apps/bot', 'apps/admin']) {
      const entries = await readdir(join(ROOT, app));
      expect(entries, `${app} has no .env.example`).toContain('.env.example');
    }
  });
});

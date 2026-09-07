/**
 * That the development sign-in stub cannot reach production.
 *
 * apps/admin has a second entry point that skips Google and claims an
 * identity from an environment variable. That is safe only for as long as it
 * is genuinely unreachable from what Railway runs — a bypass that a
 * misconfigured variable can switch on is how these become incidents.
 *
 * The guarantee is structural: `pnpm start` runs dist/index.js, and nothing
 * in that file's import graph reaches dev-server.ts. These tests assert it,
 * because a stray import would otherwise restore the bypass silently.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../..', import.meta.url).pathname;
const SRC = 'apps/admin/server/src';

async function read(path: string): Promise<string> {
  return readFile(join(ROOT, path), 'utf8');
}

/** Every module reachable from an entry point, following relative imports. */
async function importGraph(entry: string): Promise<Set<string>> {
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);

    const source = await read(current);
    // Both forms: `from './x.js'` and the side-effect `import './x.js'`.
    // Missing the second is how a reachable module hides from a check like
    // this one — which it did, until a deliberate violation failed to fail.
    for (const match of source.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
      const specifier = match[1]!.replace(/\.js$/, '.ts');
      const dir = current.slice(0, current.lastIndexOf('/'));
      const resolved = new URL(specifier, `file:///${dir}/`).pathname.slice(1);
      queue.push(resolved);
    }
  }

  return seen;
}

describe('the production entry point', () => {
  it('does not reach the development server, directly or transitively', async () => {
    const graph = await importGraph(`${SRC}/index.ts`);
    const offenders = [...graph].filter((file) => file.includes('dev-server'));
    // If this fails, the deployed service contains a way to skip sign-in.
    expect(offenders).toEqual([]);
  });

  it('is what `start` runs, so the graph above is the deployed one', async () => {
    const pkg = JSON.parse(await read('apps/admin/package.json'));
    expect(pkg.scripts.start).toBe('node dist/index.js');
  });

  it('still requires the full auth configuration', async () => {
    const config = await read(`${SRC}/config.ts`);
    // Absent Google credentials must stop the process rather than start one
    // that serves guest conversations to whoever finds the URL.
    for (const required of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'AUTH_SECRET']) {
      expect(config).toContain(required);
    }
    expect(config).not.toContain('DEV_ADMIN_EMAIL');
  });
});

describe('the development server', () => {
  it('substitutes identity only, and keeps the real guard', async () => {
    const source = await read(`${SRC}/dev-server.ts`);
    // It builds the same app, so the allowlist check still runs and the
    // stubbed address must be on it.
    expect(source).toContain("from './app.js'");
    expect(source).not.toMatch(/createAdminGuard|isAllowed/);
  });

  it('binds to loopback, so it is not reachable from another machine', async () => {
    const source = await read(`${SRC}/dev-server.ts`);
    expect(source).toContain("host: '127.0.0.1'");
    expect(source).not.toContain("'0.0.0.0'");
  });

  it('is not what Railway starts', async () => {
    const iac = await read('.railway/railway.ts');
    expect(iac).not.toContain('dev-server');
  });
});

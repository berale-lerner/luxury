/**
 * The public site's file server.
 *
 * It sits on the internet with no sign-in in front of it, and its whole job
 * is mapping a URL path to a file under out/. The failure worth catching is
 * that mapping reaching outside out/ — server.mjs and package.json live one
 * directory up — so most of what is here is the negative case.
 */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs, the service's own entry point.
import { createSiteServer } from '../../apps/site/server.mjs';

let dir: string;
let server: Server;
let port: number;

type Reply = { status: number; headers: Record<string, string | string[] | undefined>; body: string };

/** Raw request, so paths like `/../x` reach the server unnormalized. */
function get(path: string, method = 'GET'): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

beforeAll(async () => {
  // A stand-in for the app directory: out/ is the served root, and a secret
  // sits next to it, where server.mjs and package.json sit in the real app.
  dir = await mkdtemp(join(tmpdir(), 'luxury-site-'));
  const root = join(dir, 'out');
  await mkdir(join(root, 'food'), { recursive: true });
  await mkdir(join(root, '_next', 'static'), { recursive: true });
  await mkdir(join(root, 'empty'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<h1>home</h1>');
  await writeFile(join(root, 'food', 'index.html'), '<h1>food</h1>');
  await writeFile(join(root, '404.html'), '<h1>not here</h1>');
  await writeFile(join(root, '_next', 'static', 'app.js'), 'console.log(1)');
  await writeFile(join(dir, 'secret.txt'), 'outside the root');

  server = createSiteServer({ root });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

describe('serving pages', () => {
  it('serves the home page as HTML', async () => {
    const res = await get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.body).toBe('<h1>home</h1>');
  });

  it('serves a page from its directory index', async () => {
    const res = await get('/food/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('<h1>food</h1>');
  });

  it('redirects a page without its trailing slash to the canonical one', async () => {
    const res = await get('/food');
    expect(res.status).toBe(308);
    expect(res.headers['location']).toBe('/food/');
  });

  it('answers a missing page with the 404 page and a 404 status', async () => {
    const res = await get('/nowhere/');
    expect(res.status).toBe(404);
    expect(res.body).toBe('<h1>not here</h1>');
  });

  it('answers a directory without an index with 404, not a listing', async () => {
    const res = await get('/empty/');
    expect(res.status).toBe(404);
  });

  it('caches fingerprinted assets for good and pages not at all', async () => {
    expect((await get('/_next/static/app.js')).headers['cache-control']).toContain('immutable');
    expect((await get('/')).headers['cache-control']).toContain('max-age=0');
  });

  it('sends the security headers on every response', async () => {
    for (const path of ['/', '/nowhere/', '/health']) {
      const res = await get(path);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
    }
  });

  it('answers the health check', async () => {
    const res = await get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
  });

  it('answers HEAD without a body', async () => {
    const res = await get('/', 'HEAD');
    expect(res.status).toBe(200);
    expect(res.body).toBe('');
  });

  it('refuses anything but GET and HEAD', async () => {
    const res = await get('/', 'POST');
    expect(res.status).toBe(405);
  });
});

describe('the root boundary', () => {
  const escapes = [
    '/../secret.txt',
    '/%2e%2e/secret.txt',
    '/%2E%2E%2Fsecret.txt',
    '/food/..%2f..%2fsecret.txt',
    '/..%5csecret.txt',
    '/%00/index.html',
  ];

  for (const path of escapes) {
    it(`never serves a file outside out/ — ${path}`, async () => {
      const res = await get(path);
      expect(res.status).not.toBe(200);
      expect(res.body).not.toContain('outside the root');
    });
  }

  it('does not turn a doubled slash into a redirect to another host', async () => {
    const res = await get('//evil.example/food');
    if (res.status === 308) {
      expect(res.headers['location']).toMatch(/^\/[^/]/);
    }
  });

  it('answers a malformed escape with 404 rather than crashing', async () => {
    const res = await get('/%E0%A4%A');
    expect(res.status).toBe(404);
    expect((await get('/')).status).toBe(200);
  });
});

/**
 * Serves the public site: the files `next build` wrote to out/, and nothing else.
 *
 * Deliberately small and dependency-free. This service is on the internet with
 * no sign-in in front of it (DESIGN.md), so the less it does per request the
 * less there is to get wrong: it maps a URL path to a file inside out/ and
 * returns it. No database, no credentials, no environment beyond PORT.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Nobody frames the site; a page that cannot be framed cannot be clickjacked.
  'X-Frame-Options': 'DENY',
};

/** Next fingerprints everything under _next/static, so a URL there never changes content. */
function cacheControl(urlPath) {
  return urlPath.startsWith('/_next/static/')
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=0, must-revalidate';
}

async function fileAt(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info : info.isDirectory() ? 'directory' : null;
  } catch {
    return null;
  }
}

/**
 * The path inside root a URL points at, or null if it would leave root.
 * Decoding happens once, here, so `%2e%2e` gets the same check as `..`.
 */
function resolveInside(root, rawPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const full = join(root, decoded);
  return full === root || full.startsWith(root + sep) ? full : null;
}

export function createSiteServer({ root }) {
  return createServer(async (req, res) => {
    const send = (status, headers, body) => {
      res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }, 'Method Not Allowed');
      return;
    }

    // The host is irrelevant here; only the path is used, and it is parsed
    // against a fixed base so a request line like `//evil.example` stays a path.
    const urlPath = new URL(req.url ?? '/', 'http://site.invalid').pathname;

    if (urlPath === '/health') {
      send(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, 'ok');
      return;
    }

    const serveFile = async (path, info, status = 200) => {
      res.writeHead(status, {
        ...SECURITY_HEADERS,
        'Content-Type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': status === 200 ? cacheControl(urlPath) : 'no-store',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      createReadStream(path)
        .on('error', () => res.destroy())
        .pipe(res);
    };

    const notFound = async () => {
      const page = join(root, '404.html');
      const info = await fileAt(page);
      if (info && info !== 'directory') await serveFile(page, info, 404);
      else send(404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
    };

    const target = resolveInside(root, urlPath);
    if (!target) {
      await notFound();
      return;
    }

    const found = await fileAt(target);
    if (found === 'directory') {
      // Every page is a directory with an index.html (trailingSlash in
      // next.config.mjs). Without the slash, relative links inside the page
      // would resolve one level up, so redirect to the canonical form. The
      // Location is built from the already-validated path, which starts with
      // a single '/', so it can only point back at this site.
      if (!urlPath.endsWith('/')) {
        const location = '/' + urlPath.replace(/^\/+/, '') + '/';
        send(308, { Location: location, 'Cache-Control': 'no-store' }, '');
        return;
      }
      const index = join(target, 'index.html');
      const info = await fileAt(index);
      if (info && info !== 'directory') await serveFile(index, info);
      else await notFound();
      return;
    }
    if (found) {
      await serveFile(target, found);
      return;
    }
    await notFound();
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), 'out');
  const port = Number(process.env.PORT ?? 3000);
  createSiteServer({ root }).listen(port, '0.0.0.0', () => {
    console.log(`site: serving ${root} on :${port}`);
  });
}

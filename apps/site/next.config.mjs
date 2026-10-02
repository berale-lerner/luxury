/**
 * The public site is built to plain files and served by server.mjs.
 *
 * Static export means nothing on this service runs per request except a file
 * lookup: no Next server, no server components rendered on demand, nothing a
 * visitor's input can reach. Every page is fixed at build time.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  // /food/ is written as food/index.html, so a plain file server finds it.
  trailingSlash: true,
  // The image optimizer needs a running Next server, which this site does not have.
  images: { unoptimized: true },
};

export default nextConfig;

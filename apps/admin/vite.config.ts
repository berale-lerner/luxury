import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The admin SPA.
 *
 * Built into dist/web, which the Fastify server serves: one deployment, one
 * origin, no CORS, and a same-origin session cookie (DESIGN.md).
 */
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist/web', emptyOutDir: true },
  server: {
    // In development the SPA runs on its own port and forwards to the API.
    proxy: { '/api': 'http://localhost:3000' },
  },
});

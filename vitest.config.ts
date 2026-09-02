import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/helpers/global-setup.ts'],
    // The permission suite shares one Postgres container; running files
    // sequentially keeps failures about permissions rather than about
    // connection contention.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});

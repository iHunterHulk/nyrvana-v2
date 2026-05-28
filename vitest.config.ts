import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'bun:sqlite': '/opt/data/workspace/nyrvana-v2/__mocks__/bun-sqlite.js',
    },
  },
});
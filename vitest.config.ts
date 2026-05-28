import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/db/**/*.test.ts', 'src/lib/crypto.test.ts', 'src/routes/v2/auth.bun.test.ts', '**/*.bun.test.ts']
  },
  resolve: {
    alias: {
    },
  },
});
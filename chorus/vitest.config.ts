import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pure workflow logic + the in-memory repository run in Node — no DOM needed.
// The `@/` alias mirrors tsconfig "paths" so tests import the same modules the
// app does.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

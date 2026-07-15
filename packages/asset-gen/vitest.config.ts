import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.cjs', '.json'],
    alias: {
      '@math-game/core-math': fileURLToPath(new URL('../core-math/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    server: {
      deps: {
        inline: ['@math-game/core-math'],
      },
    },
  },
});

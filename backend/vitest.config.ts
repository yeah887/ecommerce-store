import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      // Keep in step with the mongo image in compose.yaml.
      MONGOMS_VERSION: '7.0.14',
    },
    // mongodb-memory-server downloads a mongod binary on first run.
    hookTimeout: 120_000,
  },
});

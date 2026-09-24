import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Test databases go on the project disk: /tmp may be a small RAM disk with per-user quotas,
// which several parallel mongod instances quickly exceed.
const tmpDir = fileURLToPath(new URL('../node_modules/.cache/mongodb-memory-server/tmp', import.meta.url));
mkdirSync(tmpDir, { recursive: true });

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      // Keep in step with the mongo image in compose.yaml.
      MONGOMS_VERSION: '7.0.14',
      TMPDIR: tmpDir,
    },
    // mongodb-memory-server downloads a mongod binary on first run.
    hookTimeout: 120_000,
  },
});

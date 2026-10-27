import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), 'server-only': fileURLToPath(new URL('./scripts/server-only-test.mjs', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/integration/**/*.test.ts'], fileParallelism: false, maxWorkers: 1, testTimeout: 30000, hookTimeout: 60000,
    reporters: ['default', 'junit'], outputFile: { junit: 'reports/integration-junit.xml' } },
});

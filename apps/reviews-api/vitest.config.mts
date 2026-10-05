import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    // Guards against a local `pnpm build` (or the docker-compose bind mount) leaving
    // compiled *.test.js behind in dist/ and having Vitest pick those up too.
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/domain/**/*.ts', 'src/application/**/*.ts', 'src/infrastructure/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        // Bootstrap/wiring — exercised by the integration tests that run against them, not unit-tested directly
        'src/infrastructure/db/client.ts',
        'src/infrastructure/db/migrate.ts',
      ],
      thresholds: {
        functions: 80,
        lines: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});

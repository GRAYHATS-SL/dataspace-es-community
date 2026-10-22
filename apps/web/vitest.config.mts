import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    // jsdom as global default — needed for React hook tests.
    // Tests that must run in pure Node.js (services, middleware) should add
    // the docblock comment at the top of the file:
    environment: 'jsdom',
    // Backends TMForum ficticios: apiFetch/apiFetchPublic lanzan error si faltan.
    env: {
      API_BASE_URL: 'https://tmf.test',
      CATALOG_PUBLIC_API_BASE_URL: 'https://catalog.test',
      MARKETPLACE_DID: 'did:web:marketplacev2.dataspace.es',
      PROVIDER_DOMAIN_SUFFIX: '.dataspace.es',
    },
    coverage: {
      provider: 'v8',
      // lcov generates coverage/lcov.info consumed by SonarQube
      // text gives the human-readable summary in the terminal
      reporter: ['text', 'lcov'],
      include: [
        'src/lib/utils/**/*.{ts,tsx}',
        'src/lib/services/queries/**/*.{ts,tsx}',
        'src/lib/validations/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
      ],
      exclude: [
        // TypeScript types — the compiler guarantees these, no runtime tests needed
        'src/types/**',
        '**/*.d.ts',
        // Re-export barrels have no logic to cover
        'src/**/index.ts',
        // Next.js pages, layouts and route handlers are covered by E2E
        'src/app/**',
        // UI components are covered by E2E
        'src/components/**',
        // Static assets and non-testable modules
        'src/data/**',
        'src/styles/**',
        'src/docs/**',
        // Legacy file — superseded by queries/*.ts
        'src/lib/services/catalogApi.ts',
      ],
      thresholds: {
        functions: 40,
        lines: 50,
        branches: 45,
        statements: 49,
        'src/lib/utils/jwtEdge.ts': {
          branches: 90
        },
        'src/lib/utils/tokens.ts': { branches: 90 },
        'src/lib/utils/extractUserProfile.ts': { branches: 90 },
        'src/lib/services/queries/_utils.ts': { branches: 90 },
        'src/lib/services/queries/reviewsAuth.ts': { branches: 90 },
      },
    },
  },
})
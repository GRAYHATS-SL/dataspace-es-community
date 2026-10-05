import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    // jsdom as global default — needed for React hook tests.
    // Tests that must run in pure Node.js (services, middleware) should add
    // the `// @vitest-environment node` docblock at the top of the file.
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
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
        'src/styles/**',
      ],
      // Here you define your coverage thresholds.
    },
  },
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    pool: 'forks',
    testTimeout: 5000,
    retry: 0,
    // E2E specs use Playwright's test runner, not Vitest. They live under
    // `e2e/` and match Vitest's default `*.spec.ts` glob, so we must exclude
    // them explicitly. Vitest's defaults (node_modules, dist, etc.) are
    // re-listed because providing `exclude` replaces the defaults rather than
    // extending them.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**', 'e2e/**'],
  },
})

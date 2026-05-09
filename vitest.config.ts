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
  },
})

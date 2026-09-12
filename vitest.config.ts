import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.tests.ts', '**/*.test.ts'],
    // tools/ holds design scripts (see tools/roomgen), which have their own config.
    exclude: ['node_modules/**', 'dist/**', 'tools/**'],
    environment: 'node',
  },
})

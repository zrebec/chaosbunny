import { defineConfig } from 'vitest/config'

/**
 * The room generator runs under vitest because vitest is what runs TypeScript here —
 * but it is a design tool, not a test, so it has its own config and its own file
 * suffix (`*.roomgen.ts`) and never joins `npm test`.
 */
export default defineConfig({
  test: {
    include: ['tools/roomgen/*.roomgen.ts'],
    environment: 'node',
    testTimeout: 3_600_000,
    hookTimeout: 60_000,
  },
})

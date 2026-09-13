import { defineConfig } from 'vitest/config'

/**
 * A config of its own for `play.tool.ts`, so `npm run roomgen` cannot pick it up.
 * See the warning at the top of that file for what happens when it can.
 */
export default defineConfig({
  test: {
    include: ['tools/roomgen/play.tool.ts'],
    environment: 'node',
    testTimeout: 3_600_000,
  },
})

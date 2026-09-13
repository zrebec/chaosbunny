import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.tests.ts', '**/*.test.ts'],
    // tools/ holds design scripts (see tools/roomgen), which have their own config.
    exclude: ['node_modules/**', 'dist/**', 'tools/**'],
    environment: 'node',
    /**
     * The solver tests are not unit tests and never were: `rooms.tests.ts` asks
     * `fewestSightings` of all eighteen rooms in one `it`, and the carrot audit asks
     * the same of every carrot. On a quiet machine that is about two and a half
     * seconds; on a busy one — a browser open, a build running — it crosses vitest's
     * 5 s default and the suite fails for a reason that has nothing to do with the
     * code. Measured on 2026-09-13 at load average 8: 6.7 s.
     *
     * So the ceiling is the one these tests actually need, not the one a unit test
     * needs. It is still low enough that a genuinely hung search is noticed quickly,
     * and the solver has its own `maxStates` guard for a room that is too open.
     */
    testTimeout: 20_000,
  },
})

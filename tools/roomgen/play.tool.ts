/**
 * Writes the keys that play a room, for a browser to press.
 *
 * **It is not a `*.roomgen.ts` file, and must never become one.** `npm run roomgen`
 * runs every file with that suffix, so while this lived under it, every search also ran
 * this — and both read `OUT`, so a search's report was overwritten by a JSON file
 * holding the way through all eighteen rooms, which then went straight to a terminal.
 * Hence the separate suffix, the separate config, and `PLAY_OUT` instead of `OUT`.
 *
 * The solver and the game are two implementations of the same rulebook, and they have
 * disagreed before: the solver counted actions while the game counted beats, which
 * nothing noticed until water made a step cost two. A test cannot catch that — it asks
 * `beat.ts` the same question twice. Only the real page can, so this hands its answer
 * to a browser driver and lets the win screen say whether the numbers match.
 *
 * ```bash
 * PLAY_OUT=/some/scratch/play.json ROOMS=room3b,room13 npm run roomgen:play
 * ```
 *
 * `OUT` is required and must be **outside the repository**: this is the one thing in
 * the toolchain that writes a way through a room down, and the rule at the top of
 * `README.md` still holds — no report, comment or commit may contain one. The driver
 * reads the file, presses the keys and reports only the beats on the win screen.
 */
import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { solve } from '../../src/stealth/solver.js'
import { parseRoom } from '../../src/stealth/room.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import type { Action } from '../../src/stealth/beat.js'

const ARROW: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }

/** The keys `main.ts` listens for, in the order a player would press them. */
const keys = (plan: readonly Action[]): string[] =>
  plan.flatMap((a) =>
    a.kind === 'move' ? [ARROW[a.dir]!]
    : a.kind === 'throw' ? ['x', ARROW[a.dir]!] // aim, then a direction throws
    : a.kind === 'ears' ? ['z']
    : [' '])

it('writes the keys that play each room', () => {
  const out = process.env.PLAY_OUT
  if (!out) throw new Error('PLAY_OUT is required')
  // Never inside the repository: this file's whole output is spoilers, and a stray copy
  // in the working tree is one `git add -A` away from being published.
  const repo = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
  if (out.startsWith(repo)) throw new Error(`PLAY_OUT must be outside ${repo}`)
  const want = process.env.ROOMS?.split(',')
  const plans = ROOM_SOURCES
    .map((src, i) => ({ src, place: i + 1 }))
    .filter(({ src }) => !want || want.includes(src.name))
    .map(({ src, place }) => {
      const room = parseRoom(src)
      const plan = solve(room)
      if (!plan) throw new Error(`${src.name}: no way out — the room's own test should have said so first`)
      return { room: src.name, place, par: room.par, keys: keys(plan) }
    })
  writeFileSync(out, JSON.stringify(plans))
  // The count and nothing else: whatever prints here can end up in a transcript.
  console.log(`${plans.length} rooms written`)
}, 600_000)

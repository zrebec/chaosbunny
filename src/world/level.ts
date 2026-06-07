/**
 * The hand-authored chaosBunny climb — a FIXED level (same every run), so it can
 * be learned and speedrun, the way Manic Miner and Jump King are. Tune it by hand:
 * all coordinates are in tiles, `y` down (row 0 = ceiling, the floor is the last
 * row). `level.tests.ts` proves the climb stays reachable after you tweak it.
 *
 * This first pass is a clean zig-zag of 11 platforms with head-clearance between
 * floors. Ladders are wired in the format (`ladders`) but unused until the climb
 * mechanic lands — then they can connect tighter, stacked sections.
 */
import type { LevelData } from './room.js'

export const LEVEL: LevelData = {
  cols: 32,
  rows: 52, // floor at row 51

  spawn: { x: 4, y: 51 },
  exit: { x: 18, y: 1, w: 4, h: 6 }, // ceiling hole above the top platform

  // Zig-zag staircase, bottom → top. Each platform is 4 rows above the previous
  // (head clearance) and beside it with a 1–2 tile air gap (within jump reach).
  platforms: [
    { x: 4, y: 47, w: 5 },  // 1
    { x: 11, y: 43, w: 10 }, // 2  (widened for a second crouch-gate stand-up zone)
    { x: 18, y: 39, w: 5 }, // 3
    { x: 24, y: 35, w: 4 }, // 4
    { x: 16, y: 31, w: 7 }, // 5  (turn left; widened so a crouch-gate has a stand-up zone)
    { x: 11, y: 27, w: 5 }, // 6
    { x: 4, y: 23, w: 5 },  // 7
    { x: 11, y: 19, w: 5, kind: 'crumble' }, // 8 crumbles — cross it before it goes!
    { x: 18, y: 15, w: 5 }, // 9
    { x: 24, y: 11, w: 4 }, // 10
    { x: 17, y: 7, w: 6 },  // 11 top ledge (under the exit)

    // Bonus stash directly above platform 6 — stacked, so a jump head-bonks.
    // The ONLY way up is the ladder: a second route, not a crutch.
    { x: 11, y: 23, w: 5 }, // 6b (over 6; ladder-only)
  ],

  // Mandatory crouch-gates. Each: bottom lip 3 rows above its platform (16px =
  // crouch-only), 5-row stone cap (too tall to jump over), narrower than the platform
  // (a stand-up zone protrudes). `level.tests.ts` enforces clearance + stand-up zone.
  overhangs: [
    // Gate 1 over platform 2 (cols 11–17): land left (from P1), crawl right past the
    // carrot to the right stand-up zone, jump to platform 3.
    { x: 13, y: 36, w: 3, h: 5 },
    // Gate 2 over platform 5 (cols 16–22): land right (from P4), crawl left, jump to P6.
    { x: 18, y: 24, w: 3, h: 5 },
  ],

  // Ladder joining platform 6 (row 27) ↔ the stacked bonus 6b (row 23).
  ladders: [
    { x: 13, y: 23, h: 5 },
  ],

  carrots: [
    { x: 13, y: 43 },
    { x: 20, y: 31 },
    { x: 13, y: 19 },
    { x: 19, y: 7 },
    { x: 12, y: 23 }, // reward on the ladder-only bonus 6b
  ],

  spiders: [
    { x: 13, y: 26 }, // drops over platform 6
    { x: 20, y: 14 }, // drops over platform 9
  ],

  bats: [
    { x: 18, y: 33, range: 5 },
    { x: 11, y: 21, range: 5 },
  ],

  torches: [
    { x: 1, y: 46 }, { x: 30, y: 40 }, { x: 1, y: 34 }, { x: 30, y: 28 },
    { x: 1, y: 22 }, { x: 30, y: 16 }, { x: 1, y: 10 },
  ],
}

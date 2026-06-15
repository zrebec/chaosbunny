/**
 * Charge-jump TUNING SANDBOX — a dev-only level, separate from the real `level.ts`.
 *
 * A clean **up-right diagonal staircase**: every platform is offset forward by about
 * one hop's reach, so the rabbit climbs WITHOUT ever turning around (the hop always
 * goes the way you face) and **no platform sits directly above another** (you can't
 * jump straight up with no air control). Gaps grow **2 → 6 tiles** so you can feel
 * which charge clears which gap and where over-charging overshoots. If a gap keeps
 * falling short, raise `hopSpeed` (more forward reach); if every jump overshoots,
 * lower it. Throwaway scaffolding — NOT linted (`level.tests.ts` checks the real
 * `LEVEL`); load it by swapping the level import in `main.ts`.
 */
import type { LevelData } from './room.js'

export const LEVEL_TEST: LevelData = {
  cols: 22,
  rows: 34,
  spawn: { x: 2, y: 33 },
  exit: { x: 14, y: 7, w: 4, h: 6 }, // above the top ledge
  platforms: [
    { x: 5, y: 31, w: 4 },  // gap 2 from the floor — a tap clears this
    { x: 7, y: 28, w: 4 },  // gap 3
    { x: 10, y: 24, w: 4 },  // gap 4
    { x: 13, y: 19, w: 4 }, // gap 5
    { x: 18, y: 13, w: 2 }, // gap 6 — top ledge under the exit (near-max charge)
  ],
  overhangs: [],
  ladders: [],
  carrots: [
    { x: 4, y: 31 }, { x: 10, y: 24 }, { x: 15, y: 13 },
  ],
  spiders: [],
  bats: [],
  mice: [],
  torches: [{ x: 1, y: 30 }, { x: 20, y: 18 }, { x: 1, y: 10 }],
}

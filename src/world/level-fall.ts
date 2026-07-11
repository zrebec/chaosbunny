/**
 * PROTOTYPE level for the "falling bunny" experiment (proto/falling-bunny branch).
 *
 * Inverts the climb: the rabbit spawns near the ceiling and DESCENDS a shaft
 * toward its burrow (the `exit` at the bottom). Platforms are staggered left/right
 * so you must drift (←/→) and glide (hold Down = ears-brake) to aim each landing.
 * One `crumble` platform forces a quick "which way next?" decision.
 *
 * Deliberately minimal: no enemies, no ladders/overhangs. Carrots are the ears'
 * FUEL (each refills the glide reserve; collecting all opens the burrow). It exists
 * only to feel-test whether braking + choosing a landing direction is tense-but-fair.
 * Swap `main.ts` back to `./world/level.js` to compare against the real climb.
 *
 * Coordinates in tiles, y-down (row 0 = ceiling). Not covered by the reachability
 * linter (that guards the fixed climb in `level.ts`).
 */
import type { LevelData } from './room.js'

export const LEVEL_FALL: LevelData = {
  cols: 22,
  rows: 180, // floor at row 49

  spawn: { x: 11, y: 3 },              // top-centre — drops immediately into the shaft
  exit: { x: 8, y: 45, w: 6, h: 4 },   // the burrow at the bottom — reach it to win

  // Staggered descent: land, then drift to the next offset ledge below.
  platforms: [
    { x: 8, y: 9, w: 6 },                    // directly under spawn — first soft landing
    { x: 2, y: 25, w: 5 },                    // drift LEFT
    { x: 13, y: 31, w: 6, kind: 'crumble' },  // drift RIGHT — crumbles, decide fast
    { x: 5, y: 47, w: 6 },                    // drift LEFT
    { x: 14, y: 53, w: 5 },                    // drift RIGHT
    { x: 6, y: 69, w: 9 },                     // wide safe landing before the burrow
  ],

  overhangs: [],
  ladders: [],
  // Carrots float in the fall path (offset → drift to grab). They are the FUEL:
  // each one refills the ears' glide reserve, and collecting all opens the burrow.
  carrots: [
    { x: 11, y: 14 }, // straight under spawn — first easy refuel
    { x: 4, y: 22 },  // drift LEFT to refuel
    { x: 16, y: 30 }, // drift RIGHT
    { x: 6, y: 40 },  // drift LEFT, just above the burrow
  ],
  spiders: [],
  bats: [],
  mice: [],

  // A few wall torches for depth/atmosphere (light is off by default anyway).
  torches: [
    { x: 1, y: 12 }, { x: 20, y: 24 }, { x: 1, y: 36 },
  ],
}
/**
 * The hand-authored chaosBunny climb — a FIXED level (same every run), so it can
 * be learned and speedrun, the way Manic Miner and Jump King are. Tune it by hand:
 * all coordinates are in tiles, `y` down (row 0 = ceiling, the floor is the last
 * row). `level.tests.ts` proves the climb stays reachable after you tweak it.
 *
 * Rebuilt 2026-06-12 for the sidebar layout (docs/screen-redesign.sk.md): the
 * playfield is 22 columns (20 playable), a taller-feeling, narrower tower.
 * Centrepiece: the **long crawl** — platform 6 spans the whole width, entered
 * ONLY by ladder at its right end; a 13-tile crouch-gate forces a crawl to the
 * 2-tile stand-up zone on the far left, where the route reverses (hop up-left
 * to a tiny ledge, then back right across the gate's stone roof on a crumble
 * platform). You cannot jump over the gate (5-row cap) or onto platform 6
 * (it roofs platform 5 completely — no head clearance).
 */
import { C } from 'zx-kit'
import type { LevelData } from './room.js'

export const LEVEL: LevelData = {
  cols: 22,
  rows: 52, // floor at row 51

  spawn: { x: 3, y: 51 },
  exit: { x: 9, y: 1, w: 4, h: 6 }, // ceiling hole above the top platform

  // Depth strata — fake biomes (build-time tile inks; see LevelStratum). The
  // climb gets colder toward the moon: deep green cave → fungal mid-cave →
  // moon-touched frost. Mechanic tiles (crumble, overhang lip, ladder) keep
  // their global signal colours in every stratum.
  strata: [
    { fromRow: 0, stoneInk: C.B_WHITE, mossInk: C.B_CYAN },  // frost (platforms 8–11)
    { fromRow: 20, stoneInk: C.CYAN, mossInk: C.B_MAGENTA }, // fungal (platforms 4–7)
    { fromRow: 36 },                                         // deep cave — global theme
  ],

  // Zig-zag staircase, bottom → top (4-row steps = head clearance).
  platforms: [
    { x: 16, y: 47, w: 5 },   // 1
    { x: 2, y: 43, w: 15 },   // 2  (carries the small teaching crouch-gate)
    { x: 17, y: 39, w: 4 },  // 3 (4-row step from platform 2 — a 3-row step head-bonks)
    { x: 1, y: 35, w: 13 },   // 4 (reaches within 4 cols of platform 3 — jump reach limit)
    { x: 14, y: 31, w: 7 },  // 5  (the ladder up to the crawl starts here)
    { x: 3, y: 27, w: 18 },  // 6  THE CRAWL — full width minus 2; ladder-only entry
    { x: 1, y: 23, w: 2 },   // 7  tiny ledge above the crawl's stand-up zone
    { x: 6, y: 19, w: 5, kind: 'crumble' }, // 8 — crosses the gate's roof, crumbling!
    { x: 12, y: 15, w: 5 },  // 9
    { x: 6, y: 11, w: 5 },   // 10
    { x: 8, y: 7, w: 5 },    // 11 top ledge (under the exit)
  ],

  // Crouch-gates: bottom lip 3 rows above the platform (16px = crouch-only),
  // 5-row stone cap (too tall to jump over), narrower than the platform.
  overhangs: [
    // Small teaching gate over platform 2 (cols 9–14): crawl past the carrot.
    { x: 4, y: 39, w: 12, h: 2 },
    // THE LONG CRAWL over platform 6 (cols 3–20): gate spans cols 5–17, so you
    // climb the ladder into the right stand-up zone (18–20), crawl 13 tiles
    // left and surface in the 2-tile zone (3–4) at the far end.
    { x: 8, y: 20, w: 6, h: 5 },
  ],

  // The ONLY way onto the crawl platform: ladder from platform 5's right end
  // (platform 6 roofs platform 5 completely, so a jump head-bonks).
  ladders: [
    { x: 18, y: 27, h: 5 },
  ],

  carrots: [
    { x: 12, y: 43 }, // inside the teaching gate
    { x: 16, y: 31 }, // on platform 5, by the ladder
    { x: 10, y: 27 }, // mid-crawl — picked up on your belly
    { x: 7, y: 19 },  // on the crumble platform — grab it before it goes
    { x: 10, y: 7 },  // top ledge
  ],

  spiders: [
    { x: 13, y: 33 }, // guards the jump gap between platforms 4 and 5
    { x: 11, y: 13 }, // guards the jump gap between platforms 9 and 10
  ],

  bats: [
    { x: 10, y: 38, range: 3 },
    { x: 10, y: 17, range: 4 },
  ],

  mice: [
    { x: 9, y: 51, range: 5 },  // floor mouse by the spawn — teaches the stomp
    { x: 17, y: 39, range: 1 }, // patrols platform 3 (16px sprite — range 1 keeps it on the ledge)
  ],

  torches: [
    { x: 1, y: 46 }, { x: 20, y: 38 }, { x: 1, y: 34 }, { x: 20, y: 26 },
    { x: 1, y: 22 }, { x: 20, y: 14 }, { x: 1, y: 10 },
  ],
}

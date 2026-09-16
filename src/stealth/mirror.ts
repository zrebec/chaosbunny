/**
 * The cellar the other way round.
 *
 * Every room mirrored left to right: the same eighteen rooms, the same rules, the same
 * `par` — and a hand that knows the way through the real one is no use at all. A cellar
 * learned by heart is a cellar with no second night in it; this is the cheapest honest
 * way to give it one.
 *
 * **The par usually holds, and three times it does not.** Nothing in the *rules* knows
 * left from right — the sight cone is symmetric, a carrot flies and is heard the same
 * distance either way, light spreads in steps. But a fox walking to a noise picks
 * between two equally short ways in {@link DIRS} order (`patrol.ts`), and that tie-break
 * is not symmetric: mirrored, the fox can take the other way and arrive somewhere else.
 * Fifteen rooms come out at the same par; three do not ({@link MIRROR_PARS}). Every
 * mirrored par here was measured with the solver and `tests/stealth/mirror.tests.ts`
 * measures them again, the same way each room's own par is pinned.
 *
 * What did come out identical in all eighteen: the fairness number (`fewestSightings`)
 * and the verbs each room cannot be left without — so the nudge after three catches
 * tells a mirrored room's player the truth.
 *
 * It is done on the **source** — the text rows and the patrols — and handed back to
 * `parseRoom`, so a mirrored room passes exactly the checks a hand-written one does.
 *
 * Its records are its own ({@link MIRROR_SUFFIX} on the room's id): the mirrored cellar
 * is a second climb with its own medals and its own locks, and beating it takes nothing
 * away from the first.
 */
import type { Dir } from './grid.js'
import { ROOM_COLS, type PatrolSource, type RoomSource } from './room.js'

/** What a mirrored room's id ends with, so its records never mix with the real one's. */
export const MIRROR_SUFFIX = '~'

/**
 * The beats a mirrored room's best way out takes, where that is **not** the room's own
 * par. Measured with the solver (see the module note); a test recomputes every one of
 * them, so a changed room cannot leave a stale number here.
 */
export const MIRROR_PARS: Readonly<Record<string, number>> = {
  room02: 34,
  room03: 25,
  room05: 34,
}

/** Left and right swap; up and down are untouched by a left-to-right mirror. */
export function mirrorDir(dir: Dir): Dir {
  return dir === 'left' ? 'right' : dir === 'right' ? 'left' : dir
}

const mirrorX = (x: number): number => ROOM_COLS - 1 - x

function mirrorPatrol(p: PatrolSource): PatrolSource {
  return {
    ...p,
    route: p.route.map(([x, y]) => [mirrorX(x), y] as const),
    ...(p.facing ? { facing: mirrorDir(p.facing) } : {}),
    ...(p.turns ? { turns: p.turns.map(mirrorDir) } : {}),
  }
}

/** The same room, mirrored left to right, under its own id. */
export function mirrorSource(src: RoomSource): RoomSource {
  return {
    ...src,
    name: `${src.name}${MIRROR_SUFFIX}`,
    par: MIRROR_PARS[src.name] ?? src.par,
    rows: src.rows.map((row) => [...row].reverse().join('')),
    patrols: src.patrols.map(mirrorPatrol),
    ...(src.bats ? { bats: src.bats.map(([x, y]) => [mirrorX(x), y] as const) } : {}),
  }
}

/** Whether a room's id is a mirrored one. */
export function isMirrored(name: string): boolean {
  return name.endsWith(MIRROR_SUFFIX)
}

/**
 * What a room **wants** — the verb it cannot be left without.
 *
 * A player stuck in a room is usually not short of skill but short of an idea: he is
 * trying to walk a room that has to be waded, or keeping his ears up in a room built
 * on the dark. The cellar can say which verb is missing without saying a single step,
 * because the solver already knows: take a verb away and ask whether the room can
 * still be left. If it cannot, the room wants it.
 *
 * That is the whole trick, and it is the reason this is safe to show. A want is one
 * word. It names the tool, never the hand — which cell, which beat and which fox are
 * still entirely the player's to find, and there are as many wrong ways to use the
 * right verb as there ever were.
 *
 * Rooms declare their wants (`RoomSource.wants`) and `tests/stealth/wants.tests.ts`
 * holds every declaration to the solver, in both directions: a room may not claim a
 * want it does not have, and may not hide one it does.
 */
import { solve, type SolveOptions } from './solver.js'
import type { Room } from './room.js'

/** A verb a room can be built on. */
export type Want = 'dark' | 'carrot' | 'lampOut' | 'lever' | 'water'

/**
 * The ablation that proves each want: run the solver without the verb, and if there is
 * no way out, the room wants it.
 *
 * In the order a stuck player is best told them — the cheapest thought first. Lowering
 * the ears costs a beat and nothing else; getting wet costs two beats a cell and is the
 * last thing anyone tries. A room with several wants is nudged towards the first.
 */
export const WANT_ABLATIONS: ReadonlyArray<readonly [Want, SolveOptions]> = [
  ['dark', { ears: false }],
  ['carrot', { throws: false }],
  ['lampOut', { lamps: false }],
  ['lever', { levers: false }],
  ['water', { wade: false }],
]

/** Every want, in the order above — the order the nudge picks from. */
export const WANTS: readonly Want[] = WANT_ABLATIONS.map(([want]) => want)

/**
 * The verbs `room` cannot be left without, asked of the solver. Seconds of work for a
 * whole cellar, so the game never calls it: rooms declare what this returns and a test
 * keeps the declaration honest.
 */
export function wantsOf(room: Room): Want[] {
  return WANT_ABLATIONS.filter(([, options]) => solve(room, options) === null).map(([want]) => want)
}

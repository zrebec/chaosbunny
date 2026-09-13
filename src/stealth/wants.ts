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
import { beat, startWorld, type Action } from './beat.js'
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

/** The beats a plan actually spends — not its length, since a wade costs two. */
function beatsOf(room: Room, plan: readonly Action[]): number {
  let world = startWorld(room)
  for (const action of plan) world = beat(room, world, action).world
  return world.beats
}

/**
 * Whether the room has a **second way through at a different price**.
 *
 * A room that wants nothing is usually a room about timing, and the nudge says so. But
 * two of them are not: the wade and the fork each offer a way that is real and dearer,
 * and telling a player stuck on one of those that the room "wants only timing" is the
 * one thing the nudge is built never to do — say something untrue. So the same
 * ablations are asked a second question: is any of them still winnable, but for a
 * different number of beats? If so, the room is a choice, and that is what it says.
 *
 * `lampsOut` joins the list here though it is no want: "leave every lamp dark" is how
 * the fork's other way is priced, and without it the fork looks like a room with one
 * answer.
 */
export function offersChoice(room: Room): boolean {
  const best = solve(room)
  if (!best) return false
  const par = beatsOf(room, best)
  const options: SolveOptions[] = [...WANT_ABLATIONS.map(([, o]) => o), { lampsOut: true }]
  return options.some((o) => {
    const other = solve(room, o)
    return other !== null && beatsOf(room, other) !== par
  })
}

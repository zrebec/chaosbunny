/**
 * The hand on the shoulder, for the first two rooms only.
 *
 * A real player got stuck in the second room, and not for want of skill: he had the
 * rules and still could not start, because the room's whole lesson is a thing the
 * game never says out loud — **a `?` is a warning, not a capture.** He was trying to
 * cross it unseen, and it cannot be crossed unseen. No amount of nudging after three
 * catches helps somebody who has not yet been told what the game is.
 *
 * So rooms one and two show the next best move. Not a script: the solver is asked
 * from **where the player actually is** (`solver.ts`, `from`), so wandering off does
 * not break the advice — it just gets new advice. There is no way for it to be wrong,
 * because it is the same search that proved the room, and no way for it to be stale,
 * because it is recomputed from the world in hand.
 *
 * After room two it stops, and the cellar is his.
 *
 * **What it costs.** Following the advice costs **one** search for the whole room:
 * the plan is walked forward once and every world along it is remembered with the
 * move that leaves it. Only stepping off the plan pays for another search, and then
 * that new plan is remembered too. Rooms one and two are the two smallest in the
 * cellar, which is the other reason this is affordable exactly where it is wanted.
 */
import { beat, throwAt, type Action, type World } from './beat.js'
import { step, type Cell } from './grid.js'
import type { Room } from './room.js'
import { solve, worldKey } from './solver.js'

/** How many rooms hold the player's hand. Room three is where the cellar starts. */
export const GUIDED_ROOMS = 2

/** Whether the room at `index` (0-based, in play order) is one of the taught ones. */
export function isGuided(index: number): boolean {
  return index < GUIDED_ROOMS
}

/** The next best move, and the cell it points at. */
export interface Guidance {
  readonly action: Action
  /** Where to look: a step's destination, a carrot's landing. Null for the ears and for waiting. */
  readonly at: Cell | null
}

/**
 * Every world this room has been asked about, and the move that leaves it — or `null`
 * where there is no way out at all (a room played into a corner it cannot escape).
 * Per room, and dropped with the room, so a long session does not grow one of these
 * for every room ever entered.
 */
const PLANS = new WeakMap<Room, Map<string, Action | null>>()

function plansFor(room: Room): Map<string, Action | null> {
  let plans = PLANS.get(room)
  if (!plans) PLANS.set(room, (plans = new Map()))
  return plans
}

/** Where an action points, for the mark drawn on the floor. */
export function targetOf(room: Room, world: World, action: Action): Cell | null {
  if (action.kind === 'move') return step(world.randy.cell, action.dir)
  if (action.kind === 'throw') return throwAt(room, world.randy.cell, action.dir, world.lamps)?.at ?? null
  return null
}

/**
 * The move to make now, or `null` when the room can no longer be won from here —
 * which is itself worth saying nothing about, since the caught screen says it better.
 */
export function guide(room: Room, world: World): Guidance | null {
  const plans = plansFor(room)
  const key = worldKey(world)
  if (!plans.has(key)) {
    const plan = solve(room, {}, world)
    if (!plan) plans.set(key, null)
    else {
      // Remember the whole way, not just the first step: a player who follows the
      // advice then never pays for another search.
      let at = world
      for (const action of plan) {
        const k = worldKey(at)
        if (!plans.has(k)) plans.set(k, action)
        at = beat(room, at, action).world
      }
    }
  }
  const action = plans.get(key) ?? null
  return action ? { action, at: targetOf(room, world, action) } : null
}

/** Forgets what has been worked out for a room — for tests, which build many rooms. */
export function forgetPlans(room: Room): void {
  PLANS.delete(room)
}

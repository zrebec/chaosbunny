/**
 * How a fox moves, one beat at a time. Deterministic: the same room and the same
 * beats always produce the same fox, which is what lets a player read a patrol and
 * a solver prove a room.
 *
 * Modes:
 * - `patrol`     — walks its loop one cell a beat; faces the way it last stepped.
 *                  A sentry (a standing guard with `turns`) instead turns on the spot,
 *                  holding each facing for `hold` beats.
 * - `suspicious` — `?`: saw Randy last beat. Stands still. Seeing him again is `!`.
 * - `divert`     — heard a carrot land; walks the shortest way to it.
 * - `eat`        — on the carrot, blind, for {@link EAT_BEATS} beats.
 * - `return`     — walks back to the route cell it left, then patrols on.
 *
 * Whether a fox *sees* Randy is decided in `beat.ts` after every fox has moved; this
 * module only moves them.
 */
import { DIRS, cellKey, dirBetween, manhattan, sameCell, step, type Cell, type Dir } from './grid.js'
import { foxCanEnter, tileAt, type Room } from './room.js'

/** Beats a fox spends eating a carrot, blind, counting the beat it arrives. */
export const EAT_BEATS = 2
/** How far a landing carrot is heard — Manhattan distance, through walls. */
export const HEARING = 5

export type FoxMode = 'patrol' | 'suspicious' | 'divert' | 'eat' | 'return'

export interface Fox {
  /** Index into `room.patrols`. */
  readonly patrol: number
  readonly cell: Cell
  readonly facing: Dir
  /** The route cell the fox stands on — or, off the route, the one it will walk back to. */
  readonly routeIndex: number
  readonly mode: FoxMode
  /** What a `suspicious` fox goes back to when it stops seeing Randy. */
  readonly resume: FoxMode
  /** Eating beats left after this one. */
  readonly timer: number
  /** The carrot a diverting fox walks to. */
  readonly target: Cell | null
  /** A sentry's beats into its turning cycle; always 0 for a guard that does not turn. */
  readonly phase: number
}

export function initialFoxes(room: Room): Fox[] {
  return room.patrols.map((p, i) => ({
    patrol: i,
    cell: p.route[0]!,
    facing: p.facing,
    routeIndex: 0,
    mode: 'patrol',
    resume: 'patrol',
    timer: 0,
    target: null,
    phase: 0,
  }))
}

/**
 * Fox walking distances to `to` from every cell, by BFS backwards from the goal.
 * A room never changes, so each goal is searched once and kept — the solver asks
 * for the same few carrots and route cells millions of times.
 */
const distances = new WeakMap<Room, Map<string, ReadonlyMap<string, number>>>()

function distancesTo(room: Room, to: Cell): ReadonlyMap<string, number> {
  let perRoom = distances.get(room)
  if (!perRoom) distances.set(room, (perRoom = new Map()))
  const cached = perRoom.get(cellKey(to))
  if (cached) return cached
  const dist = new Map<string, number>([[cellKey(to), 0]])
  const queue: Cell[] = [to]
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head]!
    const d = dist.get(cellKey(c))!
    for (const dir of DIRS) {
      const n = step(c, dir)
      if (dist.has(cellKey(n)) || !foxCanEnter(tileAt(room, n))) continue
      dist.set(cellKey(n), d + 1)
      queue.push(n)
    }
  }
  perRoom.set(cellKey(to), dist)
  return dist
}

/**
 * The first cell of a shortest fox path from `from` to `to`, or `null` when `to`
 * cannot be reached (or `from` is already there). Ties break in {@link DIRS} order.
 */
export function nextStepToward(room: Room, from: Cell, to: Cell): Cell | null {
  if (sameCell(from, to) || !foxCanEnter(tileAt(room, to))) return null
  const dist = distancesTo(room, to)
  let best: Cell | null = null
  let bestDist = Infinity
  for (const dir of DIRS) {
    const n = step(from, dir)
    const d = dist.get(cellKey(n))
    if (d !== undefined && d < bestDist) {
      best = n
      bestDist = d
    }
  }
  return best
}

/**
 * Whether `fox` hears a noise at `noise`, and can get there. `range` is how far the
 * noise carries — a carrot landing carries {@link HEARING}, a creaking board less
 * (`beat.ts`). A fox that cannot walk to the noise ignores it: it has nowhere to look.
 */
export function hears(room: Room, fox: Fox, noise: Cell, range = HEARING): boolean {
  if (fox.mode !== 'patrol' && fox.mode !== 'return' && fox.mode !== 'suspicious') return false
  if (manhattan(fox.cell, noise) > range) return false
  return sameCell(fox.cell, noise) || nextStepToward(room, fox.cell, noise) !== null
}

/**
 * Sends `fox` to look at a noise. `listen` holds it still for the beat it hears —
 * a guard that stops, ears up, before it walks over. A carrot landing across the
 * room needs no such pause; a board creaking under Randy's own foot does, or the
 * fox would be on top of him before he could move (`beat.ts` promises two chances).
 */
export function divert(fox: Fox, noise: Cell, listen = false): Fox {
  return { ...fox, mode: 'divert', resume: 'divert', target: noise, timer: listen ? 1 : 0 }
}

function moveTo(fox: Fox, to: Cell): Fox {
  return { ...fox, cell: to, facing: dirBetween(fox.cell, to) ?? fox.facing }
}

function patrolStep(room: Room, fox: Fox): Fox {
  const patrol = room.patrols[fox.patrol]!
  const route = patrol.route
  if (patrol.turns) {
    // A sentry: one beat further round its cycle of facings, never a step.
    const phase = (fox.phase + 1) % (patrol.turns.length * patrol.hold)
    return { ...fox, mode: 'patrol', resume: 'patrol', phase, facing: patrol.turns[Math.floor(phase / patrol.hold)]! }
  }
  if (route.length === 1) return { ...fox, mode: 'patrol', resume: 'patrol', facing: patrol.facing }
  const next = (fox.routeIndex + 1) % route.length
  return { ...moveTo(fox, route[next]!), mode: 'patrol', resume: 'patrol', routeIndex: next }
}

function returnStep(room: Room, fox: Fox): Fox {
  const home = room.patrols[fox.patrol]!.route[fox.routeIndex]!
  if (sameCell(fox.cell, home)) return patrolStep(room, fox)
  const next = nextStepToward(room, fox.cell, home)
  // Home is on the fox's own route, so it is always reachable; staying put is only a guard.
  if (!next) return { ...fox, mode: 'return', resume: 'return' }
  const moved = moveTo(fox, next)
  return sameCell(next, home) ? { ...moved, mode: 'patrol', resume: 'patrol' } : { ...moved, mode: 'return', resume: 'return' }
}

function startEating(fox: Fox): { fox: Fox; ate: Cell } {
  return { fox: { ...fox, mode: 'eat', resume: 'eat', timer: EAT_BEATS - 1, target: null }, ate: fox.cell }
}

const carrotAt = (items: readonly Cell[], c: Cell): boolean => items.some((i) => sameCell(i, c))

/**
 * Moves one fox one beat. `items` are the carrots on the floor; `ate` reports the
 * one this fox started eating, which the caller removes.
 */
export function advanceFox(room: Room, fox: Fox, items: readonly Cell[]): { fox: Fox; ate: Cell | null } {
  switch (fox.mode) {
    case 'patrol':
      return { fox: patrolStep(room, fox), ate: null }
    case 'suspicious':
      return { fox, ate: null }
    case 'eat':
      if (fox.timer > 0) return { fox: { ...fox, timer: fox.timer - 1 }, ate: null }
      return { fox: returnStep(room, fox), ate: null }
    case 'return':
      return { fox: returnStep(room, fox), ate: null }
    case 'divert': {
      // Listening: the beat it heard, a fox stands still with its ears up.
      if (fox.timer > 0) return { fox: { ...fox, timer: fox.timer - 1 }, ate: null }
      const target = fox.target
      // Standing on it already — the carrot landed on the fox: eat, or this beat's move is home.
      if (!target || sameCell(fox.cell, target)) {
        if (target && carrotAt(items, target)) return startEating(fox)
        return { fox: returnStep(room, { ...fox, target: null }), ate: null }
      }
      const next = nextStepToward(room, fox.cell, target)
      if (!next) return { fox: returnStep(room, { ...fox, target: null }), ate: null }
      const moved = moveTo(fox, next)
      if (!sameCell(next, target)) return { fox: moved, ate: null }
      // Arrived this beat. Eat if the carrot is still here; if Randy took it, turn for home next beat.
      if (carrotAt(items, next)) return startEating(moved)
      return { fox: { ...moved, mode: 'return', resume: 'return', target: null }, ate: null }
    }
  }
}

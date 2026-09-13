/**
 * Bats: they cannot see, they hear.
 *
 * A bat roosts over a cell and listens. A step Randy takes with his ears up is a
 * sound where he lands; so is a carrot hitting the floor. A bat within
 * {@link BAT_HEARING} of a sound — counted straight through walls, sound carries —
 * flies to it at {@link BAT_SPEED} cells a beat, over crates but never through
 * walls, circles there for {@link BAT_CIRCLE_BEATS} beats, and flies home to roost.
 * A newer sound always wins: a bat chases the last thing it heard.
 *
 * Steps with the ears down are silent, and so are waiting and moving the ears.
 * That is the bat's whole lesson: near one, creep — and creeping is a dribble of
 * two steps, and putting the ears up to start another shows Randy to every fox.
 *
 * A bat that flies through Randy's cell, or that Randy walks into, has him. It has
 * no cone; nothing about sight applies to it.
 */
import { DIRS, cellKey, manhattan, sameCell, step, type Cell } from './grid.js'
import { tileAt, type Room, type TileKind } from './room.js'

export const BAT_HEARING = 4
export const BAT_SPEED = 2
export const BAT_CIRCLE_BEATS = 2

export type BatMode = 'roost' | 'fly' | 'circle' | 'home'

export interface Bat {
  /** Index into `room.bats` — its roost. */
  readonly roost: number
  readonly cell: Cell
  readonly mode: BatMode
  /** The sound it is flying to or circling. */
  readonly target: Cell | null
  /** Circling beats left after this one. */
  readonly timer: number
}

/** A bat flies over floor, shadow and crates; walls and doors stop it. */
export function batCanFly(kind: TileKind): boolean {
  return kind === 'floor' || kind === 'shadow' || kind === 'cover'
}

export function initialBats(room: Room): Bat[] {
  return room.bats.map((cell, i) => ({ roost: i, cell, mode: 'roost', target: null, timer: 0 }))
}

/** Whether `bat` hears a sound at `noise`. */
export function batHears(bat: Bat, noise: Cell): boolean {
  return manhattan(bat.cell, noise) <= BAT_HEARING
}

export function flyTo(bat: Bat, noise: Cell): Bat {
  return { ...bat, mode: 'fly', target: noise, timer: 0 }
}

const flyDistances = new WeakMap<Room, Map<string, ReadonlyMap<string, number>>>()

/** Flying distances to `to` from every cell, searched once per room and goal. */
function distancesTo(room: Room, to: Cell): ReadonlyMap<string, number> {
  let perRoom = flyDistances.get(room)
  if (!perRoom) flyDistances.set(room, (perRoom = new Map()))
  const cached = perRoom.get(cellKey(to))
  if (cached) return cached
  const dist = new Map<string, number>([[cellKey(to), 0]])
  const queue: Cell[] = [to]
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head]!
    const d = dist.get(cellKey(c))!
    for (const dir of DIRS) {
      const n = step(c, dir)
      if (dist.has(cellKey(n)) || !batCanFly(tileAt(room, n))) continue
      dist.set(cellKey(n), d + 1)
      queue.push(n)
    }
  }
  perRoom.set(cellKey(to), dist)
  return dist
}

/** Up to `steps` cells of a shortest flight from `from` to `to`, ties broken in DIRS order. */
export function flightPath(room: Room, from: Cell, to: Cell, steps: number): Cell[] {
  const dist = distancesTo(room, to)
  if (!dist.has(cellKey(from))) return []
  const path: Cell[] = []
  let at = from
  while (path.length < steps && !sameCell(at, to)) {
    const here = dist.get(cellKey(at))!
    const next = DIRS.map((d) => step(at, d)).find((n) => dist.get(cellKey(n)) === here - 1)
    if (!next) break
    path.push(next)
    at = next
  }
  return path
}

/** Moves one bat one beat. `path` is every cell it entered, for contact checks. */
export function advanceBat(room: Room, bat: Bat): { bat: Bat; path: Cell[] } {
  switch (bat.mode) {
    case 'roost':
      return { bat, path: [] }
    case 'circle':
      if (bat.timer > 0) return { bat: { ...bat, timer: bat.timer - 1 }, path: [] }
      return advanceBat(room, { ...bat, mode: 'home', target: null })
    case 'fly':
    case 'home': {
      const goal = bat.mode === 'fly' ? bat.target! : room.bats[bat.roost]!
      const path = flightPath(room, bat.cell, goal, BAT_SPEED)
      const cell = path.at(-1) ?? bat.cell
      if (!sameCell(cell, goal)) {
        // No way there (a sound behind a wall with no gap): give up and go home.
        if (path.length === 0) return bat.mode === 'fly' ? advanceBat(room, { ...bat, mode: 'home', target: null }) : { bat, path }
        return { bat: { ...bat, cell }, path }
      }
      if (bat.mode === 'home') return { bat: { ...bat, cell, mode: 'roost', target: null, timer: 0 }, path }
      return { bat: { ...bat, cell, mode: 'circle', timer: BAT_CIRCLE_BEATS - 1 }, path }
    }
  }
}

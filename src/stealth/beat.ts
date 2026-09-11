/**
 * One beat of the tile-stealth prototype. Every beat resolves in the same order,
 * and the order is the rulebook:
 *
 * 1. **Randy acts** — a step, a throw, ears up/down, or waiting. A step into a wall
 *    or a throw with nowhere to land costs nothing (`blocked`). With his ears down
 *    Randy may take only {@link SNEAK_STEPS} steps — like a dribble, then he must
 *    put them up (which resets the count) before he can move again; standing still
 *    with them down is free. A step onto a door wins at once; a step into a fox is
 *    being caught.
 * 2. **Noise** — a carrot that landed this beat diverts every fox that hears it.
 * 3. **Foxes move**, each by its mode (`patrol.ts`).
 * 4. **Contact** — a fox that walks onto Randy's cell catches him.
 * 5. **Sight** — a fox that sees Randy right in front, or sees him for the second
 *    beat in a row, catches him (`!`). Seen once from further away: `?`, and the
 *    fox stops for a beat. Not seen while `?`: it calms down and carries on.
 *
 * Pure and deterministic — the scene animates what this returns, the solver
 * searches it, the tests pin it.
 */
import { sameCell, step, type Cell, type Dir } from './grid.js'
import { advanceFox, divert, hears, initialFoxes, type Fox } from './patrol.js'
import { randyCanEnter, tileAt, type Room } from './room.js'
import { spots } from './rules.js'

/** How far a carrot flies. It stops short of walls and cover, and passes over foxes. */
export const THROW_RANGE = 3

/**
 * Steps Randy may take with his ears down before he has to put them up. Hiding
 * in place costs nothing; creeping costs this. 0 would make ears-down a freeze,
 * and dark corridors impassable — measured with the solver before choosing 2.
 */
export const SNEAK_STEPS = 2

export type Action =
  | { readonly kind: 'move'; readonly dir: Dir }
  | { readonly kind: 'throw'; readonly dir: Dir }
  | { readonly kind: 'ears' }
  | { readonly kind: 'wait' }

export interface Randy {
  readonly cell: Cell
  readonly earsDown: boolean
  readonly carrots: number
  /** Steps left before the ears have to come up. Refilled each time they change. */
  readonly sneakLeft: number
}

export interface World {
  readonly randy: Randy
  readonly foxes: readonly Fox[]
  /** Carrots on the floor: the room's own and any thrown one not yet eaten. */
  readonly items: readonly Cell[]
  readonly beats: number
}

export type Outcome = 'ok' | 'blocked' | 'caught' | 'won'

export type BeatEvent =
  | { readonly type: 'step' }
  | { readonly type: 'wait' }
  | { readonly type: 'ears'; readonly down: boolean }
  | { readonly type: 'throw'; readonly from: Cell; readonly to: Cell }
  | { readonly type: 'pickup'; readonly at: Cell }
  | { readonly type: 'heard'; readonly fox: number }
  | { readonly type: 'eat'; readonly fox: number; readonly at: Cell }
  | { readonly type: 'suspicious'; readonly fox: number }
  | { readonly type: 'calm'; readonly fox: number }
  | { readonly type: 'caught'; readonly fox: number; readonly why: 'seen' | 'bumped' }
  | { readonly type: 'won' }

export interface BeatResult {
  readonly world: World
  readonly outcome: Outcome
  readonly events: readonly BeatEvent[]
}

export function startWorld(room: Room): World {
  return {
    randy: { cell: room.spawn, earsDown: false, carrots: room.carrots, sneakLeft: SNEAK_STEPS },
    foxes: initialFoxes(room),
    items: room.pickups,
    beats: 0,
  }
}

/** Where a carrot thrown from `from` towards `dir` lands, or `null` if the first cell is blocked. */
export function throwTarget(room: Room, from: Cell, dir: Dir): Cell | null {
  let land: Cell | null = null
  for (let k = 1; k <= THROW_RANGE; k++) {
    const c = step(from, dir, k)
    const kind = tileAt(room, c)
    if (kind === 'wall' || kind === 'cover') break
    land = c
  }
  return land
}

function without(items: readonly Cell[], at: Cell): Cell[] {
  const i = items.findIndex((c) => sameCell(c, at))
  return i < 0 ? [...items] : [...items.slice(0, i), ...items.slice(i + 1)]
}

/** Resolves one beat. A `blocked` result returns the world unchanged. */
export function beat(room: Room, world: World, action: Action): BeatResult {
  const events: BeatEvent[] = []
  let randy = world.randy
  let items: readonly Cell[] = world.items
  let noise: Cell | null = null
  const from = randy.cell
  const done = (outcome: Outcome, foxes: readonly Fox[] = world.foxes): BeatResult => ({
    world: { randy, foxes, items, beats: world.beats + 1 },
    outcome,
    events,
  })

  // 1. Randy acts.
  switch (action.kind) {
    case 'move': {
      const to = step(from, action.dir)
      if (!randyCanEnter(tileAt(room, to))) return { world, outcome: 'blocked', events: [] }
      if (randy.earsDown && randy.sneakLeft <= 0) return { world, outcome: 'blocked', events: [] }
      randy = { ...randy, cell: to, sneakLeft: randy.earsDown ? randy.sneakLeft - 1 : randy.sneakLeft }
      events.push({ type: 'step' })
      const bumped = world.foxes.findIndex((f) => sameCell(f.cell, to))
      if (bumped >= 0) {
        events.push({ type: 'caught', fox: bumped, why: 'bumped' })
        return done('caught')
      }
      if (items.some((c) => sameCell(c, to))) {
        items = without(items, to)
        randy = { ...randy, carrots: randy.carrots + 1 }
        events.push({ type: 'pickup', at: to })
      }
      if (tileAt(room, to) === 'door') {
        events.push({ type: 'won' })
        return done('won')
      }
      break
    }
    case 'throw': {
      const to = randy.carrots > 0 ? throwTarget(room, from, action.dir) : null
      if (!to) return { world, outcome: 'blocked', events: [] }
      randy = { ...randy, carrots: randy.carrots - 1 }
      items = [...items, to]
      noise = to
      events.push({ type: 'throw', from, to })
      break
    }
    case 'ears':
      randy = { ...randy, earsDown: !randy.earsDown, sneakLeft: SNEAK_STEPS }
      events.push({ type: 'ears', down: randy.earsDown })
      break
    case 'wait':
      events.push({ type: 'wait' })
      break
  }

  // 2. Noise.
  let foxes: Fox[] = world.foxes.map((f, i) => {
    if (!noise || !hears(room, f, noise)) return f
    events.push({ type: 'heard', fox: i })
    return divert(f, noise)
  })

  // 3. Foxes move.
  foxes = foxes.map((f, i) => {
    const r = advanceFox(room, f, items)
    if (r.ate) {
      items = without(items, r.ate)
      events.push({ type: 'eat', fox: i, at: r.ate })
    }
    return r.fox
  })

  // 4. Contact. (Randy and a fox cannot swap cells: stepping into a fox was caught in 1.)
  const bumper = foxes.findIndex((f) => sameCell(f.cell, randy.cell))
  if (bumper >= 0) {
    events.push({ type: 'caught', fox: bumper, why: 'bumped' })
    return done('caught', foxes)
  }

  // 5. Sight.
  for (let i = 0; i < foxes.length; i++) {
    const f = foxes[i]!
    if (f.mode === 'eat') continue
    const seen = spots(room, f.cell, f.facing, randy.cell, randy.earsDown)
    if (!seen) {
      if (f.mode === 'suspicious') {
        foxes[i] = { ...f, mode: f.resume }
        events.push({ type: 'calm', fox: i })
      }
      continue
    }
    if (f.mode === 'suspicious' || (seen.forward === 1 && seen.lateral === 0)) {
      events.push({ type: 'caught', fox: i, why: 'seen' })
      return done('caught', foxes)
    }
    foxes[i] = { ...f, mode: 'suspicious', resume: f.mode }
    events.push({ type: 'suspicious', fox: i })
  }

  return done('ok', foxes)
}

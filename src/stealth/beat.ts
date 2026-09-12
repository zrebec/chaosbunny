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
 *    Bats (`bat.ts`) hear more: the carrot, and any step Randy took with his ears up.
 *    A **creaking board** under Randy's foot is a noise too, ears up or down, but a
 *    quiet one — it carries {@link CREAK_HEARING} cells, not the carrot's five, and
 *    whoever comes finds nothing. **Pulling the lever** — stepping onto it — works
 *    every grate in the room and is the loudest thing Randy can do: iron on iron,
 *    heard as far as a carrot, and it opens the way for as long as he leaves it.
 *    A carrot thrown at a lamp (`light.ts`) puts it out instead of landing: the
 *    carrot is gone, the crash is heard from the foot of the lamp, and whoever comes
 *    to look finds nothing there — a shorter distraction, bought with the dark.
 * 3. **Foxes move**, each by its mode (`patrol.ts`); then bats fly.
 * 4. **Contact** — a fox that walks onto Randy's cell catches him; so does a bat
 *    that flies through it, or that Randy walks into.
 * 5. **Sight** — a fox that sees Randy right in front, or sees him for the second
 *    beat in a row, catches him (`!`). Seen once from further away: `?`, and the
 *    fox stops for a beat. Not seen while `?`: it calms down and carries on.
 *
 * Pure and deterministic — the scene animates what this returns, the solver
 * searches it, the tests pin it.
 */
import { advanceBat, batHears, flyTo, initialBats, type Bat } from './bat.js'
import { sameCell, step, type Cell, type Dir } from './grid.js'
import { allLampsOn, lampOn, litCells } from './light.js'
import { advanceFox, divert, hears, initialFoxes, type Fox } from './patrol.js'
import { randyCanStep, tileAt, type Room } from './room.js'
import { spots } from './rules.js'

/** How far a carrot flies. It stops short of walls and cover, and passes over foxes. */
export const THROW_RANGE = 3

/**
 * Steps Randy may take with his ears down before he has to put them up. Hiding
 * in place costs nothing; creeping costs this. 0 would make ears-down a freeze,
 * and dark corridors impassable — measured with the solver before choosing 2.
 */
export const SNEAK_STEPS = 2

/**
 * How far a creaking board carries — Manhattan, through walls, like every other
 * noise. Shorter than a carrot's {@link HEARING}: a board gives away where you are
 * to whoever is near, not to the whole cellar.
 */
export const CREAK_HEARING = 3

/**
 * Beats a step into water costs. The clock counts two, and so does the world: everything
 * else takes two turns while Randy pulls his feet out. A fox will not follow him in, so
 * water is safety bought with time — the first rule here that answers "what is this
 * route worth" rather than "can they see or hear me".
 */
export const WADE_BEATS = 2

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
  readonly bats: readonly Bat[]
  /** Carrots on the floor: the room's own and any thrown one not yet eaten. */
  readonly items: readonly Cell[]
  /** Which of `room.lamps` are still burning — one bit each (`light.ts`). */
  readonly lamps: number
  /** Whether the lever has been pulled: every grate in the room is open while it is. */
  readonly pulled: boolean
  readonly beats: number
}

export type Outcome = 'ok' | 'blocked' | 'caught' | 'won'

export type BeatEvent =
  | { readonly type: 'step' }
  | { readonly type: 'wait' }
  | { readonly type: 'ears'; readonly down: boolean }
  | { readonly type: 'throw'; readonly from: Cell; readonly to: Cell }
  | { readonly type: 'pickup'; readonly at: Cell }
  | { readonly type: 'creak'; readonly at: Cell }
  | { readonly type: 'lever'; readonly at: Cell; readonly open: boolean }
  | { readonly type: 'heard'; readonly fox: number }
  | { readonly type: 'eat'; readonly fox: number; readonly at: Cell }
  | { readonly type: 'suspicious'; readonly fox: number }
  | { readonly type: 'calm'; readonly fox: number }
  | { readonly type: 'caught'; readonly fox: number; readonly why: 'seen' | 'bumped' }
  | { readonly type: 'lampOut'; readonly lamp: number; readonly at: Cell }
  | { readonly type: 'batHeard'; readonly bat: number }
  | { readonly type: 'bitten'; readonly bat: number }
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
    bats: initialBats(room),
    items: room.pickups,
    lamps: allLampsOn(room),
    pulled: false,
    beats: 0,
  }
}

/** What a thrown carrot meets: an empty cell to land on, or a burning lamp to put out. */
export type Throw =
  | { readonly kind: 'land'; readonly at: Cell }
  | { readonly kind: 'lamp'; readonly at: Cell; readonly lamp: number; readonly noise: Cell }

/**
 * What a carrot thrown from `from` towards `dir` does, or `null` if it has nowhere
 * to go. It flies over foxes and stops short of walls and cover. A **burning** lamp
 * in its way is hit — it goes out, and the carrot is lost at the lamp's foot, which
 * is where the crash is heard from (the cell before it, or Randy's own if he is
 * right against it). A lamp already out is just a post: it blocks like cover.
 */
export function throwAt(room: Room, from: Cell, dir: Dir, lamps: number): Throw | null {
  let land: Cell | null = null
  for (let k = 1; k <= THROW_RANGE; k++) {
    const c = step(from, dir, k)
    const kind = tileAt(room, c)
    if (kind === 'lamp') {
      const lamp = room.lamps.findIndex((l) => sameCell(l, c))
      if (lamp >= 0 && lampOn(lamps, lamp)) return { kind: 'lamp', at: c, lamp, noise: land ?? from }
      break
    }
    if (kind === 'wall' || kind === 'cover') break
    land = c
  }
  return land ? { kind: 'land', at: land } : null
}

/** Where a carrot lands, ignoring lamps — the simple question, for rooms that have none. */
export function throwTarget(room: Room, from: Cell, dir: Dir): Cell | null {
  const t = throwAt(room, from, dir, 0)
  return t?.kind === 'land' ? t.at : null
}

function without(items: readonly Cell[], at: Cell): Cell[] {
  const i = items.findIndex((c) => sameCell(c, at))
  return i < 0 ? [...items] : [...items.slice(0, i), ...items.slice(i + 1)]
}

/**
 * The world's half of a beat: every fox takes its step, every bat its flight, then
 * contact and sight are settled. It is a function of its own because **water makes it
 * happen twice** for one step of Randy's — wading is slow, and slow in a beat game can
 * only mean that everyone else moves while you are still pulling your feet out.
 */
function turn(
  room: Room,
  randy: Randy,
  before: readonly Fox[],
  batsBefore: readonly Bat[],
  itemsBefore: readonly Cell[],
  lamps: number,
): { foxes: Fox[]; bats: Bat[]; items: readonly Cell[]; events: BeatEvent[]; caught: boolean } {
  const events: BeatEvent[] = []
  let items = itemsBefore

  const foxes = before.map((f, i) => {
    const r = advanceFox(room, f, items)
    if (r.ate) {
      items = without(items, r.ate)
      events.push({ type: 'eat', fox: i, at: r.ate })
    }
    return r.fox
  })
  const paths: Cell[][] = []
  const bats = batsBefore.map((b) => {
    const r = advanceBat(room, b)
    paths.push(r.path)
    return r.bat
  })

  // Contact. (Randy and a fox cannot swap cells: stepping into a fox was caught already.)
  const bumper = foxes.findIndex((f) => sameCell(f.cell, randy.cell))
  if (bumper >= 0) {
    events.push({ type: 'caught', fox: bumper, why: 'bumped' })
    return { foxes, bats, items, events, caught: true }
  }
  const biter = paths.findIndex((path) => path.some((c) => sameCell(c, randy.cell)))
  if (biter >= 0) {
    events.push({ type: 'bitten', bat: biter })
    return { foxes, bats, items, events, caught: true }
  }

  // Sight. A lamp put out this beat is already dark for it.
  const lit = litCells(room, lamps)
  for (let i = 0; i < foxes.length; i++) {
    const f = foxes[i]!
    if (f.mode === 'eat') continue
    const seen = spots(room, f.cell, f.facing, randy.cell, randy.earsDown, lit)
    if (!seen) {
      if (f.mode === 'suspicious') {
        foxes[i] = { ...f, mode: f.resume }
        events.push({ type: 'calm', fox: i })
      }
      continue
    }
    if (f.mode === 'suspicious' || (seen.forward === 1 && seen.lateral === 0)) {
      events.push({ type: 'caught', fox: i, why: 'seen' })
      return { foxes, bats, items, events, caught: true }
    }
    foxes[i] = { ...f, mode: 'suspicious', resume: f.mode }
    events.push({ type: 'suspicious', fox: i })
  }
  return { foxes, bats, items, events, caught: false }
}

/** Resolves one beat. A `blocked` result returns the world unchanged. */
export function beat(room: Room, world: World, action: Action): BeatResult {
  const events: BeatEvent[] = []
  let randy = world.randy
  let items: readonly Cell[] = world.items
  let lamps = world.lamps
  let pulled = world.pulled
  let noise: Cell | null = null
  const from = randy.cell
  let stepNoise: Cell | null = null
  let creak: Cell | null = null
  /** A step into water costs the world two turns, and the clock two beats. */
  let wading = false
  const done = (outcome: Outcome, foxes: readonly Fox[] = world.foxes, bats: readonly Bat[] = world.bats): BeatResult => ({
    world: { randy, foxes, bats, items, lamps, pulled, beats: world.beats + (wading ? WADE_BEATS : 1) },
    outcome,
    events,
  })

  // 1. Randy acts.
  switch (action.kind) {
    case 'move': {
      const to = step(from, action.dir)
      if (!randyCanStep(tileAt(room, to), pulled)) return { world, outcome: 'blocked', events: [] }
      if (randy.earsDown && randy.sneakLeft <= 0) return { world, outcome: 'blocked', events: [] }
      randy = { ...randy, cell: to, sneakLeft: randy.earsDown ? randy.sneakLeft - 1 : randy.sneakLeft }
      events.push({ type: 'step' })
      const bumped = world.foxes.findIndex((f) => sameCell(f.cell, to))
      if (bumped >= 0) {
        events.push({ type: 'caught', fox: bumped, why: 'bumped' })
        return done('caught')
      }
      const batAt = world.bats.findIndex((b) => sameCell(b.cell, to))
      if (batAt >= 0) {
        events.push({ type: 'bitten', bat: batAt })
        return done('caught')
      }
      if (!randy.earsDown) stepNoise = to
      if (tileAt(room, to) === 'water') wading = true
      if (tileAt(room, to) === 'board') {
        creak = to
        events.push({ type: 'creak', at: to })
      }
      if (tileAt(room, to) === 'lever') {
        pulled = !pulled
        noise = to // iron on iron: as loud as a carrot, and right where he stands
        events.push({ type: 'lever', at: to, open: pulled })
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
      const shot = randy.carrots > 0 ? throwAt(room, from, action.dir, lamps) : null
      if (!shot) return { world, outcome: 'blocked', events: [] }
      randy = { ...randy, carrots: randy.carrots - 1 }
      events.push({ type: 'throw', from, to: shot.at })
      if (shot.kind === 'lamp') {
        lamps &= ~(1 << shot.lamp)
        noise = shot.noise
        events.push({ type: 'lampOut', lamp: shot.lamp, at: shot.at })
      } else {
        items = [...items, shot.at]
        noise = shot.at
      }
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

  // 2. Noise. Foxes hear a carrot landing, and a board creaking from closer;
  // bats hear all of that and an ears-up step as well.
  const foxNoise = noise ?? creak
  const foxRange = noise ? undefined : CREAK_HEARING
  const underfoot = creak !== null || events.some((e) => e.type === 'lever')
  let foxes: Fox[] = world.foxes.map((f, i) => {
    if (!foxNoise || !hears(room, f, foxNoise, foxRange)) return f
    events.push({ type: 'heard', fox: i })
    return divert(f, foxNoise, underfoot) // a noise under Randy's own foot: the fox listens first
  })
  const sound = noise ?? creak ?? stepNoise
  let bats: Bat[] = world.bats.map((b, i) => {
    if (!sound || !batHears(b, sound)) return b
    events.push({ type: 'batHeard', bat: i })
    return flyTo(b, sound)
  })

  // 3-5, once — or twice, when the step went into water. See `turn` above.
  const first = turn(room, randy, foxes, bats, items, lamps)
  foxes = first.foxes
  bats = first.bats
  items = first.items
  events.push(...first.events)
  if (first.caught) return done('caught', foxes, bats)

  if (wading) {
    // Wading takes the world two beats: everything moves again while Randy is still
    // pulling his feet out. No new noise — the splash was the step.
    const second = turn(room, randy, foxes, bats, items, lamps)
    foxes = second.foxes
    bats = second.bats
    items = second.items
    events.push(...second.events)
    if (second.caught) return done('caught', foxes, bats)
  }

  return done('ok', foxes, bats)
}

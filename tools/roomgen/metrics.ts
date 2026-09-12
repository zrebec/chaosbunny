/**
 * What the solver can say about a room without giving it away.
 *
 * Every number here is an **ablation**: take one thing out of the room and see what
 * the solver makes of what is left. A room earns its place when its new thing is the
 * reason the room is hard — not because the layout looked good.
 *
 * **Never print a way through.** `solve()` returns an action list; nothing in this
 * file may put one on screen, in a file, or in a commit message.
 */
import { beat, startWorld, type Action } from '../../src/stealth/beat.js'
import { parseRoom, type Room, type RoomSource } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'

export interface Marks {
  readonly name: string
  /** The fewest beats out, or `null` if there is no way out. */
  readonly par: number | null
  /** How often the most careful player is noticed. */
  readonly fewest: number | null
  /** Par with the ears kept up, with no throwing, with every lamp left burning. */
  readonly noEars: number | null
  readonly noThrow: number | null
  readonly lampsOn: number | null
  /** Par counting only ways out that leave every lamp dark — the other half of the plan. */
  readonly dark: number | null
  /** Par for a Randy who refuses to get his feet wet, or `null` if the room will not have it. */
  readonly dry: number | null
  /** Water cells in the room — `dry` means nothing without them. */
  readonly water: number
  /** Lamps in the room — `lampsOn` means nothing without it. */
  readonly lamps: number
  /** How long the marking took, in ms — the search's own budget depends on it. */
  readonly ms: number
}

/**
 * Beats, not actions. They were the same number until water arrived — a step into it
 * costs two — and it is beats the game counts, so it is beats a room's par must mean.
 */
function beatsOf(room: Room, actions: readonly Action[]): number {
  let world = startWorld(room)
  for (const action of actions) {
    const r = beat(room, world, action)
    if (r.outcome === 'blocked') continue
    world = r.world
  }
  return world.beats
}

const par = (room: Room, options: Parameters<typeof solve>[1]): number | null => {
  const best = solve(room, options)
  return best === null ? null : beatsOf(room, best)
}

/** Marks one room, or `null` if it does not parse or the search runs away. */
export function mark(src: RoomSource, maxStates = 120_000): Marks | null {
  let room: Room
  try {
    room = parseRoom(src)
  } catch {
    return null
  }
  const t0 = Date.now()
  try {
    const best = par(room, { maxStates })
    if (best === null) {
      return { name: src.name, par: null, fewest: null, noEars: null, noThrow: null, lampsOn: null, dark: null, dry: null, water: 0, lamps: room.lamps.length, ms: Date.now() - t0 }
    }
    const hasCarrot = room.carrots + room.pickups.length > 0
    return {
      name: src.name,
      par: best,
      fewest: fewestSightings(room, { maxStates }),
      noEars: par(room, { ears: false, maxStates }),
      noThrow: hasCarrot ? par(room, { throws: false, maxStates }) : null,
      lampsOn: room.lamps.length ? par(room, { lamps: false, maxStates }) : null,
      dark: room.lamps.length ? par(room, { lampsOut: true, maxStates }) : null,
      dry: src.rows.join('').includes('w') ? par(room, { wade: false, maxStates }) : null,
      water: src.rows.join('').split('w').length - 1,
      lamps: room.lamps.length,
      ms: Date.now() - t0,
    }
  } catch {
    return null // over `maxStates`: too open a room to design with
  }
}

const n = (v: number | null): string => (v === null ? 'NONE' : String(v))

/** One line of marks, for a search's report. */
export function line(m: Marks): string {
  return `${m.name}: par ${n(m.par)} | fewest? ${n(m.fewest)} | noEars ${n(m.noEars)} | noThrow ${n(m.noThrow)}`
    + `${m.lamps ? ` | lampsOn ${n(m.lampsOn)} | dark ${n(m.dark)}` : ''}`
    + `${m.water ? ` | dry ${n(m.dry)}` : ''} | ${m.ms} ms`
}

/** The room as text, with its guards — enough to paste into `src/stealth/rooms/`. */
export function sheet(src: RoomSource, m: Marks): string {
  return [
    line(m),
    `patrols ${JSON.stringify(src.patrols)} carrots ${src.carrots ?? 0}${src.bats?.length ? ` bats ${JSON.stringify(src.bats)}` : ''}`,
    ...src.rows,
  ].join('\n')
}

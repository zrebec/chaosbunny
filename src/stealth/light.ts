/**
 * Lamps, and what a lamp lights.
 *
 * One rule, and it is the whole mechanic: **light kills shadow.** A shadow cell
 * under a lit lamp hides nobody — ears down or not — so a room with a lamp asks a
 * question the earlier rooms could not: the dark way through is there, but it is lit.
 *
 * A lamp is put out by throwing a carrot at it (`beat.ts`). That costs the carrot,
 * and the crash is a noise at the lamp — everything that can hear comes to look. So
 * the lamp is not a switch, it is a **choice**: the carrot distracts a fox, or it
 * buys the dark, never both.
 *
 * Reach is counted in steps, not in a straight line: light spreads from the lamp
 * through anything that is not a wall — over a crate, around a doorway — up to
 * {@link LAMP_REACH} steps. That is a rule a player can count on their fingers,
 * which is the same reason the sight cone is a table and not a ray.
 */
import { DIRS, step, type Cell } from './grid.js'
import { passesLight, tileAt, type Room } from './room.js'

/** How many steps a lamp's light spreads. */
export const LAMP_REACH = 3

/** A cell's place in the room's row-major grid — how a lit cell is named in a set. */
export function cellIndex(room: Pick<Room, 'cols'>, c: Cell): number {
  return c.y * room.cols + c.x
}

/** Whether lamp `i` is still burning, in a `World.lamps` mask. */
export function lampOn(mask: number, i: number): boolean {
  return (mask & (1 << i)) !== 0
}

/** Every lamp burning: the mask a room starts with. */
export function allLampsOn(room: Room): number {
  return (1 << room.lamps.length) - 1
}

function spread(room: Room, lamp: Cell, out: Set<number>): void {
  let front: Cell[] = [lamp]
  const seen = new Set<number>([cellIndex(room, lamp)])
  for (let d = 0; d < LAMP_REACH; d++) {
    const next: Cell[] = []
    for (const c of front) {
      for (const dir of DIRS) {
        const n = step(c, dir)
        if (!passesLight(tileAt(room, n))) continue
        const i = cellIndex(room, n)
        if (seen.has(i)) continue
        seen.add(i)
        out.add(i)
        next.push(n)
      }
    }
    front = next
  }
}

const CACHE = new WeakMap<Room, Map<number, ReadonlySet<number>>>()

/**
 * The cells lit by the lamps still on in `mask`. Cached per room and per mask —
 * the solver asks this on every beat of every state, and a room has few masks.
 */
export function litCells(room: Room, mask: number): ReadonlySet<number> {
  if (room.lamps.length === 0) return EMPTY
  let byMask = CACHE.get(room)
  if (!byMask) CACHE.set(room, (byMask = new Map()))
  let lit = byMask.get(mask)
  if (!lit) {
    const out = new Set<number>()
    room.lamps.forEach((lamp, i) => {
      if (lampOn(mask, i)) spread(room, lamp, out)
    })
    byMask.set(mask, (lit = out))
  }
  return lit
}

const EMPTY: ReadonlySet<number> = new Set<number>()

/**
 * What a fox can see.
 *
 * The cone is a table, not a ray caster. Every cell in it — and every cell a
 * sightline to it has to cross — is written out below for a fox facing right,
 * then rotated. A player can learn a table; nobody can learn a floating-point ray.
 *
 * ```
 *   facing →      . 2 3 4        forward 1: the cell ahead
 *               F 1 2 3 4        forward 2–4: that cell and one to each side
 *                 . 2 3 4
 * ```
 *
 * A sightline's path is the cells a straight line from the fox's centre to the
 * target's centre touches, and a line through a corner touches all four cells
 * there — so a wall that meets another only at a corner still blocks. Walls always
 * block; low cover blocks only while Randy has his ears down (ears up stick out
 * over it). In shadow, ears down, Randy is invisible except right in front of a fox
 * — unless a lamp is lighting that shadow (`light.ts`), which is no shadow at all.
 */
import { delta, type Cell, type Dir } from './grid.js'
import { cellIndex } from './light.js'
import { randyCanEnter, tileAt, type Room, type TileGrid, type TileKind } from './room.js'

export const SIGHT_RANGE = 4

/** A cone cell for a fox facing right: `f` cells ahead, `l` to the side, and the cells a sightline crosses. */
interface ConeEntry {
  readonly f: number
  readonly l: number
  readonly path: ReadonlyArray<readonly [f: number, l: number]>
}

const HALF_CONE: readonly ConeEntry[] = [
  { f: 1, l: 0, path: [] },
  { f: 2, l: 0, path: [[1, 0]] },
  { f: 3, l: 0, path: [[1, 0], [2, 0]] },
  { f: 4, l: 0, path: [[1, 0], [2, 0], [3, 0]] },
  { f: 2, l: 1, path: [[1, 0], [1, 1]] },
  { f: 3, l: 1, path: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  { f: 4, l: 1, path: [[1, 0], [2, 0], [2, 1], [3, 1]] },
]

/** The whole cone: the table above plus its mirror on the other side. */
const CONE: readonly ConeEntry[] = [
  ...HALF_CONE,
  ...HALF_CONE.filter((e) => e.l !== 0).map((e) => ({
    f: e.f,
    l: -e.l,
    path: e.path.map(([f, l]) => [f, -l] as const),
  })),
]

/** A cell a fox sees: how far ahead of it, and how far to the side. */
export interface Sighting {
  readonly cell: Cell
  readonly forward: number
  readonly lateral: number
}

function toWorld(fox: Cell, facing: Dir, f: number, l: number): Cell {
  const fw = delta(facing)
  // The side axis is `fw` turned a quarter; the cone is symmetric, so which quarter does not matter.
  return { x: fox.x + fw.x * f - fw.y * l, y: fox.y + fw.y * f + fw.x * l }
}

export function blocksSight(kind: TileKind, earsDown: boolean): boolean {
  return kind === 'wall' || (kind === 'cover' && earsDown)
}

/**
 * Every cone cell a sightline from `fox` reaches, given how Randy holds his ears.
 * Only cells Randy could stand on are returned — this is also what gets drawn.
 */
export function visibleCells(grid: TileGrid, fox: Cell, facing: Dir, earsDown: boolean): Sighting[] {
  const seen: Sighting[] = []
  for (const e of CONE) {
    const cell = toWorld(fox, facing, e.f, e.l)
    const kind = tileAt(grid, cell)
    if (!randyCanEnter(kind)) continue
    const blocked = e.path.some(([f, l]) => blocksSight(tileAt(grid, toWorld(fox, facing, f, l)), earsDown))
    if (!blocked) seen.push({ cell, forward: e.f, lateral: e.l })
  }
  return seen
}

/** The table entry for `f` ahead, `l` aside — one lookup instead of walking the cone. */
const CONE_AT = new Map(CONE.map((e) => [`${e.f},${e.l}`, e]))

/**
 * Whether the fox at `fox`, facing `facing`, sees Randy at `randy`; `null` if not.
 * The same answer as looking Randy up in {@link visibleCells}, computed directly —
 * the solver asks this for every fox on every beat of every state.
 *
 * `lit` is the room's lit cells (`light.ts`); a shadow among them hides nobody.
 * Rooms without lamps pass nothing and behave exactly as before.
 */
export function spots(
  room: Room, fox: Cell, facing: Dir, randy: Cell, earsDown: boolean, lit?: ReadonlySet<number>,
): Sighting | null {
  const fw = delta(facing)
  const dx = randy.x - fox.x
  const dy = randy.y - fox.y
  // Inverse of toWorld: forward is the projection on fw, lateral on fw turned a quarter.
  const forward = dx * fw.x + dy * fw.y
  const lateral = -dx * fw.y + dy * fw.x
  const e = CONE_AT.get(`${forward},${lateral}`)
  if (!e) return null
  const kind = tileAt(room, randy)
  if (!randyCanEnter(kind)) return null
  if (e.path.some(([f, l]) => blocksSight(tileAt(room, toWorld(fox, facing, f, l)), earsDown))) return null
  const rightInFront = e.f === 1 && e.l === 0
  const hidden = kind === 'shadow' && !lit?.has(cellIndex(room, randy))
  if (earsDown && hidden && !rightInFront) return null
  return { cell: randy, forward: e.f, lateral: e.l }
}

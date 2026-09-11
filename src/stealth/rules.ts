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
 * over it). In shadow, ears down, Randy is invisible except right in front of a fox.
 */
import { delta, sameCell, type Cell, type Dir } from './grid.js'
import { tileAt, type Room, type TileGrid, type TileKind } from './room.js'

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
    if (kind === 'wall' || kind === 'cover') continue
    const blocked = e.path.some(([f, l]) => blocksSight(tileAt(grid, toWorld(fox, facing, f, l)), earsDown))
    if (!blocked) seen.push({ cell, forward: e.f, lateral: e.l })
  }
  return seen
}

/** Whether the fox at `fox`, facing `facing`, sees Randy at `randy`; `null` if not. */
export function spots(room: Room, fox: Cell, facing: Dir, randy: Cell, earsDown: boolean): Sighting | null {
  const s = visibleCells(room, fox, facing, earsDown).find((v) => sameCell(v.cell, randy))
  if (!s) return null
  const rightInFront = s.forward === 1 && s.lateral === 0
  if (earsDown && tileAt(room, randy) === 'shadow' && !rightInFront) return null
  return s
}

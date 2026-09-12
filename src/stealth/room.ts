/**
 * A room of the tile-stealth prototype: one screen, 16×11 tiles of 16×16 px.
 *
 * Authored as text so a room can be read (and diffed) like a picture:
 *
 * | char | tile     | Randy | fox | sight                          |
 * |------|----------|-------|-----|--------------------------------|
 * | `#`  | wall     | no    | no  | blocks                         |
 * | `.`  | floor    | yes   | yes | passes                         |
 * | `s`  | shadow   | yes   | yes | passes; hides Randy, ears down |
 * | `=`  | cover    | no    | no  | blocks only when ears are down |
 * | `D`  | door     | yes   | no  | passes — stepping on it wins   |
 * | `L`  | lamp     | no    | no  | passes; its light kills shadow |
 * | `~`  | board    | yes   | yes | passes; creaks under Randy      |
 * | `/`  | lever    | yes   | yes | passes; Randy stepping on it works the grates |
 * | `+`  | grate    | open  | no  | passes; a wall until the lever is pulled |
 * | `R`  | floor    |       |     | Randy's start                  |
 * | `c`  | floor    |       |     | a carrot lying there           |
 *
 * {@link parseRoom} refuses anything a player could not rely on: a ragged grid, a
 * missing start or door, a guard route that crosses a wall or is not a closed loop.
 */
import { dirBetween, sameCell, type Cell, type Dir } from './grid.js'

export const ROOM_COLS = 16
export const ROOM_ROWS = 11

export type TileKind = 'wall' | 'floor' | 'shadow' | 'cover' | 'door' | 'lamp' | 'board' | 'lever' | 'grate'

const LEGEND: Readonly<Record<string, TileKind>> = {
  '#': 'wall',
  '.': 'floor',
  s: 'shadow',
  '=': 'cover',
  D: 'door',
  L: 'lamp',
  '~': 'board',
  '/': 'lever',
  '+': 'grate',
  R: 'floor',
  c: 'floor',
}

export interface PatrolSource {
  /** Waypoints `[x, y]`. Each consecutive pair — and last → first — must share a row or a column. */
  readonly route: ReadonlyArray<readonly [number, number]>
  /** Where a one-waypoint (standing) guard looks. Required then (unless it turns), ignored otherwise. */
  readonly facing?: Dir
  /**
   * A standing guard that turns — a sentry: the facings it looks through, in order,
   * round and round. Only for a one-waypoint route; its first facing is `turns[0]`.
   */
  readonly turns?: readonly Dir[]
  /** Beats a sentry holds each facing (default 2). */
  readonly hold?: number
}

export interface RoomSource {
  readonly name: string
  readonly rows: readonly string[]
  readonly patrols: readonly PatrolSource[]
  /** Carrots Randy walks in with (default 0). `c` cells add carrots lying on the floor. */
  readonly carrots?: number
  /** The fewest beats the room can be left in — the solver's answer, pinned by the room's tests. */
  readonly par?: number
  /** Where bats roost, `[x, y]`: each hangs over a floor or shadow cell (`bat.ts`). */
  readonly bats?: ReadonlyArray<readonly [number, number]>
}

export interface Patrol {
  /** Every cell of the loop in walking order; `route[i]` and `route[(i + 1) % n]` are neighbours. */
  readonly route: readonly Cell[]
  /** The standing guard's facing, or the direction of a walking guard's first step. */
  readonly facing: Dir
  /** A sentry's facings, or `null` for a guard that does not turn. */
  readonly turns: readonly Dir[] | null
  /** Beats a sentry holds each facing. */
  readonly hold: number
}

export interface Room {
  readonly name: string
  readonly cols: number
  readonly rows: number
  /** Row-major, `cols * rows`. */
  readonly tiles: readonly TileKind[]
  readonly spawn: Cell
  readonly exits: readonly Cell[]
  /** Carrots lying on the floor at the start. */
  readonly pickups: readonly Cell[]
  /** Carrots Randy carries at the start. */
  readonly carrots: number
  readonly patrols: readonly Patrol[]
  /** See {@link RoomSource.par}. */
  readonly par: number | null
  /** Bat roosts. */
  readonly bats: readonly Cell[]
  /** Lamps, in reading order — their number is the bit they hold in `World.lamps` (`light.ts`). */
  readonly lamps: readonly Cell[]
  /** The lever, if the room has one: stepping on it works every grate. */
  readonly levers: readonly Cell[]
  /** Grates: a wall until the lever is pulled. */
  readonly grates: readonly Cell[]
}

/** Lamps a room may hold: one bit each in `World.lamps`, and more than a few would be a lit room. */
export const MAX_LAMPS = 8

/** The part of a room that {@link tileAt} reads. */
export type TileGrid = Pick<Room, 'cols' | 'rows' | 'tiles'>

/** The tile at `c`; anything outside the room is wall. */
export function tileAt(grid: TileGrid, c: Cell): TileKind {
  if (c.x < 0 || c.y < 0 || c.x >= grid.cols || c.y >= grid.rows) return 'wall'
  return grid.tiles[c.y * grid.cols + c.x] ?? 'wall'
}

/**
 * Tiles Randy can ever stand on — which is also what a fox can see him on. A grate
 * counts: a fox sees straight through the bars, and he stands there once it is open.
 * Whether he can *step* there this beat is {@link randyCanStep}.
 */
export function randyCanEnter(kind: TileKind): boolean {
  return kind === 'floor' || kind === 'shadow' || kind === 'door' || kind === 'board'
    || kind === 'lever' || kind === 'grate'
}

/** Tiles Randy can step onto now: a grate is a wall until the lever has been pulled. */
export function randyCanStep(kind: TileKind, pulled: boolean): boolean {
  return randyCanEnter(kind) && (kind !== 'grate' || pulled)
}

/** Whether light passes through: everything but a wall — a lamp shines over a crate. */
export function passesLight(kind: TileKind): boolean {
  return kind !== 'wall'
}

/** A fox walks the floor, the boards and past the lever — never through a rabbit's grate. */
export function foxCanEnter(kind: TileKind): boolean {
  return kind === 'floor' || kind === 'shadow' || kind === 'board' || kind === 'lever'
}

/** Expands waypoints into the full closed loop of neighbouring cells. */
function expandRoute(points: readonly Cell[]): Cell[] {
  const first = points[0]!
  if (points.length === 1) return [first]
  const out: Cell[] = [first]
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    const dx = Math.sign(b.x - a.x)
    const dy = Math.sign(b.y - a.y)
    let c = a
    while (!sameCell(c, b)) {
      c = { x: c.x + dx, y: c.y + dy }
      out.push(c)
    }
  }
  out.pop() // the walk ends back on points[0], which is already out[0]
  return out
}

function parsePatrol(grid: TileGrid, src: PatrolSource, index: number): Patrol {
  const where = `patrol ${index}`
  if (src.route.length === 0) throw new Error(`${where}: route has no waypoints`)
  const points = src.route.map(([x, y]) => ({ x, y }))
  for (let i = 0; i < points.length && points.length > 1; i++) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    if ((a.x === b.x) === (a.y === b.y)) {
      throw new Error(`${where}: waypoints (${a.x},${a.y}) and (${b.x},${b.y}) must differ in exactly one of x or y`)
    }
  }
  const route = expandRoute(points)
  for (const c of route) {
    const kind = tileAt(grid, c)
    if (!foxCanEnter(kind)) {
      throw new Error(`${where}: the route crosses (${c.x},${c.y}), a ${kind} a guard cannot walk on`)
    }
  }
  const hold = src.hold ?? 2
  if (src.turns !== undefined) {
    if (route.length !== 1) throw new Error(`${where}: only a standing guard can turn`)
    if (src.turns.length < 2) throw new Error(`${where}: a sentry needs at least two facings`)
    if (!Number.isInteger(hold) || hold < 1) throw new Error(`${where}: hold must be a whole number of beats, 1 or more`)
    return { route, facing: src.turns[0]!, turns: [...src.turns], hold }
  }
  if (route.length === 1) {
    if (!src.facing) throw new Error(`${where}: a standing guard needs a facing`)
    return { route, facing: src.facing, turns: null, hold }
  }
  return { route, facing: dirBetween(route[0]!, route[1]!)!, turns: null, hold }
}

/** Parses and validates a room. Throws with the row, column or patrol at fault. */
export function parseRoom(src: RoomSource): Room {
  if (src.rows.length !== ROOM_ROWS) {
    throw new Error(`${src.name}: expected ${ROOM_ROWS} rows, got ${src.rows.length}`)
  }
  const tiles: TileKind[] = []
  let spawn: Cell | null = null
  const exits: Cell[] = []
  const pickups: Cell[] = []
  const lamps: Cell[] = []
  const levers: Cell[] = []
  const grates: Cell[] = []
  src.rows.forEach((row, y) => {
    if (row.length !== ROOM_COLS) {
      throw new Error(`${src.name}: row ${y} must be ${ROOM_COLS} characters, got ${row.length}`)
    }
    ;[...row].forEach((ch, x) => {
      const kind = LEGEND[ch]
      if (!kind) throw new Error(`${src.name}: row ${y}, column ${x}: unknown tile '${ch}'`)
      tiles.push(kind)
      if (ch === 'R') {
        if (spawn) throw new Error(`${src.name}: more than one start 'R'`)
        spawn = { x, y }
      }
      if (ch === 'D') exits.push({ x, y })
      if (ch === 'c') pickups.push({ x, y })
      if (ch === 'L') lamps.push({ x, y })
      if (ch === '/') levers.push({ x, y })
      if (ch === '+') grates.push({ x, y })
    })
  })
  if (!spawn) throw new Error(`${src.name}: no start 'R'`)
  if (exits.length === 0) throw new Error(`${src.name}: no door 'D'`)
  if (lamps.length > MAX_LAMPS) throw new Error(`${src.name}: ${lamps.length} lamps, at most ${MAX_LAMPS}`)
  if (levers.length > 1) throw new Error(`${src.name}: ${levers.length} levers, at most one`)
  if (levers.length === 1 && grates.length === 0) throw new Error(`${src.name}: a lever with no grate to work`)
  if (grates.length > 0 && levers.length === 0) throw new Error(`${src.name}: a grate with no lever is a wall`)

  const base = {
    name: src.name,
    cols: ROOM_COLS,
    rows: ROOM_ROWS,
    tiles,
    spawn: spawn as Cell,
    exits,
    pickups,
    carrots: src.carrots ?? 0,
    par: src.par ?? null,
  }
  const patrols = src.patrols.map((p, i) => parsePatrol(base, p, i))
  const starts = patrols.map((p) => p.route[0]!)
  starts.forEach((c, i) => {
    if (sameCell(c, base.spawn)) throw new Error(`${src.name}: patrol ${i} starts on Randy`)
    if (starts.findIndex((o) => sameCell(o, c)) !== i) {
      throw new Error(`${src.name}: patrols start on the same cell (${c.x},${c.y})`)
    }
  })
  const bats = (src.bats ?? []).map(([x, y]) => ({ x, y }))
  bats.forEach((c, i) => {
    const kind = tileAt(base, c)
    if (kind !== 'floor' && kind !== 'shadow') throw new Error(`${src.name}: bat ${i} roosts over (${c.x},${c.y}), a ${kind}`)
    if (sameCell(c, base.spawn)) throw new Error(`${src.name}: bat ${i} roosts on Randy`)
    if (starts.some((s) => sameCell(s, c)) || bats.findIndex((o) => sameCell(o, c)) !== i) {
      throw new Error(`${src.name}: bat ${i} shares (${c.x},${c.y}) with another creature`)
    }
  })
  return { ...base, patrols, bats, lamps, levers, grates }
}

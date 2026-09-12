/**
 * The route-first generator: plan the way through, then dress it.
 *
 * `gen.ts` throws rooms at the wall and asks the solver which ones stuck. That works
 * for one mechanic and fails for two — each is about one room in a few thousand, so
 * their intersection is out of reach (`docs/stealth-design.md`).
 *
 * This one goes the other way. It lays a **chain** of chambers from Randy to the door
 * and joins each pair with exactly one corridor, so the room's map is a path and every
 * corridor is a bridge: cut it and the door is unreachable. That is the property a
 * mechanic needs in order to be load-bearing, and here it is true **by construction**
 * rather than by luck. Each corridor is then given a gate — a grate, a plank, a lit
 * shadow — and the solver is asked whether the room it produced is worth playing.
 *
 * It only proposes rooms. The solver still decides, and nothing here prints a way
 * through: layouts and numbers only.
 */
import { CREAK_HEARING } from '../../src/stealth/beat.js'
import { DIRS, manhattan, sameCell, step, type Cell, type Dir } from '../../src/stealth/grid.js'
import { LAMP_REACH } from '../../src/stealth/light.js'
import { foxCanEnter, parseRoom, tileAt, type PatrolSource, type RoomSource } from '../../src/stealth/room.js'
import { visibleCells } from '../../src/stealth/rules.js'
import { rng, W, H, type Candidate } from './gen.js'

/** What a corridor can be made to cost. */
export type Gate = 'grate' | 'board' | 'dark' | 'open'

interface Rect { x: number; y: number; w: number; h: number }

type Grid = string[][]

const at = (g: Grid, c: Cell): string => g[c.y]?.[c.x] ?? '#'
const put = (g: Grid, c: Cell, ch: string): void => { g[c.y]![c.x] = ch }
const inside = (c: Cell): boolean => c.x > 0 && c.y > 0 && c.x < W - 1 && c.y < H - 1

/** Cells Randy could walk on, for the structural checks below. */
const walkable = (ch: string): boolean => '.s~+/Rc'.includes(ch)

/** Whether `from` still reaches `to` when `cut` is treated as solid. */
function connected(g: Grid, from: Cell, to: Cell, cut: Cell | null): boolean {
  const seen = new Set<string>([`${from.x},${from.y}`])
  const queue: Cell[] = [from]
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head]!
    if (sameCell(c, to)) return true
    for (const dir of DIRS) {
      const n = step(c, dir)
      const key = `${n.x},${n.y}`
      if (seen.has(key) || !inside(n) || !walkable(at(g, n))) continue
      if (cut && sameCell(n, cut)) continue
      seen.add(key)
      queue.push(n)
    }
  }
  return false
}

function carve(g: Grid, r: Rect): Cell[] {
  const cells: Cell[] = []
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      g[y]![x] = '.'
      cells.push({ x, y })
    }
  }
  return cells
}

/** An L-shaped corridor between two cells; returns the cells it had to dig out. */
function dig(g: Grid, a: Cell, b: Cell, horizFirst: boolean): Cell[] {
  const cut: Cell[] = []
  let { x, y } = a
  const walk = (tx: number, ty: number): void => {
    while (x !== tx || y !== ty) {
      if (x !== tx) x += Math.sign(tx - x)
      else y += Math.sign(ty - y)
      if (g[y]![x] === '#') {
        g[y]![x] = '.'
        cut.push({ x, y })
      }
    }
  }
  if (horizFirst) {
    walk(b.x, y)
    walk(b.x, b.y)
  } else {
    walk(x, b.y)
    walk(b.x, b.y)
  }
  return cut
}

/** A guard placed so that `target` is inside its cone, or `null` if nowhere works. */
function watcher(src: RoomSource, target: Cell, taken: Set<string>): PatrolSource | null {
  const room = parseRoom(src)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const cell = { x, y }
      if (taken.has(`${x},${y}`) || !foxCanEnter(tileAt(room, cell))) continue
      for (const facing of DIRS) {
        const seen = visibleCells(room, cell, facing, false)
        // Not right in front: that is an instant catch, which is a wall, not a gate.
        if (seen.some((s) => sameCell(s.cell, target) && s.forward > 1)) return { route: [[x, y]], facing }
      }
    }
  }
  return null
}

/** A guard near enough to hear `target` creak, and able to walk to it. */
function listener(src: RoomSource, target: Cell, taken: Set<string>): PatrolSource | null {
  const room = parseRoom(src)
  const options: PatrolSource[] = []
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const cell = { x, y }
      if (taken.has(`${x},${y}`) || !foxCanEnter(tileAt(room, cell))) continue
      if (manhattan(cell, target) > CREAK_HEARING || manhattan(cell, target) === 0) continue
      if (!connected(src.rows.map((r) => [...r]), cell, target, null)) continue
      for (const facing of DIRS) options.push({ route: [[x, y]], facing })
    }
  }
  return options[0] ?? null
}

/** A wall cell touching `target` where a lamp can stand and light it. */
function lampFor(g: Grid, target: Cell): Cell | null {
  for (const dir of DIRS) {
    const c = step(target, dir)
    if (c.x >= 0 && c.y >= 0 && c.x < W && c.y < H && at(g, c) === '#') return c
  }
  return null
}

export interface RouteOptions {
  /** One gate per corridor, in order from Randy to the door. */
  readonly gates: readonly Gate[]
}

/**
 * Builds one route-first candidate, or `null` when the dice make a shape the plan
 * cannot use. Every gate cell is checked to be a real bridge before it is dressed.
 */
export function generateRoute(seed: number, opts: RouteOptions): Candidate | null {
  const r = rng(seed)
  const g: Grid = Array.from({ length: H }, () => Array.from({ length: W }, () => '#'))
  const want = opts.gates.length + 1

  // 1. A chain of chambers that do not touch.
  const rooms: Rect[] = []
  for (let tries = 0; rooms.length < want && tries < 400; tries++) {
    const w = r.int(2, 4)
    const h = r.int(2, 3)
    const x = r.int(1, W - 1 - w)
    const y = r.int(1, H - 1 - h)
    const clash = rooms.some((o) => x - 2 <= o.x + o.w && o.x - 2 <= x + w && y - 2 <= o.y + o.h && o.y - 2 <= y + h)
    if (!clash) rooms.push({ x, y, w, h })
  }
  if (rooms.length < want) return null
  rooms.sort((a, b) => a.x + a.y - (b.x + b.y))
  const chambers = rooms.map((rect) => carve(g, rect))

  // 2. One corridor between each pair — the map is a path, so each is a bridge.
  const centre = (q: Rect): Cell => ({ x: q.x + Math.floor(q.w / 2), y: q.y + Math.floor(q.h / 2) })
  const corridors: Cell[][] = []
  for (let i = 0; i + 1 < rooms.length; i++) {
    const cut = dig(g, centre(rooms[i]!), centre(rooms[i + 1]!), r.next() < 0.5)
    if (cut.length < 2) return null
    corridors.push(cut)
  }

  // 3. Randy in the first chamber, the door in a wall of the last.
  const start = r.pick(chambers[0]!)
  put(g, start, 'R')
  const last = rooms[rooms.length - 1]!
  const doorX = r.int(last.x, last.x + last.w - 1)
  const doorY = last.y - 1 >= 0 ? last.y - 1 : last.y + last.h
  const door = { x: doorX, y: doorY }
  if (at(g, door) !== '#') return null
  put(g, door, 'D')

  // 4. Each corridor gets its gate — but only where cutting it really does cut the room.
  const taken = new Set<string>([`${start.x},${start.y}`])
  const patrols: PatrolSource[] = []
  const rowsOf = (): string[] => g.map((row) => row.join(''))
  for (let i = 0; i < opts.gates.length; i++) {
    const gate = opts.gates[i]!
    if (gate === 'open') continue
    const corridor = corridors[i]!
    const cell = corridor[Math.floor(corridor.length / 2)]!
    if (connected(g, start, door, cell)) return null // not a bridge: the plan does not hold
    const src = (): RoomSource => ({ name: `route${seed}`, rows: rowsOf(), patrols: [], carrots: 1 })
    if (gate === 'grate') {
      put(g, cell, '+')
      // The lever must be on Randy's side of the grate, or the room is a locked door.
      // The handle goes as far from Randy as the near side allows: a lever by the door
      // he came in through is a thing to remember, not a detour worth walking.
      const near = chambers.flat().filter((c) => at(g, c) === '.' && !taken.has(`${c.x},${c.y}`)
        && connected(g, start, c, cell))
      let lever: Cell | undefined
      let best = -1
      for (const c of near) {
        const d = manhattan(c, start)
        if (d > best) { best = d; lever = c }
      }
      if (!lever || best < 4) return null
      put(g, lever, '/')
      taken.add(`${lever.x},${lever.y}`)
    } else if (gate === 'board') {
      put(g, cell, '~')
      const guard = listener(src(), cell, taken)
      if (!guard) return null
      patrols.push(guard)
      taken.add(`${guard.route[0]![0]},${guard.route[0]![1]}`)
    } else {
      // dark: the corridor is shadow, a guard watches it, and a lamp spoils the dark.
      for (const c of corridor) if (at(g, c) === '.') put(g, c, 's')
      const guard = watcher(src(), cell, taken)
      if (!guard) return null
      patrols.push(guard)
      taken.add(`${guard.route[0]![0]},${guard.route[0]![1]}`)
      const lamp = lampFor(g, cell)
      if (!lamp || manhattan(lamp, cell) > LAMP_REACH) return null
      put(g, lamp, 'L')
    }
  }
  if (!patrols.length) return null

  return { seed, src: { name: `route${seed}`, rows: rowsOf(), patrols, carrots: 1 } }
}

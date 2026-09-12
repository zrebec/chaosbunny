/**
 * A room generator for design work: builds 16×11 candidates out of rectangles and
 * corridors, sprinkles shadow, crates and boards, puts guards where they watch
 * something, and hands them to the solver to be marked (`metrics.ts`).
 *
 * It is a **design tool, not a runtime generator**. The game ships hand-picked
 * rooms; this only proposes them. A room is chosen because the solver says its new
 * thing is load-bearing, and it is then kept exactly as it came — tuning a layout
 * "so it works" quietly draws the designer's own solution into it.
 *
 * **It never prints a way through.** Layouts and numbers only; the way out of a
 * room is the player's to find. See `docs/stealth-design.md` §4.
 */
import { parseRoom, tileAt, type PatrolSource, type RoomSource } from '../../src/stealth/room.js'

export const W = 16
export const H = 11

/** A small deterministic PRNG: the same seed always builds the same room. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (lo: number, hi: number): number => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)]!,
  }
}

export interface GenOptions {
  /** Let some standing guards turn on the spot (a sentry). */
  readonly sentries?: boolean
  /** Hang a bat, and keep the guards down to make room for it. */
  readonly bats?: boolean
}

interface Rect { x: number; y: number; w: number; h: number }

type Grid = string[][]

const carve = (g: Grid, r: Rect): void => {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y]![x] = '.'
}

function corridor(g: Grid, a: [number, number], b: [number, number], horizFirst: boolean, cells: [number, number][]): void {
  let [x, y] = a
  const walk = (tx: number, ty: number): void => {
    while (x !== tx || y !== ty) {
      if (x !== tx) x += Math.sign(tx - x)
      else y += Math.sign(ty - y)
      if (g[y]![x] === '#') {
        g[y]![x] = '.'
        cells.push([x, y])
      }
    }
  }
  if (horizFirst) {
    walk(b[0], y)
    walk(b[0], b[1])
  } else {
    walk(x, b[1])
    walk(b[0], b[1])
  }
}

export interface Candidate {
  readonly seed: number
  readonly src: RoomSource
}

/**
 * Builds one candidate from `seed`, or `null` when the dice produce nothing usable
 * (too few rooms, no wall to hang a door on). Callers walk a range of seeds and keep
 * what the solver likes.
 */
export function generate(seed: number, opts: GenOptions = {}): Candidate | null {
  const r = rng(seed)
  const g: Grid = Array.from({ length: H }, () => Array.from({ length: W }, () => '#'))

  // 1. Three or four rooms that do not touch.
  const rooms: Rect[] = []
  for (let tries = 0, want = r.int(3, 4); rooms.length < want && tries < 200; tries++) {
    const w = r.int(3, 6)
    const h = r.int(2, 4)
    const x = r.int(1, W - 1 - w)
    const y = r.int(1, H - 1 - h)
    const clash = rooms.some((o) => x - 1 <= o.x + o.w && o.x - 1 <= x + w && y - 1 <= o.y + o.h && o.y - 1 <= y + h)
    if (!clash) rooms.push({ x, y, w, h })
  }
  if (rooms.length < 3) return null
  rooms.sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))
  for (const rect of rooms) carve(g, rect)

  // 2. Corridors between them, some of which end up in shadow.
  const corr: [number, number][] = []
  const centre = (q: Rect): [number, number] => [q.x + Math.floor(q.w / 2), q.y + Math.floor(q.h / 2)]
  for (let i = 0; i + 1 < rooms.length; i++) corridor(g, centre(rooms[i]!), centre(rooms[i + 1]!), r.next() < 0.5, corr)
  if (corr.length < 3) return null
  for (const [x, y] of corr) if (r.next() < 0.45) g[y]![x] = 's'

  // 3. Crates inside the rooms.
  const roomCells = rooms.flatMap((q) =>
    Array.from({ length: q.w * q.h }, (_, i) => [q.x + (i % q.w), q.y + Math.floor(i / q.w)] as [number, number]))
  for (let i = 0, k = r.int(0, 3); i < k; i++) {
    const [x, y] = r.pick(roomCells)
    if (g[y]![x] === '.') g[y]![x] = '='
  }

  // 4. Randy in the first room, the door in the wall of the last.
  const first = rooms[0]!
  const last = rooms[rooms.length - 1]!
  const floorIn = (q: Rect): [number, number][] =>
    Array.from({ length: q.w * q.h }, (_, i) => [q.x + (i % q.w), q.y + Math.floor(i / q.w)] as [number, number])
      .filter(([x, y]) => g[y]![x] === '.')
  const start = floorIn(first)
  if (!start.length) return null
  const [sx, sy] = r.pick(start)
  g[sy]![sx] = 'R'
  const doorX = r.int(last.x, last.x + last.w - 1)
  const doorY = last.y - 1 >= 0 ? last.y - 1 : last.y + last.h
  if (g[doorY]?.[doorX] !== '#') return null
  g[doorY]![doorX] = 'D'

  // 5. A carrot: in hand, on the floor, or none at all.
  let carrots = 0
  const which = r.next()
  if (which < 0.35) carrots = 1
  else if (which < 0.75) {
    const free = roomCells.filter(([x, y]) => g[y]![x] === '.')
    if (free.length) {
      const [x, y] = r.pick(free)
      g[y]![x] = 'c'
    }
  }

  // 6. Guards: standing (perhaps turning) or pacing a straight run, never on Randy.
  const rows = g.map((row) => row.join(''))
  const probe = parseRoom({ name: 'probe', rows, patrols: [] })
  const walkable = (x: number, y: number): boolean => {
    const k = tileAt(probe, { x, y })
    return k === 'floor' || k === 'shadow' || k === 'board'
  }
  const spots: [number, number][] = []
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (walkable(x, y) && !(x === sx && y === sy) && g[y]![x] !== 'c') spots.push([x, y])
    }
  }
  const patrols: PatrolSource[] = []
  const used = new Set<string>()
  const step = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const
  for (let i = 0, want = r.int(2, 3); i < want && spots.length; i++) {
    const [x, y] = r.pick(spots)
    if (used.has(`${x},${y}`) || Math.abs(x - sx) + Math.abs(y - sy) < 4) continue
    const dirs = (['up', 'right', 'down', 'left'] as const).filter((d) => {
      const [dx, dy] = step[d]
      return walkable(x + dx, y + dy) && walkable(x + 2 * dx, y + 2 * dy)
    })
    if (!dirs.length) continue
    const facing = r.pick(dirs)
    const [dx, dy] = step[facing]
    if (r.next() < 0.5) {
      const others = dirs.filter((o) => o !== facing)
      if (opts.sentries && others.length && r.next() < 0.6) {
        patrols.push({ route: [[x, y]], turns: [facing, r.pick(others)], hold: r.int(2, 3) })
      } else {
        patrols.push({ route: [[x, y]], facing })
      }
    } else {
      let len = 1
      while (len < r.int(2, 5) && walkable(x + (len + 1) * dx, y + (len + 1) * dy)) len++
      patrols.push({ route: [[x, y], [x + len * dx, y + len * dy]] })
    }
    used.add(`${x},${y}`)
  }
  if (!patrols.length) return null

  // 7. A bat, if asked — and one guard fewer to keep the search affordable.
  const bats: [number, number][] = []
  if (opts.bats) {
    const free = spots.filter(([x, y]) => !used.has(`${x},${y}`) && Math.abs(x - sx) + Math.abs(y - sy) >= 3)
    if (!free.length) return null
    bats.push(r.pick(free))
    if (patrols.length > 1 && r.next() < 0.5) patrols.pop()
  }

  return { seed, src: { name: `gen${seed}`, rows, patrols, carrots, bats } }
}

/** Returns `rows` with `tile` written at each of `cells` — how a lamp or a board is tried out. */
export function withTiles(rows: readonly string[], tile: string, cells: ReadonlyArray<readonly [number, number]>): string[] {
  const out = [...rows]
  for (const [x, y] of cells) out[y] = out[y]!.slice(0, x) + tile + out[y]!.slice(x + 1)
  return out
}

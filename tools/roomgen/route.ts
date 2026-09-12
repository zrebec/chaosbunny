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
import { BAT_HEARING } from '../../src/stealth/bat.js'
import { CREAK_HEARING, THROW_RANGE } from '../../src/stealth/beat.js'
import { DIRS, manhattan, sameCell, step, type Cell, type Dir } from '../../src/stealth/grid.js'
import { allLampsOn, cellIndex, litCells } from '../../src/stealth/light.js'
import { foxCanEnter, parseRoom, tileAt, type PatrolSource, type RoomSource } from '../../src/stealth/room.js'
import { visibleCells } from '../../src/stealth/rules.js'
import { rng, W, H, type Candidate } from './gen.js'

/** What a corridor can be made to cost. */
export type Gate = 'grate' | 'board' | 'dark' | 'bat' | 'sentry' | 'water' | 'open'

interface Rect { x: number; y: number; w: number; h: number }

type Grid = string[][]

const at = (g: Grid, c: Cell): string => g[c.y]?.[c.x] ?? '#'
const put = (g: Grid, c: Cell, ch: string): void => { g[c.y]![c.x] = ch }
const inside = (c: Cell): boolean => c.x > 0 && c.y > 0 && c.x < W - 1 && c.y < H - 1

/**
 * Cells Randy could walk on, for the structural checks below — the door included.
 * Leaving `D` out made every one of those checks answer "not connected" and quietly
 * pass, which is how a bridge test can look right for a week and test nothing.
 */
const walkable = (ch: string): boolean => '.s~+/RcD'.includes(ch)

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

/** Every cell an L-shaped walk from `a` to `b` passes through, carved or not. */
function pathCells(a: Cell, b: Cell, horizFirst: boolean): Cell[] {
  const cells: Cell[] = []
  let { x, y } = a
  const walk = (tx: number, ty: number): void => {
    while (x !== tx || y !== ty) {
      if (x !== tx) x += Math.sign(tx - x)
      else y += Math.sign(ty - y)
      cells.push({ x, y })
    }
  }
  if (horizFirst) {
    walk(b.x, y)
    walk(b.x, b.y)
  } else {
    walk(x, b.y)
    walk(b.x, b.y)
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

/**
 * A guard placed to watch a stretch of corridor: at least two of `cells` inside its
 * cone, and none of them right in front of it. Two matters — one cone cell costs a
 * player a single `?` and he walks on, so a corridor with one watched cell is not a
 * gate. Right in front is the opposite mistake: an instant catch is a wall.
 */
function watcher(src: RoomSource, cells: readonly Cell[], taken: Set<string>): PatrolSource | null {
  const room = parseRoom(src)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const cell = { x, y }
      if (taken.has(`${x},${y}`) || !foxCanEnter(tileAt(room, cell))) continue
      for (const facing of DIRS) {
        const seen = visibleCells(room, cell, facing, false).filter((s) => cells.some((c) => sameCell(s.cell, c)))
        // Two *neighbouring* cells: a player who can step out of the cone between two
        // sightings is never caught by them, so only a run of watched cells is a gate.
        const run = seen.some((a) => seen.some((b) => manhattan(a.cell, b.cell) === 1))
        if (run && seen.every((s) => s.forward > 1)) return { route: [[x, y]], facing }
      }
    }
  }
  return null
}

/**
 * A sentry for a stretch of corridor: one facing that watches a run of it, and another
 * that watches none of it. The first is the wall, the second is the window — which is
 * the whole of what a sentry is for. Without the second, the corridor is simply shut.
 */
function turner(src: RoomSource, cells: readonly Cell[], taken: Set<string>): PatrolSource | null {
  const room = parseRoom(src)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const cell = { x, y }
      if (taken.has(`${x},${y}`) || !foxCanEnter(tileAt(room, cell))) continue
      const covers = DIRS.map((facing) => ({
        facing,
        seen: visibleCells(room, cell, facing, false).filter((sg) => cells.some((c) => sameCell(sg.cell, c))),
      }))
      const watching = covers.find((c) =>
        c.seen.length >= 2 && c.seen.every((sg) => sg.forward > 1)
        && c.seen.some((a) => c.seen.some((b) => manhattan(a.cell, b.cell) === 1)))
      const away = covers.find((c) => c.seen.length === 0)
      if (watching && away) return { route: [[x, y]], turns: [watching.facing, away.facing], hold: 2 }
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

/**
 * The shape room07 has by accident, built on purpose: a pocket beside the end of a
 * corridor with a **lamp as the only window in it**. The lamp is solid, so the guard
 * in the pocket can never walk out and can never be lured by a carrot; it is
 * transparent to sight and to light, so the guard watches a run of the corridor and
 * the lamp lights exactly that run. Put the lamp out and the run goes dark; leave it
 * and the run cannot be crossed.
 *
 * Randy needs somewhere safe to throw from, which is why the corridor must run three
 * cells past the lamp: the third is out of the cone (a cone reaches four) and still
 * within a carrot's throw (three).
 *
 * Returns the lamp and the guard, having carved the pocket, or `null` if the corridor
 * has no room for one.
 */
function carveLampPocket(
  g: Grid,
  corridor: readonly Cell[],
  seed: number,
): { lamp: Cell; guard: PatrolSource } | null {
  const dirs: Array<[Cell, Cell]> = [
    [{ x: 0, y: -1 }, { x: -1, y: 0 }], [{ x: 0, y: -1 }, { x: 1, y: 0 }],
    [{ x: 0, y: 1 }, { x: -1, y: 0 }], [{ x: 0, y: 1 }, { x: 1, y: 0 }],
    [{ x: -1, y: 0 }, { x: 0, y: -1 }], [{ x: -1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 1, y: 0 }, { x: 0, y: -1 }], [{ x: 1, y: 0 }, { x: 0, y: 1 }],
  ]
  const add = (a: Cell, b: Cell, k = 1): Cell => ({ x: a.x + b.x * k, y: a.y + b.y * k })
  const facingOf = (d: Cell): Dir =>
    d.y < 0 ? 'up' : d.y > 0 ? 'down' : d.x < 0 ? 'left' : 'right'

  for (const c of corridor) {
    for (const [u, v] of dirs) {
      // The lamp stands one step off the corridor's end, in what is now wall.
      const lamp = c
      if (at(g, lamp) === '#') continue // the lamp replaces a corridor cell's neighbour, not itself
      const run = [add(lamp, u), add(lamp, u, 2), add(lamp, u, 3)]
      if (!run.every((r) => corridor.some((q) => sameCell(q, r)) || '.s'.includes(at(g, r)))) continue
      const pocket = [add(lamp, v), add(add(lamp, v), u, -1), add(add(lamp, v), u, -2), add(lamp, u, -1)]
      if (!pocket.every((q) => inside(q) && at(g, q) === '#')) continue
      const before = pocket.map((q) => at(g, q))
      for (const q of pocket) put(g, q, '.')
      const wasLamp = at(g, lamp)
      put(g, lamp, 'L')
      const guardCell = pocket[2]!
      const facing = facingOf(u)
      const src: RoomSource = { name: `route${seed}`, rows: g.map((row) => row.join('')), patrols: [], carrots: 1 }
      let room
      try {
        room = parseRoom(src)
      } catch {
        pocket.forEach((q, i) => put(g, q, before[i]!))
        put(g, lamp, wasLamp)
        continue
      }
      // The guard must be walled in: a fox that can walk to the corridor can be lured,
      // and then the lamp costs nothing.
      const reach = new Set<string>([`${guardCell.x},${guardCell.y}`])
      const queue = [guardCell]
      for (let head = 0; head < queue.length; head++) {
        for (const dir of DIRS) {
          const n = step(queue[head]!, dir)
          if (reach.has(`${n.x},${n.y}`) || !foxCanEnter(tileAt(room, n))) continue
          reach.add(`${n.x},${n.y}`)
          queue.push(n)
        }
      }
      const sealed = !run.some((r) => reach.has(`${r.x},${r.y}`))
      const seen = visibleCells(room, guardCell, facing, false).filter((sg) => run.some((r) => sameCell(sg.cell, r)))
      const watched = seen.length >= 2 && seen.every((sg) => sg.forward > 1)
      const lit = litCells(room, allLampsOn(room))
      const dark = seen.every((sg) => lit.has(cellIndex(room, sg.cell)))
      if (sealed && watched && dark) return { lamp, guard: { route: [[guardCell.x, guardCell.y]], facing } }
      pocket.forEach((q, i) => put(g, q, before[i]!))
      put(g, lamp, wasLamp)
    }
  }
  return null
}

export interface RouteOptions {
  /** One gate per corridor, in order from Randy to the door. */
  readonly gates: readonly Gate[]
  /**
   * Two gates on the **last** pair of chambers instead of one: the corridor is dug
   * twice, once round each corner, and each way gets its own gate. Neither is a bridge
   * then — which is the point. A room with a fork asks which price to pay rather than
   * how to pay the one it has, and the solver can tell the two apart (`lamps: false`
   * against `lampsOut: true` in `search.roomgen.ts`).
   */
  readonly fork?: readonly [Gate, Gate]
  /**
   * Called with a word for each shape the plan threw away, so a search that finds
   * nothing can say *why* instead of shrugging. The words: `chambers` (no room for the
   * chain), `corridor`, `door`, `chain-not-a-bridge` (a gate cell that can be walked
   * round), `chain-gate-<gate>` / `fork-gate-<gate>` (the shape cannot carry that
   * gate), `fork-square` / `fork-short` / `fork-overlap` (no room for two ways),
   * `fork-way-is-a-bridge` (the two ways are really one), `empty` (nobody to hide from).
   * Counting them is how the fork was got working at all.
   */
  readonly onFail?: (why: string) => void
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
  if (rooms.length < want) { opts.onFail?.('chambers'); return null }
  rooms.sort((a, b) => a.x + a.y - (b.x + b.y))
  const chambers = rooms.map((rect) => carve(g, rect))

  // 2. One corridor between each pair — the map is a path, so each is a bridge.
  const centre = (q: Rect): Cell => ({ x: q.x + Math.floor(q.w / 2), y: q.y + Math.floor(q.h / 2) })
  const corridors: Cell[][] = []
  for (let i = 0; i + 1 < rooms.length; i++) {
    const cut = dig(g, centre(rooms[i]!), centre(rooms[i + 1]!), r.next() < 0.5)
    if (cut.length < 2) { opts.onFail?.('corridor'); return null }
    corridors.push(cut)
  }

  // 2b. The fork: the last pair gets a second corridor, dug round the other corner.
  let forked: Cell[] | null = null
  if (opts.fork) {
    const a = centre(rooms[rooms.length - 2]!)
    const b = centre(rooms[rooms.length - 1]!)
    if (Math.abs(a.x - b.x) < 2 || Math.abs(a.y - b.y) < 2) { opts.onFail?.('fork-square'); return null }
    const first = corridors[corridors.length - 1]!
    // Both ways round a rectangle are the same length, which is fine when the two
    // gates cost differently (a lamp against a plank) and useless when one of them
    // costs *beats*: wading a way that is no shorter is never worth it. So when water
    // is in the fork, the other way is dug the long way about, through a corner.
    const straightFirst = first.length > 0 && first[0]!.y === a.y
    if (opts.fork.includes('water')) {
      const far = [{ x: 1, y: 1 }, { x: W - 2, y: 1 }, { x: 1, y: H - 2 }, { x: W - 2, y: H - 2 }]
        .map((c) => ({ c, d: manhattan(c, a) + manhattan(c, b) }))
        .sort((p, q) => q.d - p.d)[0]!.c
      // The long way must not walk over the short one, or the two are one corridor.
      const detour = [...pathCells(a, far, true), ...pathCells(far, b, true)]
      const direct = pathCells(a, b, straightFirst)
      const shared = detour.some((c) => direct.some((q) => sameCell(c, q) && !sameCell(c, a) && !sameCell(c, b)))
      if (shared) { opts.onFail?.('fork-overlap'); return null }
      forked = [...dig(g, a, far, true), ...dig(g, far, b, true)]
    } else {
      forked = dig(g, a, b, !straightFirst)
    }
    if (forked.length < 2) { opts.onFail?.('fork-short'); return null }
    // The two ways must be genuinely separate, or the fork is one corridor with a bulge.
    if (forked.some((c) => first.some((q) => sameCell(q, c)))) { opts.onFail?.('fork-overlap'); return null }
  }

  // 3. Randy in the first chamber, the door in a wall of the last.
  const start = r.pick(chambers[0]!)
  put(g, start, 'R')
  const last = rooms[rooms.length - 1]!
  const doorX = r.int(last.x, last.x + last.w - 1)
  const doorY = last.y - 1 >= 0 ? last.y - 1 : last.y + last.h
  const door = { x: doorX, y: doorY }
  if (at(g, door) !== '#') { opts.onFail?.('door'); return null }
  put(g, door, 'D')

  // 4. Each corridor gets its gate — but only where cutting it really does cut the room.
  const taken = new Set<string>([`${start.x},${start.y}`])
  const patrols: PatrolSource[] = []
  const bats: Array<[number, number]> = []
  const rowsOf = (): string[] => g.map((row) => row.join(''))
  const src = (): RoomSource => ({ name: `route${seed}`, rows: rowsOf(), patrols: [], carrots: 1 })

  /** Puts one gate on one corridor. False when this shape cannot carry that gate. */
  const dress = (gate: Gate, corridor: readonly Cell[], cell: Cell): boolean => {
    if (gate === 'open') return true // a way with nothing on it is still a way
    if (gate === 'grate') {
      put(g, cell, '+')
      // The lever must be on Randy's side of the grate, or the room is a locked door,
      // and it goes as far from him as that side allows: a handle by the door he came
      // in through is a thing to remember, not a detour worth walking.
      const near = chambers.flat().filter((c) => at(g, c) === '.' && !taken.has(`${c.x},${c.y}`)
        && connected(g, start, c, cell))
      let lever: Cell | undefined
      let best = -1
      for (const c of near) {
        const d = manhattan(c, start)
        if (d > best) { best = d; lever = c }
      }
      if (!lever || best < 4) return false
      put(g, lever, '/')
      taken.add(`${lever.x},${lever.y}`)
      return true
    }
    if (gate === 'water') {
      // On a fork, two cells at the middle: flooding the lot costs more beats than the
      // short way can ever save. On the only way through, the lot — because there the
      // point is not the choice but the tax, and every cell of it moves the world twice.
      const mid = corridor.indexOf(cell)
      const flood = opts.fork ? corridor.slice(Math.max(0, mid - 1), mid + 1) : corridor
      for (const c2 of flood) if (at(g, c2) === '.') put(g, c2, 'w')
      return true
    }
    if (gate === 'sentry') {
      const guard = turner(src(), corridor, taken)
      if (!guard) return false
      patrols.push(guard)
      taken.add(`${guard.route[0]![0]},${guard.route[0]![1]}`)
      return true
    }
    if (gate === 'bat') {
      // A bat hanging in the next chamber: it cannot see, but it hears an ears-up step
      // from BAT_HEARING away, so the corridor has to be crossed in silence.
      const roosts = chambers.flat().filter((q) => at(g, q) === '.' && !taken.has(`${q.x},${q.y}`)
        && manhattan(q, cell) <= BAT_HEARING && manhattan(q, start) >= 4)
      const roost = roosts[Math.floor(r.next() * roosts.length)]
      if (!roost) return false
      bats.push([roost.x, roost.y])
      taken.add(`${roost.x},${roost.y}`)
      return true
    }
    if (gate === 'board') {
      put(g, cell, '~')
      const guard = listener(src(), cell, taken)
      if (!guard) return false
      patrols.push(guard)
      taken.add(`${guard.route[0]![0]},${guard.route[0]![1]}`)
      return true
    }
    // dark: a shadow corridor, and a guard walled into a pocket whose only window is
    // the lamp — see carveLampPocket. Nothing else makes a lamp worth putting out.
    for (const c2 of corridor) if (at(g, c2) === '.') put(g, c2, 's')
    const pocket = carveLampPocket(g, corridor, seed)
    if (!pocket) return false
    patrols.push(pocket.guard)
    taken.add(`${pocket.guard.route[0]![0]},${pocket.guard.route[0]![1]}`)
    return true
  }

  const chainGates = opts.fork ? opts.gates.slice(0, -1) : opts.gates
  for (let i = 0; i < chainGates.length; i++) {
    const gate = chainGates[i]!
    if (gate === 'open') continue
    const corridor = corridors[i]!
    const cell = corridor[Math.floor(corridor.length / 2)]!
    if (connected(g, start, door, cell)) { opts.onFail?.('chain-not-a-bridge'); return null } // the plan does not hold
    if (!dress(gate, corridor, cell)) { opts.onFail?.(`chain-gate-${gate}`); return null }
  }
  if (opts.fork) {
    const ways = [corridors[corridors.length - 1]!, forked!]
    // Water goes on the *shorter* way, or it is never worth wading: short and slow
    // against long and dry is the choice; long and slow is no choice at all.
    if (opts.fork.includes('water') && opts.fork[0] !== opts.fork[1]) {
      const wetFirst = opts.fork[0] === 'water'
      const shorterIsFirst = ways[0]!.length <= ways[1]!.length
      if (wetFirst !== shorterIsFirst) ways.reverse()
    }
    for (let k = 0; k < 2; k++) {
      const gate = opts.fork[k]!
      const way = ways[k]!
      const cell = way[Math.floor(way.length / 2)]!
      // A fork's gate must NOT be a bridge: the other way round is what makes it a choice.
      if (!connected(g, start, door, cell)) { opts.onFail?.('fork-way-is-a-bridge'); return null }
      if (!dress(gate, way, cell)) { opts.onFail?.(`fork-gate-${gate}`); return null }
    }
  }
  if (!patrols.length && !bats.length) { opts.onFail?.('empty'); return null }

  return { seed, src: { name: `route${seed}`, rows: rowsOf(), patrols, carrots: 1, bats } }
}

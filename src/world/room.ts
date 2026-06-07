/**
 * One hand-built cave room for the 0.1.0 vertical slice.
 *
 * The room is exactly the screen width (32 tiles = 256px) and taller than the
 * screen (36 tiles = 288px), so the camera scrolls vertically as the rabbit
 * climbs — a shaft from the cave floor toward the top. Borders are solid cave
 * stone; moss platforms form a climbable path upward. Built with `fillRect`
 * for now; procedural generation replaces this in 0.2.0.
 */
import { createTileMap, CELL, C, createRng, type Tile, type TileMap, type SpectrumColor, type Rect } from 'zx-kit'
import { atlas, type AtlasKey } from '../art/atlas.js'
import { FLOOR_TARGET, JUMP_APEX_PX, JUMP_REACH_PX } from '../config.js'
import { RABBIT_W, RABBIT_H, RABBIT_BOX } from '../rabbit.js'

export const ROOM_COLS = 84
export const ROOM_ROWS = 52

export interface Room {
  map: TileMap
  /** Rabbit spawn in world pixels (sprite top-left). */
  spawnX: number
  spawnY: number
  carrots: ReadonlyArray<{ x: number; y: number }>
  spiders: ReadonlyArray<{ x: number; anchorY: number; bottomY: number }>
  bats: ReadonlyArray<{ baseX: number; baseY: number; rangeX: number }>
  torches: ReadonlyArray<{ x: number; y: number }>
  /** Escape zone (world px) — overlap it with the player box to win the room. */
  exit: Rect
}

/**
 * Hand-authored level data — the source for a fixed, learnable, speedrun-able
 * climb (Manic Miner / Jump King style). ALL coordinates are in **tiles**, with
 * `y` increasing **downward** (row 0 = ceiling). {@link buildRoomFromLevel}
 * turns it into a {@link Room}; `level.ts` holds the actual level you hand-tune.
 */
export interface LevelData {
  cols: number
  rows: number
  /** Spawn column + the floor row the rabbit stands on. */
  spawn: { x: number; y: number }
  /** Ceiling escape hole / win zone (tiles). */
  exit: { x: number; y: number; w: number; h: number }
  /** Platforms: left-top corner `(x,y)` + width `w` (tiles). `kind:'crumble'`
   *  collapses a moment after you stand on it, then respawns. */
  platforms: ReadonlyArray<{ x: number; y: number; w: number; kind?: 'moss' | 'crumble' }>
  /** Low overhangs the rabbit can only pass **crouched** — the bottom lip sits below
   *  standing height but above crouch height. `h` rows tall (default 1): the bottom
   *  row is the "duck here" lip, rows above are solid stone cap (so a gate `h` rows
   *  tall can't be jumped over). Must be narrower than the platform beneath (leaving
   *  a stand-up zone), since you can't jump from a crouch; the linter enforces it. */
  overhangs: ReadonlyArray<{ x: number; y: number; w: number; h?: number }>
  /** Ladders: column `x`, top row `y`, height `h` rows (climb mechanic: next step). */
  ladders: ReadonlyArray<{ x: number; y: number; h: number }>
  carrots: ReadonlyArray<{ x: number; y: number }>
  /** Spider drops from the ceiling down to row `y` at column `x`. */
  spiders: ReadonlyArray<{ x: number; y: number }>
  /** Bat patrols around `(x,y)` over a horizontal `range` (tiles). */
  bats: ReadonlyArray<{ x: number; y: number; range: number }>
  torches: ReadonlyArray<{ x: number; y: number }>
}

function tile(key: AtlasKey, ink: SpectrumColor, paper: SpectrumColor, solid: boolean, id: string): Tile {
  return { sprite: atlas[key].bitmap.data, ink, paper, solid, id }
}

export function buildCaveRoom(): Room {
  const map = createTileMap(ROOM_COLS, ROOM_ROWS)

  const stone = () => tile('caveStoneTile', C.WHITE, C.BLACK, true, 'stone')
  const moss = () => tile('mossPlatformTile', C.B_GREEN, C.BLACK, true, 'moss')

  // Solid border: ceiling, floor, both walls.
  map.fillRect(0, 0, ROOM_COLS, 1, stone())
  map.fillRect(0, ROOM_ROWS - 1, ROOM_COLS, 1, stone())
  map.fillRect(0, 0, 1, ROOM_ROWS, stone())
  map.fillRect(ROOM_COLS - 1, 0, 1, ROOM_ROWS, stone())

  // Ascending staircase up-and-right across a wide, horizontally-scrolling
  // world. Vertical step = 4 rows (32px): that is the minimum the ~22px-tall
  // rabbit can pass between (a smaller gap and the upper platform blocks its
  // torso like a wall). Each platform is offset ~7 cols right so none sits
  // directly overhead — no head-bonk; you arc onto the next with momentum.
  const platforms: ReadonlyArray<readonly [number, number, number]> = [
    [5, 47, 6],   // P1 (spawn is below-left of this)
    [12, 43, 6],  // P2
    [19, 39, 6],  // P3
    [26, 35, 6],  // P4
    [33, 31, 6],  // P5
    [40, 27, 6],  // P6
    [47, 23, 6],  // P7
    [54, 19, 6],  // P8
    [61, 15, 6],  // P9
    [68, 11, 6],  // P10
    [74, 7, 8],   // P11 wide top ledge
  ]
  for (const [x, y, w] of platforms) map.fillRect(x, y, w, 1, moss())

  // Escape hatch: carve a gap in the ceiling above the top ledge (P11 spans
  // cols 74–81). The opening reads as a tunnel to the moonlit surface; walk the
  // top ledge under the hole and the rabbit climbs out — the room's win.
  for (let c = 76; c < 80; c++) map.clearTile(c, 0)
  const exit: Rect = { x: 76 * CELL, y: 1 * CELL, w: 4 * CELL, h: 6 * CELL }

  // Spawn on the floor near the left; gravity + ground-snap settle the rest.
  const spawnX = 3 * CELL
  const spawnY = (ROOM_ROWS - 1) * CELL - 34

  // A carrot resting on a platform: 16×16 sprite sitting on the platform top.
  const onPlatform = (col: number, row: number) => ({ x: (col + 1) * CELL, y: row * CELL - 16 })

  const carrots = [
    onPlatform(12, 43), // on P2
    onPlatform(26, 35), // on P4
    onPlatform(40, 27), // on P6
    onPlatform(54, 19), // on P8
    onPlatform(74, 7),  // on the top ledge
  ]

  // Spiders dropping through gaps the player climbs past.
  const spiders = [
    { x: 16 * CELL, anchorY: 1 * CELL, bottomY: 36 * CELL },
    { x: 44 * CELL, anchorY: 1 * CELL, bottomY: 24 * CELL },
    { x: 64 * CELL, anchorY: 1 * CELL, bottomY: 12 * CELL },
  ]

  // Bats patrolling open mid-air stretches (they chase when you get close).
  const bats = [
    { baseX: 30 * CELL, baseY: 38 * CELL, rangeX: 7 * CELL },
    { baseX: 50 * CELL, baseY: 24 * CELL, rangeX: 6 * CELL },
    { baseX: 66 * CELL, baseY: 14 * CELL, rangeX: 6 * CELL },
  ]

  // Wall torches (world-space light sources that burn via particles).
  const torches = [
    { x: 1 * CELL, y: 46 * CELL },
    { x: 1 * CELL, y: 34 * CELL },
    { x: 1 * CELL, y: 22 * CELL },
    { x: 1 * CELL, y: 10 * CELL },
    { x: (ROOM_COLS - 2) * CELL, y: 42 * CELL },
    { x: (ROOM_COLS - 2) * CELL, y: 28 * CELL },
    { x: (ROOM_COLS - 2) * CELL, y: 14 * CELL },
  ]

  return { map, spawnX, spawnY, carrots, spiders, bats, torches, exit }
}

// ── Procedural generator (0.2.0) ──────────────────────────────────────────────

const GEN_COLS = 32       // = screen width
const TOP_BUFFER = 4      // rows above the top platform for the exit + moon

// ── Staircase rules, ALL derived from the rabbit + jump envelope (no magic
//    numbers). Shrink or grow the rabbit and the whole climb rescales to stay
//    reachable; the generate.tests.ts invariants reference these same exports. ──

/** Vertical gap between platforms — enough that the rabbit's HEAD clears the
 *  platform above (collision-box height + a tile), capped under the jump apex.
 *  Derives from the box, so it scales with the rabbit and never re-creates the
 *  head-bonk (the old `round(RABBIT_H)` collapsed clearance for a small rabbit). */
export const STEP_UP = Math.min(
  Math.floor((JUMP_APEX_PX * 0.85) / CELL),
  Math.max(2, Math.ceil(RABBIT_BOX.h / CELL) + 1),
)

/** A platform must be at least wide enough to stand and land on, plus a margin. */
export const PLAT_W_MIN = Math.ceil(RABBIT_W / CELL) + 1
const PLAT_W_MAX = PLAT_W_MIN + 2

/** Open-air gap between platforms — bounded by the horizontal jump reach (and
 *  never an X-overlap above a takeoff, which is the head-bonk trap). */
const EDGE_GAP_MIN = 0
export const EDGE_GAP_MAX = Math.max(1, Math.min(3, Math.floor(JUMP_REACH_PX / CELL)))

/** Rest ledges — wide enough to stop, breathe and turn. */
const LEDGE_W_MIN = PLAT_W_MAX + 3
const LEDGE_W_MAX = LEDGE_W_MIN + 4
const LEDGE_CHANCE = 0.25

/**
 * Builds a seeded cave: a reachable zig-zag staircase of {@link FLOOR_TARGET}
 * platforms (with occasional wide rest ledges) from the floor to a ceiling exit,
 * plus wall torches, carrots and escalating spiders/bats. Same seed → same cave.
 *
 * **Reachability rule (the fix):** each platform sits `STEP_UP` rows above the
 * previous and *entirely to one side of it* with a small air gap — never over the
 * column you jump up from. So you always hop diagonally onto a clear ledge instead
 * of bonking an overhang; the staircase flips direction at the walls. The
 * `generate.tests.ts` invariant proves this (no overlap, gap ≤ reach) over 300 seeds.
 */
export function generateCaveRoom(seed: number | string): Room {
  const rng = createRng(seed)
  const N = FLOOR_TARGET
  const rows = STEP_UP * (N + 1) + TOP_BUFFER
  const floorRow = rows - 1
  const map = createTileMap(GEN_COLS, rows)

  const stone = () => tile('caveStoneTile', C.WHITE, C.BLACK, true, 'stone')
  const moss = () => tile('mossPlatformTile', C.B_GREEN, C.BLACK, true, 'moss')

  // Solid border: ceiling, floor, both walls.
  map.fillRect(0, 0, GEN_COLS, 1, stone())
  map.fillRect(0, floorRow, GEN_COLS, 1, stone())
  map.fillRect(0, 0, 1, rows, stone())
  map.fillRect(GEN_COLS - 1, 0, 1, rows, stone())

  // Staircase: start from a virtual takeoff on the (full-width) floor, then lay
  // each platform one STEP_UP higher and beside the previous, flipping at walls.
  const spawnCol = rng.range(2, GEN_COLS - 8)
  const platforms: Array<{ col: number; row: number; w: number }> = []
  let prev = { col: spawnCol, w: 2 }
  let dir: 1 | -1 = rng.chance(0.5) ? 1 : -1
  for (let i = 1; i <= N; i++) {
    let w = rng.chance(LEDGE_CHANCE)
      ? rng.range(LEDGE_W_MIN, LEDGE_W_MAX + 1)
      : rng.range(PLAT_W_MIN, PLAT_W_MAX + 1)
    let gap = rng.range(EDGE_GAP_MIN, EDGE_GAP_MAX + 1)

    // Free interior columns on each side of prev (interior is cols 1 … GEN_COLS-2).
    const rightRoom = GEN_COLS - 1 - (prev.col + prev.w)
    const leftRoom = prev.col - 1
    // Keep heading `dir` while it has room for the platform; otherwise turn to the
    // roomier side — that's what makes the staircase zig-zag at the walls.
    if ((dir > 0 ? rightRoom : leftRoom) < w) dir = rightRoom >= leftRoom ? 1 : -1
    const room = dir > 0 ? rightRoom : leftRoom
    if (w > room) w = Math.max(PLAT_W_MIN, room) // shrink an over-wide ledge so it fits
    gap = Math.min(gap, room - w)                // shrink the gap so it can never overlap

    // Lay the platform entirely beside prev (the air gap guarantees no overhang).
    const col = dir > 0 ? prev.col + prev.w + gap : prev.col - gap - w
    const row = floorRow - STEP_UP * i
    map.fillRect(col, row, w, 1, moss())
    platforms.push({ col, row, w })
    prev = { col, w }
  }

  const top = platforms[N - 1]!
  const topCenter = top.col + (top.w >> 1)

  // Carrots on a fraction of platforms (sit 16px sprite on the platform top).
  const carrots: Array<{ x: number; y: number }> = []
  for (const p of platforms) {
    if (rng.chance(0.4)) {
      carrots.push({ x: (p.col + (p.w >> 1)) * CELL - 8, y: p.row * CELL - 16 })
    }
  }

  // Escalating enemies: one per platform at most, denser the higher you climb.
  // Floor 1 is left clear so the first hop off the ground is always safe.
  const spiders: Array<{ x: number; anchorY: number; bottomY: number }> = []
  const bats: Array<{ baseX: number; baseY: number; rangeX: number }> = []
  for (let i = 1; i < N; i++) {
    const p = platforms[i]!
    const t = (i + 1) / N // 0..1 — higher = nearer the top = harder
    if (rng.chance(0.15 + 0.5 * t)) {
      spiders.push({ x: (p.col + rng.int(p.w)) * CELL, anchorY: 1 * CELL, bottomY: (p.row - 1) * CELL })
    } else if (rng.chance(0.25 + 0.35 * t)) {
      bats.push({ baseX: (p.col + (p.w >> 1)) * CELL, baseY: (p.row + 2) * CELL, rangeX: rng.range(4, 8) * CELL })
    }
  }

  // Wall torches every ~6 rows, alternating sides — light + ambiance.
  const torches: Array<{ x: number; y: number }> = []
  let ti = 0
  for (let row = floorRow - 3; row > 5; row -= 6) {
    torches.push({ x: (ti % 2 === 0 ? 1 : GEN_COLS - 2) * CELL, y: row * CELL })
    ti++
  }

  // Escape hole in the ceiling above the top platform → tunnel to the surface.
  const holeStart = Math.max(1, Math.min(GEN_COLS - 5, topCenter - 2))
  for (let c = holeStart; c < holeStart + 4; c++) map.clearTile(c, 0)
  const exit: Rect = { x: holeStart * CELL, y: 1 * CELL, w: 4 * CELL, h: (top.row - 1) * CELL }

  // Spawn on the floor at the staircase's starting column (feet ≈ floor; the
  // ground-snap settles the rest). Offset derives from the rabbit's height.
  const spawnX = Math.max(CELL, Math.min((GEN_COLS - 2) * CELL, spawnCol * CELL))
  const spawnY = floorRow * CELL - RABBIT_H

  return { map, spawnX, spawnY, carrots, spiders, bats, torches, exit }
}

// ── Hand-authored level → Room (the speedrun-able path) ───────────────────────

/**
 * Builds a {@link Room} from hand-authored {@link LevelData} (tile coordinates,
 * y-down). Borders are solid stone; the ceiling is carved open at the exit. The
 * level is fixed — same every run, so it can be learned and speedrun. Use the
 * reachability check in `level.tests.ts` to prove a hand-tuned level is climbable.
 */
export function buildRoomFromLevel(level: LevelData): Room {
  const { cols, rows } = level
  const floorRow = rows - 1
  const map = createTileMap(cols, rows)

  const stone = () => tile('caveStoneTile', C.WHITE, C.BLACK, true, 'stone')
  const moss = () => tile('mossPlatformTile', C.B_GREEN, C.BLACK, true, 'moss')
  const crumble = () => tile('crumbleTile', C.B_YELLOW, C.BLACK, true, 'crumble')

  // Solid border: ceiling, floor, both walls.
  map.fillRect(0, 0, cols, 1, stone())
  map.fillRect(0, floorRow, cols, 1, stone())
  map.fillRect(0, 0, 1, rows, stone())
  map.fillRect(cols - 1, 0, 1, rows, stone())

  // Carve the ceiling at the exit hole.
  for (let c = level.exit.x; c < level.exit.x + level.exit.w; c++) map.clearTile(c, 0)

  for (const p of level.platforms) map.fillRect(p.x, p.y, p.w, 1, p.kind === 'crumble' ? crumble() : moss())

  // Low overhangs — only the crouched (shorter) box fits under the bottom lip. A
  // taller block (h > 1) caps the gate with solid stone so it can't be jumped over;
  // the bottom row is the cyan "duck here" lip.
  const overhangLip = () => tile('overhangTile', C.B_CYAN, C.BLACK, true, 'overhang')
  for (const o of level.overhangs) {
    const h = o.h ?? 1
    for (let r = 0; r < h; r++) {
      map.fillRect(o.x, o.y + r, o.w, 1, r === h - 1 ? overhangLip() : stone())
    }
  }

  // Ladders — non-solid climbable tiles (id 'ladder'); the player detects them.
  // A 1-tile gap punched into a platform doesn't drop the rabbit (neighbours hold).
  const ladder = () => tile('ladderTile', C.B_GREEN, C.BLACK, false, 'ladder')
  for (const l of level.ladders) {
    for (let r = l.y; r < l.y + l.h; r++) map.setTile(l.x, r, ladder())
  }

  const exit: Rect = {
    x: level.exit.x * CELL, y: level.exit.y * CELL,
    w: level.exit.w * CELL, h: level.exit.h * CELL,
  }

  const carrots = level.carrots.map((c) => ({ x: c.x * CELL, y: c.y * CELL - 16 }))
  const spiders = level.spiders.map((s) => ({ x: s.x * CELL, anchorY: 1 * CELL, bottomY: s.y * CELL }))
  const bats = level.bats.map((b) => ({ baseX: b.x * CELL, baseY: b.y * CELL, rangeX: b.range * CELL }))
  const torches = level.torches.map((t) => ({ x: t.x * CELL, y: t.y * CELL }))

  const spawnX = level.spawn.x * CELL
  const spawnY = level.spawn.y * CELL - RABBIT_H

  return { map, spawnX, spawnY, carrots, spiders, bats, torches, exit }
}

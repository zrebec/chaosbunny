/**
 * Builds a {@link Room} from hand-authored {@link LevelData} (tile coords, y-down).
 * The level is FIXED — same every run, so it can be learned and speedrun (Manic
 * Miner / Jump King style). `world/level.ts` holds the level you hand-tune, and
 * `tests/level.tests.ts` proves it stays climbable (and crouch-gates stay fair).
 */
import { createTileMap, CELL, C, type Tile, type TileMap, type SpectrumColor, type Rect } from 'zx-kit'
import { atlas, type AtlasKey } from '../art/atlas.js'
import {
  THEME_STONE_INK, THEME_MOSS_INK, THEME_CRUMBLE_INK, THEME_OVERHANG_INK, THEME_LADDER_INK,
} from '../config.js'
import { RABBIT_H } from '../rabbit.js'

export interface Room {
  map: TileMap
  /** Rabbit spawn in world pixels (sprite top-left). */
  spawnX: number
  spawnY: number
  carrots: ReadonlyArray<{ x: number; y: number }>
  spiders: ReadonlyArray<{ x: number; anchorY: number; bottomY: number }>
  bats: ReadonlyArray<{ baseX: number; baseY: number; rangeX: number }>
  mice: ReadonlyArray<{ x: number; floorY: number; minX: number; maxX: number }>
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
  /** Mouse runs on the platform whose TOP row is `y`, patrolling ±`range`
   *  tiles around column `x`. Stomp it and it flees off-screen (never dies). */
  mice: ReadonlyArray<{ x: number; y: number; range: number }>
  torches: ReadonlyArray<{ x: number; y: number }>
  /** Depth strata — fake biomes, applied at build time (no runtime switching).
   *  Each stratum starts at `fromRow` (y-down) and reaches down to the next
   *  stratum's `fromRow - 1` (the last one reaches the floor). Only the ambient
   *  inks (stone, moss) vary; mechanic tiles (crumble, overhang lip, ladder)
   *  keep their global THEME signal colours so the player can read them in
   *  every biome. Omitted inks fall back to the global theme. */
  strata?: ReadonlyArray<LevelStratum>
}

export interface LevelStratum {
  /** Topmost row of this stratum (tiles, y-down). */
  fromRow: number
  stoneInk?: SpectrumColor
  mossInk?: SpectrumColor
}

function tile(key: AtlasKey, ink: SpectrumColor, paper: SpectrumColor, solid: boolean, id: string): Tile {
  return { sprite: atlas[key].bitmap.data, ink, paper, solid, id }
}

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

  // Depth strata (fake biomes): pick the ambient ink for a row at build time.
  const strata = [...(level.strata ?? [])].sort((a, b) => a.fromRow - b.fromRow)
  const stratumAt = (row: number): LevelStratum | undefined => {
    let hit: LevelStratum | undefined
    for (const s of strata) if (row >= s.fromRow) hit = s
    return hit
  }

  const stone = (row: number) =>
    tile('caveStoneTile', stratumAt(row)?.stoneInk ?? THEME_STONE_INK, C.BLACK, true, 'stone')
  const moss = (row: number) =>
    tile('mossPlatformTile', stratumAt(row)?.mossInk ?? THEME_MOSS_INK, C.BLACK, true, 'moss')
  const crumble = () => tile('crumbleTile', THEME_CRUMBLE_INK, C.BLACK, true, 'crumble')

  // Solid border: ceiling, floor, both walls (walls per row — they cross strata).
  map.fillRect(0, 0, cols, 1, stone(0))
  map.fillRect(0, floorRow, cols, 1, stone(floorRow))
  for (let r = 0; r < rows; r++) {
    map.setTile(0, r, stone(r))
    map.setTile(cols - 1, r, stone(r))
  }

  // Carve the ceiling at the exit hole.
  for (let c = level.exit.x; c < level.exit.x + level.exit.w; c++) map.clearTile(c, 0)

  for (const p of level.platforms) map.fillRect(p.x, p.y, p.w, 1, p.kind === 'crumble' ? crumble() : moss(p.y))

  // Low overhangs — only the crouched (shorter) box fits under the bottom lip. A
  // taller block (h > 1) caps the gate with solid stone so it can't be jumped over;
  // the bottom row is the cyan "duck here" lip.
  const overhangLip = () => tile('overhangTile', THEME_OVERHANG_INK, C.BLACK, true, 'overhang')
  for (const o of level.overhangs) {
    const h = o.h ?? 1
    for (let r = 0; r < h; r++) {
      map.fillRect(o.x, o.y + r, o.w, 1, r === h - 1 ? overhangLip() : stone(o.y + r))
    }
  }

  // Ladders — non-solid climbable tiles (id 'ladder'); the player detects them.
  // A 1-tile gap punched into a platform doesn't drop the rabbit (neighbours hold).
  const ladder = () => tile('ladderTile', THEME_LADDER_INK, C.BLACK, false, 'ladder')
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
  const mice = level.mice.map((m) => ({
    x: m.x * CELL,
    floorY: m.y * CELL, // platform top — the mouse stands on it
    minX: (m.x - m.range) * CELL,
    maxX: (m.x + m.range) * CELL,
  }))
  const torches = level.torches.map((t) => ({ x: t.x * CELL, y: t.y * CELL }))

  const spawnX = level.spawn.x * CELL
  const spawnY = level.spawn.y * CELL - RABBIT_H

  return { map, spawnX, spawnY, carrots, spiders, bats, mice, torches, exit }
}

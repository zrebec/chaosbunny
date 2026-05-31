/**
 * One hand-built cave room for the 0.1.0 vertical slice.
 *
 * The room is exactly the screen width (32 tiles = 256px) and taller than the
 * screen (36 tiles = 288px), so the camera scrolls vertically as the rabbit
 * climbs — a shaft from the cave floor toward the top. Borders are solid cave
 * stone; moss platforms form a climbable path upward. Built with `fillRect`
 * for now; procedural generation replaces this in 0.2.0.
 */
import { createTileMap, CELL, C, type Tile, type TileMap, type SpectrumColor } from 'zx-kit'
import { atlas, type AtlasKey } from '../art/atlas.js'

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

  return { map, spawnX, spawnY, carrots, spiders, bats, torches }
}

/**
 * Scrolling dungeon backdrop — a separate, deeper z-layer drawn behind the
 * tilemap and entities. Five alternating 8×8 brick variants are tiled across the
 * viewport and picked per cell by a stable hash (varied but flicker-free as the
 * camera moves). It scrolls at a fraction of the camera speed (parallax) so it
 * reads as a distant wall behind the cave.
 *
 * Pure visual: the tiles are monochrome bitmaps (X/.), drawn with a transparent
 * background in a dim blue, so the black cave shows through the mortar lines.
 */
import { createBitmapFromRows, drawBitmap, createRng, CELL, C, type Bitmap, type SpectrumColor } from 'zx-kit'
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js'

const BRICK = [
  '.XXXXXXX',
  '.XXXXXXX',
  '.XXXXXXX',
  '........',
  'XXXX.XXX',
  'XXXX.XXX',
  'XXXX.XXX',
  '........',
]

const CRACK = [
  '.XXXXXXX',
  '.XXXX.XX',
  '.XXX.XXX',
  '........',
  'XXXX.XXX',
  'XXX.XXXX',
  'XXXX.XXX',
  '........',
]

const MOSS = [
  '.XXXXXXX',
  '.XX.XX.X',
  '.XXXXXXX',
  '........',
  'XXXX.XXX',
  'X.XX.XXX',
  'XXXX.XX.',
  '........',
]

const RUNE = [
  '.XXXXXXX',
  '.X.XX.XX',
  '.X.XX.XX',
  '........',
  'XXXX.XXX',
  'XXXX.XXX',
  'XXXX.XXX',
  '........',
]

const PLAIN = [
  'XXXXXXX.',
  'XXXXXXX.',
  'XXXXXXX.',
  '........',
  '.XXXXXXX',
  '.XXXXXXX',
  '.XXXXXXX',
  '........',
]

const BG_TILES: Bitmap[] = [BRICK, CRACK, MOSS, RUNE, PLAIN].map((r) => createBitmapFromRows(r))

// ── Wall decorations: chains, skulls — own ink, drawn over bricks. (Torches are
//    live world-space light sources now, see entities/torch.ts.) ──

const CHAIN = [
  '..XXX...',
  '..X.X...',
  '..XXX...',
  '..XXX...',
  '..X.X...',
  '..XXX...',
  '..XXX...',
  '..X.X...',
]

const SKULL = [
  '.XXXXXX.',
  'XXXXXXXX',
  'X.XXXX.X',
  'XXXXXXXX',
  '.XXXXXX.',
  '.X.X.X..',
  '........',
  '........',
]

interface Deco { bmp: Bitmap; ink: SpectrumColor }
const DECOS: Deco[] = [
  { bmp: createBitmapFromRows(CHAIN), ink: C.WHITE }, // rusty chain
  { bmp: createBitmapFromRows(SKULL), ink: C.WHITE }, // skull
]

/** Fraction of camera movement the backdrop scrolls at (0 = static, 1 = locked). */
const PARALLAX = 0.5
const INK = C.BLUE

// Decorations placed (deterministically, via zx-kit's seeded RNG) on the
// parallax wall grid. Keyed by "col,row" → index into DECOS.
let decoMap = new Map<string, number>()

/**
 * Seeds and scatters wall decorations across the backdrop's parallax extent.
 * Call once after the room (world size) is known. Deterministic per seed.
 */
export function initBackground(worldW: number, worldH: number, seed = 'chaosBunny-dungeon'): void {
  const rng = createRng(seed)
  const cols = Math.ceil((worldW * PARALLAX) / CELL) + 4
  const rows = Math.ceil((worldH * PARALLAX) / CELL) + 4
  const count = Math.max(1, Math.floor(cols * rows * 0.04))
  decoMap = new Map()
  for (let i = 0; i < count; i++) {
    const col = rng.int(cols)
    const row = rng.int(rows)
    decoMap.set(`${col},${row}`, rng.int(DECOS.length))
  }
}

/** Stable per-cell tile choice — same cell always picks the same variant. */
function bgIndex(col: number, row: number): number {
  let h = (Math.imul(col, 374761393) + Math.imul(row, 668265263)) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  return h % BG_TILES.length
}

/**
 * Draws the parallax dungeon wall covering the viewport. Call first each frame,
 * right after clearing to black and before the tilemap/entities.
 */
export function drawDungeonBackground(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  const ox = Math.round(camX * PARALLAX)
  const oy = Math.round(camY * PARALLAX)
  const startCol = Math.floor(ox / CELL)
  const startRow = Math.floor(oy / CELL)
  const cols = Math.ceil(GAME_WIDTH / CELL) + 1
  const rows = Math.ceil(GAME_HEIGHT / CELL) + 1

  for (let ry = 0; ry < rows; ry++) {
    const ty = startRow + ry
    for (let rx = 0; rx < cols; rx++) {
      const tx = startCol + rx
      const sx = tx * CELL - ox
      const sy = ty * CELL - oy
      drawBitmap(ctx, BG_TILES[bgIndex(tx, ty)]!, sx, sy, INK)
      const d = decoMap.get(`${tx},${ty}`)
      if (d !== undefined) {
        const deco = DECOS[d]!
        drawBitmap(ctx, deco.bmp, sx, sy, deco.ink)
      }
    }
  }
}

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

/** Stable per-cell tile choice — same cell always picks the same variant. */
function bgIndex(col: number, row: number): number {
  let h = (Math.imul(col, 374761393) + Math.imul(row, 668265263)) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  return h % BG_TILES.length
}

// Pre-rendered backdrop. The wall pattern + decorations are deterministic and
// only ever scroll (parallax), so we paint the whole parallax extent ONCE into
// an offscreen canvas and blit a window of it each frame — one `drawImage`
// instead of ~30k per-pixel `fillRect`s. (This was the GPU hog the profiler
// pointed at: drawDungeonBackground → fillRect at ~40% of the frame.)
let bgCanvas: HTMLCanvasElement | null = null
let bgW = 0
let bgH = 0

/**
 * Builds the parallax backdrop once the room (world size) is known. Renders the
 * full scrollable extent into an offscreen canvas. Deterministic per seed.
 */
export function initBackground(worldW: number, worldH: number, seed = 'chaosBunny-dungeon'): void {
  const rng = createRng(seed)
  // Cover the whole parallax window the camera can ever show, plus a tile margin.
  bgW = GAME_WIDTH + Math.ceil(worldW * PARALLAX) + CELL
  bgH = GAME_HEIGHT + Math.ceil(worldH * PARALLAX) + CELL
  const cols = Math.ceil(bgW / CELL)
  const rows = Math.ceil(bgH / CELL)

  // Scatter decorations across the grid (deterministic).
  const decoMap = new Map<string, number>()
  const count = Math.max(1, Math.floor(cols * rows * 0.04))
  for (let i = 0; i < count; i++) {
    decoMap.set(`${rng.int(cols)},${rng.int(rows)}`, rng.int(DECOS.length))
  }

  bgCanvas = document.createElement('canvas')
  bgCanvas.width = bgW
  bgCanvas.height = bgH
  const bctx = bgCanvas.getContext('2d')
  if (!bctx) return
  bctx.imageSmoothingEnabled = false
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const x = tx * CELL
      const y = ty * CELL
      drawBitmap(bctx, BG_TILES[bgIndex(tx, ty)]!, x, y, INK)
      const d = decoMap.get(`${tx},${ty}`)
      if (d !== undefined) drawBitmap(bctx, DECOS[d]!.bmp, x, y, DECOS[d]!.ink)
    }
  }
}

/**
 * Blits the parallax dungeon wall covering the viewport — a single `drawImage`.
 * Call first each frame, right after clearing to black and before the tilemap.
 */
export function drawDungeonBackground(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  if (!bgCanvas) return
  const ox = Math.max(0, Math.min(bgW - GAME_WIDTH, Math.round(camX * PARALLAX)))
  const oy = Math.max(0, Math.min(bgH - GAME_HEIGHT, Math.round(camY * PARALLAX)))
  ctx.drawImage(bgCanvas, ox, oy, GAME_WIDTH, GAME_HEIGHT, 0, 0, GAME_WIDTH, GAME_HEIGHT)
}

/**
 * Clash/mono rendering glue (chaosBunny-local).
 *
 * A {@link Painter} is "where to draw" — it lets every entity render the same way
 * in both modes without knowing which:
 *  - {@link ctxPainter} draws full colour straight to the canvas (default game).
 *  - {@link monoPainter} draws into a zx-kit {@link MonoScreen} (clash mode), so
 *    everything — tiles, rabbit, spiders, the spider thread, shots — collapses to
 *    one ink + one paper. No clash, ever; the white-spider-on-cyan problem is gone.
 *
 * The default (clash-off) view is byte-identical to before: `ctxPainter` is just
 * `drawBitmap` / `fillRect`.
 */
import {
  CELL, drawBitmap, drawMonoBitmap, fillMono, stampMono,
  type Bitmap, type MonoScreen, type SpectrumColor, type TileMap, type AttrScreen, type AttrPolicy,
} from 'zx-kit'

/** Playfield look, cycled with the `C` key:
 *  full-colour bricks → black background → mono (no-clash) → authentic clash. */
export type ViewMode = 'bricks' | 'black' | 'mono' | 'clash'

const VIEW_CYCLE: readonly ViewMode[] = ['bricks', 'black', 'mono', 'clash']

/** Next playfield look in the `C` cycle: bricks → black → mono → clash → bricks. */
export function nextViewMode(m: ViewMode): ViewMode {
  return VIEW_CYCLE[(VIEW_CYCLE.indexOf(m) + 1) % VIEW_CYCLE.length]!
}

/** A drawing target: a monochrome bitmap and a filled rectangle (lines/blocks). */
export interface Painter {
  bitmap(bmp: Bitmap, x: number, y: number, ink: SpectrumColor, paper?: SpectrumColor, inkOnly?: boolean): void
  rect(x: number, y: number, w: number, h: number, ink: SpectrumColor): void
}

/** Full-colour painter — identical to the old direct `drawBitmap` / `fillRect`. */
export function ctxPainter(ctx: CanvasRenderingContext2D): Painter {
  return {
    bitmap: (b, x, y, ink, paper, inkOnly) => drawBitmap(ctx, b, x, y, ink, paper, inkOnly),
    rect: (x, y, w, h, ink) => { ctx.fillStyle = ink; ctx.fillRect(x, y, w, h) },
  }
}

/** Monochrome painter — every draw becomes ink/paper in the {@link MonoScreen}. */
export function monoPainter(scr: MonoScreen): Painter {
  return {
    bitmap: (b, x, y) => drawMonoBitmap(scr, b, x, y),
    rect: (x, y, w, h) => fillMono(scr, x, y, w, h),
  }
}

/** Authentic-clash painter — stamps each draw into a zx-kit {@link AttrScreen}, so
 *  every 8×8 cell snaps to one ink + one paper (the real ZX colour bleed). Unlike
 *  mono, the ink colour is kept. `paper` is the fallback for draws that pass none. */
export function attrPainter(scr: AttrScreen, paper: SpectrumColor, policy: AttrPolicy = 'both'): Painter {
  return {
    bitmap: (b, x, y, ink, p) => stampMono(scr, b, x, y, ink, p ?? paper, policy),
    rect: (x, y, w, h, ink) => fillAttr(scr, x, y, w, h, ink),
  }
}

/** Packs `#RRGGBB` into a little-endian RGBA word (matches attrscreen's own packing). */
function packRGBA(hex: SpectrumColor): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
}

/** Fills a screen-space rect into the AttrScreen — lights its pixels and re-inks the
 *  cells it touches (paper kept). zx-kit has no fill helper; used for the thin spider
 *  thread (`stampMono` can't draw a sub-8px-wide line). */
function fillAttr(scr: AttrScreen, x: number, y: number, w: number, h: number, ink: SpectrumColor): void {
  const inkU32 = packRGBA(ink)
  const x0 = Math.round(x)
  const y0 = Math.round(y)
  for (let yy = y0; yy < y0 + h; yy++) {
    if (yy < 0 || yy >= scr.height) continue
    const rowBase = yy * scr.width
    const cellRow = (yy >> 3) * scr.cols
    for (let xx = x0; xx < x0 + w; xx++) {
      if (xx < 0 || xx >= scr.width) continue
      scr.pixels[rowBase + xx] = 1
      scr.cellInk[cellRow + (xx >> 3)] = inkU32
    }
  }
}

/** Draws the visible tile map through a painter (mono in clash, full colour otherwise). */
export function drawTiles(
  p: Painter,
  map: TileMap,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  const ox = Math.round(camX)
  const oy = Math.round(camY)
  const startCol = Math.floor(ox / CELL)
  const startRow = Math.floor(oy / CELL)
  const cols = Math.ceil(viewW / CELL) + 1
  const rows = Math.ceil(viewH / CELL) + 1

  for (let ry = 0; ry < rows; ry++) {
    const ty = startRow + ry
    if (ty < 0 || ty >= map.rows) continue
    for (let rx = 0; rx < cols; rx++) {
      const tx = startCol + rx
      if (tx < 0 || tx >= map.cols) continue
      const tile = map.getTile(tx, ty)
      if (tile === null) continue
      const bmp: Bitmap = { data: tile.sprite, width: CELL, height: CELL }
      p.bitmap(bmp, tx * CELL - ox, ty * CELL - oy, tile.ink, tile.paper)
    }
  }
}

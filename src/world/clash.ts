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
  CELL, drawBitmap, drawMonoBitmap, fillMono,
  type Bitmap, type MonoScreen, type SpectrumColor, type TileMap,
} from 'zx-kit'

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

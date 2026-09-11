/**
 * The title: the zx-art loading screen, loaded the way a Spectrum would load it.
 *
 * 1. `prompt` — a black screen and `LOAD ""` with the ROM's flashing cursor.
 * 2. `loading` — after a key: pilot-tone stripes in the page border (the body
 *    behind the canvas plays the Spectrum's border), then the bitmap in memory
 *    order, white on black, then the colours row by row. A key finishes it at once.
 * 3. `ready` — the picture, and a blinking prompt to start.
 *
 * The screen is a native `.scr` inlined by `scripts/screen-import.mjs` and decoded
 * with zx-kit's `parseSCR`; both finished looks are drawn once to offscreen layers
 * and the reveal only copies rows out of them.
 */
import {
  C, createLayerCache, drawBitmap, drawBitmapAttrs, drawBlinkingText, drawChar, drawText, parseSCR, refreshLayer,
  type LayerCache,
} from 'zx-kit'
import { CHAOSBUNNY_STEALTH_LOADING_SCR } from '../art/zx/chaosbunny-stealth-loading.js'
import { loadStateAt, screenRowOfMemoryRow, type LoadPhase } from './loader.js'
import type { Strings } from './strings.js'

export type TitleMode = 'prompt' | 'loading' | 'ready'

export interface Title {
  /** The bitmap alone, white ink on black paper — what a screen shows before its attributes arrive. */
  readonly mono: LayerCache
  /** The finished picture. */
  readonly colour: LayerCache
}

export function createTitle(): Title {
  const screen = parseSCR(CHAOSBUNNY_STEALTH_LOADING_SCR)
  const mono = createLayerCache(256, 192)
  refreshLayer(mono, (ctx) => {
    ctx.fillStyle = C.BLACK
    ctx.fillRect(0, 0, 256, 192)
    drawBitmap(ctx, screen.bitmap, 0, 0, C.WHITE)
  })
  const colour = createLayerCache(256, 192)
  refreshLayer(colour, (ctx) => drawBitmapAttrs(ctx, screen.bitmap, screen.attrs, 0, 0))
  return { mono, colour }
}

function rows(ctx: CanvasRenderingContext2D, layer: LayerCache, y: number, h: number): void {
  if (layer.canvas) ctx.drawImage(layer.canvas, 0, y, 256, h, 0, y, 256, h)
}

/**
 * The Spectrum border, played by the page behind the canvas: wide red and cyan
 * bands for the pilot tone, thin blue and yellow ones for the data, black otherwise.
 */
export function setBorder(phase: LoadPhase | null, now: number): void {
  const style = document.body.style
  if (phase === 'pilot') {
    style.background = 'repeating-linear-gradient(0deg, #CD0000 0 12px, #00CDCD 12px 24px)'
    style.backgroundPosition = `0 ${Math.floor(now / 8) % 24}px`
  } else if (phase === 'pixels' || phase === 'attrs') {
    style.background = 'repeating-linear-gradient(0deg, #0000CD 0 3px, #CDCD00 3px 5px, #0000CD 5px 9px, #CDCD00 9px 10px)'
    style.backgroundPosition = `0 ${Math.floor(now / 3) % 10}px`
  } else {
    style.background = ''
    style.backgroundPosition = ''
  }
}

export function renderTitle(
  ctx: CanvasRenderingContext2D, title: Title, mode: TitleMode, loadMs: number, now: number, str: Strings,
): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, 256, 192)
  if (mode === 'prompt') {
    drawText(ctx, str.loadCommand, 0, 184, C.WHITE, C.BLACK)
    // The ROM's L cursor: ink and paper swap twice a second.
    const on = Math.floor(now / 320) % 2 === 0
    drawChar(ctx, 'L'.charCodeAt(0), str.loadCommand.length * 8, 184, on ? C.BLACK : C.WHITE, on ? C.WHITE : C.BLACK)
    return
  }
  if (mode === 'loading') {
    const s = loadStateAt(loadMs)
    for (let m = 0; m < s.memoryRows; m++) rows(ctx, title.mono, screenRowOfMemoryRow(m), 1)
    for (let r = 0; r < s.attrRows; r++) rows(ctx, title.colour, r * 8, 8)
    return
  }
  rows(ctx, title.colour, 0, 192)
  const x = Math.floor((256 - str.startPrompt.length * 8) / 2)
  drawBlinkingText(ctx, str.startPrompt, x, 184, now, C.B_WHITE, C.BLACK)
}

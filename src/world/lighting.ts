/**
 * Cave lighting — now a thin *policy* layer over zx-kit's `lighting` module.
 *
 * zx-kit owns the fast *rendering*: pre-baked dither tiles per darkness level, a
 * persistent per-cell buffer that only repaints cells whose level changed, and a
 * single `drawImage` per frame (no per-frame `putImageData` — that was the GPU
 * hog). We keep the *policy* here: a **depth-scaled** ambient darkness (brightest
 * near the surface / moon, darkest at the cave floor) reduced by the light pools.
 *
 * Lights are given in *screen* pixels (camera already applied).
 */
import {
  createDarknessLayer,
  renderDarkness as drawDarkness,
  brightnessAt,
  CELL,
  type DarknessLayer,
  type Light,
} from 'zx-kit'
import { GAME_WIDTH, GAME_HEIGHT, MAX_DARKNESS, SURFACE_LIGHT_FACTOR } from '../config.js'

export type { Light } // re-export so torch.ts / main keep importing from here

let layer: DarknessLayer | null = null

/** Creates the darkness layer (pre-baked dither tiles + buffer). Call once. */
export function initLighting(): void {
  layer = createDarknessLayer(GAME_WIDTH, GAME_HEIGHT)
}

/**
 * Darkens the scene this frame. Per 8×8 cell: depth-scaled ambient darkness
 * (`MAX_DARKNESS` at the floor → `× SURFACE_LIGHT_FACTOR` near the surface),
 * reduced by the brightest light pool and quantised to the old 4 light levels for
 * the blocky ZX edge. zx-kit repaints only changed cells and blits once.
 */
export function renderDarkness(
  ctx: CanvasRenderingContext2D,
  lights: readonly Light[],
  camY: number,
  worldH: number,
): void {
  if (!layer) return
  drawDarkness(layer, ctx, (col, row) => {
    const worldY = camY + row * CELL + CELL / 2
    const depth = Math.max(0, Math.min(1, worldY / worldH))
    const cellMaxDark = MAX_DARKNESS * (SURFACE_LIGHT_FACTOR + (1 - SURFACE_LIGHT_FACTOR) * depth)
    const b = brightnessAt(col * CELL + CELL / 2, row * CELL + CELL / 2, lights)
    const level = Math.min(3, Math.floor(b * 4)) // 4 light pools → hard, blocky edge
    return ((3 - level) / 3) * cellMaxDark
  })
}

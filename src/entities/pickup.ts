/**
 * Carrot pickups. Collected pixel-perfectly: a carrot counts only when the
 * rabbit's real pixels overlap the carrot's real pixels (`masksOverlap > 0`) —
 * never on bounding-box proximity alone.
 */
import { masksOverlap, C, type PixelMask } from 'zx-kit'
import type { Painter } from '../world/clash.js'
import { atlas } from '../art/atlas.js'

export interface Carrot {
  x: number
  y: number
  collected: boolean
}

const MASK: PixelMask = atlas.carrotPickup.mask
const BMP = atlas.carrotPickup.bitmap

export function makeCarrots(spawns: ReadonlyArray<{ x: number; y: number }>): Carrot[] {
  return spawns.map((s) => ({ x: s.x, y: s.y, collected: false }))
}

/**
 * Collects any carrot whose pixels overlap the rabbit's pixels. Returns how many
 * were collected this frame (for score + SFX).
 */
export function updateCarrots(list: Carrot[], playerMask: PixelMask, px: number, py: number): number {
  let collected = 0
  for (const c of list) {
    if (c.collected) continue
    if (masksOverlap(playerMask, px, py, MASK, Math.round(c.x), Math.round(c.y)) > 0) {
      c.collected = true
      collected++
    }
  }
  return collected
}

export function renderCarrots(paint: Painter, list: Carrot[], camX: number, camY: number): void {
  for (const c of list) {
    if (c.collected) continue
    paint.bitmap(BMP, Math.round(c.x - camX), Math.round(c.y - camY), C.B_YELLOW)
  }
}

/**
 * Bat — patrols horizontally in a gentle arc. Non-lethal: a carrot spark makes
 * it flee upward and hide (it does not die). Pixel-perfect: it hurts the rabbit
 * only on real mask overlap; the carrot affects it only on real mask overlap.
 */
import { mirrorBitmap, masksOverlap, bitmapPixelMask, C, type Bitmap, type PixelMask } from 'zx-kit'
import type { Painter } from '../world/clash.js'
import { atlas } from '../art/atlas.js'
import { shotMask, type Shot } from './projectile.js'

export interface Bat {
  baseX: number
  baseY: number
  rangeX: number
  t: number
  x: number
  y: number
  facing: 1 | -1
  flee: number // ms remaining of the flee-up state; 0 = patrolling
  active: boolean
}

const FRAMES = [atlas.batWingsUp, atlas.batWingsMid, atlas.batWingsDown, atlas.batWingsMid] as const

const FLIPPED = new Map<Bitmap, Bitmap>()
const FLIPPED_MASK = new Map<Bitmap, PixelMask>()

function frameFor(b: Bat) {
  return FRAMES[Math.floor(b.t / 120) % FRAMES.length]!
}

function flippedBitmap(bitmap: Bitmap): Bitmap {
  let out = FLIPPED.get(bitmap)
  if (!out) { out = mirrorBitmap(bitmap); FLIPPED.set(bitmap, out) }
  return out
}

function flippedMask(bitmap: Bitmap): PixelMask {
  let out = FLIPPED_MASK.get(bitmap)
  if (!out) { out = bitmapPixelMask(flippedBitmap(bitmap)); FLIPPED_MASK.set(bitmap, out) }
  return out
}

export function makeBats(
  spawns: ReadonlyArray<{ baseX: number; baseY: number; rangeX: number }>,
): Bat[] {
  return spawns.map((s) => ({
    baseX: s.baseX, baseY: s.baseY, rangeX: s.rangeX,
    t: 0, x: s.baseX, y: s.baseY, facing: 1, flee: 0, active: true,
  }))
}

export interface BatResult {
  hitX: number | null
}

export function updateBats(
  list: Bat[],
  playerMask: PixelMask, px: number, py: number,
  shots: Shot[],
  dt: number,
): BatResult {
  const result: BatResult = { hitX: null }

  for (const b of list) {
    if (!b.active) continue

    if (b.flee > 0) {
      b.flee -= dt
      b.y -= 0.12 * dt // retreat upward
      if (b.flee <= 0 || b.y < b.baseY - 96) { b.active = false } // hidden
      continue
    }

    b.t += dt
    const prevX = b.x

    // Chase the rabbit when it is near; otherwise patrol the base arc.
    const targetX = px + 8
    const targetY = py + 16
    const dx = targetX - b.x
    const dy = targetY - b.y
    const dist = Math.hypot(dx, dy) || 1
    if (dist < 150) {
      const sp = 0.05 // slower than the rabbit's run → escapable but annoying
      b.x += (dx / dist) * sp * dt
      b.y += (dy / dist) * sp * dt + Math.sin(b.t * 0.02) * 0.35 // wobble
      b.baseX = b.x // so it patrols from here when the rabbit escapes
    } else {
      b.x = b.baseX + Math.sin(b.t * 0.0018) * b.rangeX
      b.y = b.baseY + Math.sin(b.t * 0.0040) * 10
    }
    b.facing = b.x >= prevX ? 1 : -1

    const bx = Math.round(b.x)
    const by = Math.round(b.y)
    const frame = frameFor(b)
    const mask = b.facing < 0 ? flippedMask(frame.bitmap) : frame.mask

    // Carrot spark → flee (pixel-perfect)
    let fled = false
    for (const shot of shots) {
      if (!shot.active) continue
      if (masksOverlap(shotMask(shot), Math.round(shot.x), Math.round(shot.y), mask, bx, by) > 0) {
        shot.active = false
        b.flee = 1400
        fled = true
        break
      }
    }
    if (fled) continue

    // Touch the rabbit → hurt (pixel-perfect)
    if (masksOverlap(playerMask, px, py, mask, bx, by) > 0) {
      result.hitX = b.x
    }
  }

  return result
}

export function renderBats(paint: Painter, list: Bat[], camX: number, camY: number): void {
  for (const b of list) {
    if (!b.active) continue
    const frame = frameFor(b)
    const bmp = b.facing < 0 ? flippedBitmap(frame.bitmap) : frame.bitmap
    paint.bitmap(bmp, Math.round(b.x - camX), Math.round(b.y - camY), C.B_MAGENTA, undefined, true)
  }
}

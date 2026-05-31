/**
 * Spider — descends on a thread, hangs, retracts, repeat. Non-lethal design: it
 * never dies. A carrot spark makes it **curl up** (and it stays curled, no
 * respawn). All decisions are pixel-perfect via `masksOverlap`:
 *  - it hurts the rabbit only when their masks overlap,
 *  - it curls only when a carrot spark's real pixels overlap its real pixels.
 */
import { drawBitmap, masksOverlap, C, type PixelMask } from 'zx-kit'
import { atlas } from '../art/atlas.js'
import { shotMask, type Shot } from './projectile.js'

type SpiderState = 'descending' | 'hanging' | 'retracting' | 'curled'

export interface Spider {
  x: number        // fixed horizontal — it drops straight down
  y: number
  anchorY: number  // thread attach point (ceiling)
  bottomY: number  // lowest point of the descent
  state: SpiderState
  timer: number
  speed: number    // px/ms
}

const BODY_MASK: PixelMask = atlas.spiderDescend.mask
const BODY_BMP = atlas.spiderDescend.bitmap
const CURLED_BMP = atlas.spiderCurled.bitmap

export function makeSpiders(
  spawns: ReadonlyArray<{ x: number; anchorY: number; bottomY: number }>,
): Spider[] {
  return spawns.map((s) => ({
    x: s.x, y: s.anchorY, anchorY: s.anchorY, bottomY: s.bottomY,
    state: 'descending', timer: 0, speed: 0.03,
  }))
}

export interface SpiderResult {
  hitX: number | null // world X of a spider that touched the rabbit this frame, else null
  curled: boolean      // a spider curled this frame (for SFX)
}

export function updateSpiders(
  list: Spider[],
  playerMask: PixelMask, px: number, py: number,
  shots: Shot[],
  dt: number,
): SpiderResult {
  const result: SpiderResult = { hitX: null, curled: false }

  for (const s of list) {
    if (s.state === 'curled') continue

    // Motion
    switch (s.state) {
      case 'descending':
        s.y += s.speed * dt
        if (s.y >= s.bottomY) { s.y = s.bottomY; s.state = 'hanging'; s.timer = 900 }
        break
      case 'hanging':
        s.timer -= dt
        if (s.timer <= 0) s.state = 'retracting'
        break
      case 'retracting':
        s.y -= s.speed * dt
        if (s.y <= s.anchorY) { s.y = s.anchorY; s.state = 'descending' }
        break
    }

    const sx = Math.round(s.x)
    const sy = Math.round(s.y)

    // Carrot spark → curl (pixel-perfect)
    for (const shot of shots) {
      if (!shot.active) continue
      if (masksOverlap(shotMask(shot), Math.round(shot.x), Math.round(shot.y), BODY_MASK, sx, sy) > 0) {
        shot.active = false
        s.state = 'curled'
        result.curled = true
        break
      }
    }
    if (s.state === 'curled') continue

    // Touch the rabbit → hurt (pixel-perfect)
    if (masksOverlap(playerMask, px, py, BODY_MASK, sx, sy) > 0) {
      result.hitX = s.x
    }
  }

  return result
}

export function renderSpiders(ctx: CanvasRenderingContext2D, list: Spider[], camX: number, camY: number): void {
  for (const s of list) {
    const sx = Math.round(s.x - camX)
    const sy = Math.round(s.y - camY)
    if (s.state !== 'curled') {
      // Thread from the ceiling anchor down to the spider's top.
      ctx.fillStyle = C.WHITE
      ctx.fillRect(sx + 7, Math.round(s.anchorY - camY), 1, Math.max(0, sy - Math.round(s.anchorY - camY)))
      drawBitmap(ctx, BODY_BMP, sx, sy, C.WHITE)
    } else {
      drawBitmap(ctx, CURLED_BMP, sx, sy, C.WHITE)
    }
  }
}

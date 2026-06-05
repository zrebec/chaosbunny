/**
 * Carrot spark — the rabbit's projectile. An 8×1 bitmap with only 4 real pixels
 * (the white ink). Collision is pixel-true: it dies on a solid tile only when a
 * real pixel sits on a solid tile (`pixelSolidCount`), and (later) hits an enemy
 * only when masks overlap. Right-facing keeps ink at columns 0–3; left-facing
 * uses a mirrored bitmap/mask so the 4 pixels lead on the left.
 */
import {
  mirrorBitmap, bitmapPixelMask, pixelSolidCount,
  type Bitmap, type PixelMask, type TileMap,
} from 'zx-kit'
import type { Painter } from '../world/clash.js'
import { atlas } from '../art/atlas.js'
import { CARROT_INK } from '../config.js'

const SPEED = 0.26 // px/ms

const RIGHT_BMP = atlas.carrotShot.bitmap
const RIGHT_MASK = atlas.carrotShot.mask
const LEFT_BMP: Bitmap = mirrorBitmap(RIGHT_BMP)
const LEFT_MASK: PixelMask = bitmapPixelMask(LEFT_BMP)

export interface Shot {
  x: number
  y: number
  vx: number
  facing: 1 | -1
  active: boolean
}

export function spawnShot(list: Shot[], x: number, y: number, facing: 1 | -1): void {
  list.push({ x, y, vx: SPEED * facing, facing, active: true })
}

export function shotMask(s: Shot): PixelMask {
  return s.facing < 0 ? LEFT_MASK : RIGHT_MASK
}

/**
 * Advances every active shot, deactivating those that hit a solid tile (by real
 * pixel) or leave the world. Compacts the list in place.
 */
export function updateShots(list: Shot[], map: TileMap, dt: number, worldW: number): void {
  for (const s of list) {
    if (!s.active) continue
    s.x += s.vx * dt
    const mask = shotMask(s)
    if (pixelSolidCount(mask, Math.round(s.x), Math.round(s.y), map) > 0) s.active = false
    else if (s.x < -8 || s.x > worldW) s.active = false
  }
  // Drop dead shots so the array stays small.
  for (let i = list.length - 1; i >= 0; i--) if (!list[i]!.active) list.splice(i, 1)
}

export function renderShots(paint: Painter, list: Shot[], camX: number, camY: number): void {
  for (const s of list) {
    if (!s.active) continue
    const bmp = s.facing < 0 ? LEFT_BMP : RIGHT_BMP
    paint.bitmap(bmp, Math.round(s.x - camX), Math.round(s.y - camY), CARROT_INK)
  }
}

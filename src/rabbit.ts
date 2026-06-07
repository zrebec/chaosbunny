/**
 * Rabbit metrics — the single source of truth for the rabbit's size.
 *
 * Everything that used to hard-code a rabbit size reads from here instead: the
 * collision box (below), the world generator's platform spacing/width
 * (`world/room.ts`), and the tests. Redraw the rabbit at any size and these
 * derive from the new bitmap automatically — the rules scale, not the numbers.
 */
import { CELL, type Rect, type PixelMask } from 'zx-kit'
import { atlas } from './art/atlas.js'

const ref = atlas.rabbitSideIdleA

/** Rabbit sprite dimensions (px), read straight from the authored art. */
export const RABBIT_W = ref.width
export const RABBIT_H = ref.height

/** Rabbit footprint in whole tiles (handy for tile-grid reasoning). */
export const RABBIT_COLS = Math.ceil(RABBIT_W / CELL)
export const RABBIT_ROWS = Math.ceil(RABBIT_H / CELL)

// Collision box, derived from the sprite's actual pixels (its mask bounding box):
//  • skip the top EAR_SKIP fraction — the bent ear tips never collide,
//  • inset the sides by SIDE_INSET fraction — a forgiving, body-shaped fit.
// The compact 24×24 art has cosmetic ear pixels in roughly the top four rows.
// The box still covers head→feet, but platforms do not snag the ear silhouette.
const EAR_SKIP = 0.17
const SIDE_INSET = 0.12

function bodyBox(m: PixelMask): Rect {
  let minR = m.height, maxR = -1, minC = m.width, maxC = -1
  for (let r = 0; r < m.height; r++) {
    const cols = m.rows[r]
    if (!cols || cols.length === 0) continue
    if (r < minR) minR = r
    if (r > maxR) maxR = r
    if (cols[0]! < minC) minC = cols[0]!
    if (cols[cols.length - 1]! > maxC) maxC = cols[cols.length - 1]!
  }
  const bw = maxC - minC + 1
  const bh = maxR - minR + 1
  const inset = Math.round(bw * SIDE_INSET)
  const top = minR + Math.round(bh * EAR_SKIP)
  return { x: minC + inset, y: top, w: Math.max(1, bw - 2 * inset), h: maxR - top + 1 }
}

/** Body collision box relative to the sprite's top-left (skips ears, forgiving). */
export const RABBIT_BOX: Rect = bodyBox(ref.mask)

// Crouch box — the rabbit's ducked silhouette. Same horizontal footprint as the
// standing box, but shorter and bottom-aligned to the standing feet, so ducking
// never sinks or floats. Its reduced height is what lets the rabbit pass under a
// low overhang it can't clear standing. Derived from the crouch art (which is
// authored feet-on-the-ground), so a redraw rescales it; the crouch-gate clearance
// window is [CROUCH_BOX.h, RABBIT_BOX.h).
const crouchBody = bodyBox(atlas.rabbitCrouch.mask)
const standFeet = RABBIT_BOX.y + RABBIT_BOX.h

/** Ducked collision box — shorter than {@link RABBIT_BOX}, same feet and footprint. */
export const CROUCH_BOX: Rect = {
  x: RABBIT_BOX.x,
  y: standFeet - crouchBody.h,
  w: RABBIT_BOX.w,
  h: crouchBody.h,
}

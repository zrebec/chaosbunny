/**
 * Rabbit metrics — the single source of truth for the rabbit's size.
 *
 * Everything that used to hard-code "24×32" reads from here instead: the
 * collision box (below), the world generator's platform spacing/width
 * (`world/room.ts`), and the tests. Redraw the rabbit at any size and these
 * derive from the new bitmap automatically — the rules scale, not the numbers.
 */
import { CELL, type Rect } from 'zx-kit'
import { atlas } from './art/atlas.js'

const ref = atlas.rabbitSideIdleA

/** Rabbit sprite dimensions (px), read straight from the authored art. */
export const RABBIT_W = ref.width
export const RABBIT_H = ref.height

/** Rabbit footprint in whole tiles (handy for tile-grid reasoning). */
export const RABBIT_COLS = Math.ceil(RABBIT_W / CELL)
export const RABBIT_ROWS = Math.ceil(RABBIT_H / CELL)

// Collision box, derived from the sprite's actual pixels (its mask bounding box):
//  • skip the top EAR_SKIP fraction — ears + crown never collide,
//  • inset the sides by SIDE_INSET fraction — a forgiving, body-shaped fit.
// Fractions (not pixels) so the box keeps the same proportions at any size.
const EAR_SKIP = 0.26
const SIDE_INSET = 0.12

function bodyBox(): Rect {
  const m = ref.mask
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
export const RABBIT_BOX: Rect = bodyBox()

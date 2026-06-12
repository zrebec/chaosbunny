/**
 * Mouse — a skittish floor critter and the game's first *stompable* enemy.
 * It patrols a platform; land on it from above (Mario-style) and it bolts
 * for the edge of the world and vanishes — it never dies, it flees (rule 8).
 * Touching it from the side hurts the rabbit. Every decision is pixel-perfect
 * via `masksOverlap` (rules 1–6): stomp, side hit and carrot scare alike.
 */
import { mirrorBitmap, masksOverlap, bitmapPixelMask, type Bitmap, type PixelMask } from 'zx-kit'
import type { Painter } from '../world/playfield.js'
import { atlas } from '../art/atlas.js'
import { THEME_MOUSE_INK } from '../config.js'
import { shotMask, type Shot } from './projectile.js'

export interface Mouse {
  /** Patrol bounds in world px (left/right turn-around points). */
  minX: number
  maxX: number
  x: number
  y: number
  dir: 1 | -1
  t: number
  /** 'patrol' walks the platform; 'flee' sprints off-world after a stomp/scare. */
  state: 'patrol' | 'flee'
  active: boolean
}

const FRAMES = [atlas.mouseA, atlas.mouseB] as const
const PATROL_SPEED = 0.03 // px/ms — slower than the rabbit, easy to read
const FLEE_SPEED = 0.18   // px/ms — panic sprint off-screen

const FLIPPED = new Map<Bitmap, Bitmap>()
const FLIPPED_MASK = new Map<Bitmap, PixelMask>()

function frameFor(m: Mouse) {
  return FRAMES[Math.floor(Math.max(0, m.t) / 110) % FRAMES.length]!
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

/** Spawns: platform-top y in world px (sprite is 8 tall, so it stands at y-8). */
export function makeMice(
  spawns: ReadonlyArray<{ x: number; floorY: number; minX: number; maxX: number }>,
): Mouse[] {
  return spawns.map((s) => ({
    minX: s.minX, maxX: s.maxX,
    x: s.x, y: s.floorY - 8,
    dir: 1, t: 0, state: 'patrol', active: true,
  }))
}

export interface MouseResult {
  /** X of a mouse that hurt the rabbit this frame (side contact), or null. */
  hitX: number | null
  /** True when the rabbit stomped a mouse — main gives a little bounce. */
  stomped: boolean
}

export function updateMice(
  list: Mouse[],
  playerMask: PixelMask, px: number, py: number,
  playerVy: number, playerFeetY: number,
  shots: Shot[],
  dt: number,
  worldW: number,
): MouseResult {
  const result: MouseResult = { hitX: null, stomped: false }

  for (const m of list) {
    if (!m.active) continue
    m.t += dt

    if (m.state === 'flee') {
      m.x += m.dir * FLEE_SPEED * dt
      // Gone past the world edge → vanished into the unknown (not dead — fled).
      if (m.x < -16 || m.x > worldW) m.active = false
      continue
    }

    // Patrol between the platform bounds.
    m.x += m.dir * PATROL_SPEED * dt
    if (m.x <= m.minX) { m.x = m.minX; m.dir = 1 }
    if (m.x >= m.maxX) { m.x = m.maxX; m.dir = -1 }

    const mx = Math.round(m.x)
    const my = Math.round(m.y)
    const frame = frameFor(m)
    const mask = m.dir < 0 ? flippedMask(frame.bitmap) : frame.mask

    // Carrot spark → scare it off (pixel-perfect).
    let scared = false
    for (const shot of shots) {
      if (!shot.active) continue
      if (masksOverlap(shotMask(shot), Math.round(shot.x), Math.round(shot.y), mask, mx, my) > 0) {
        shot.active = false
        m.state = 'flee'
        m.dir = shot.x < m.x ? 1 : -1 // run away from the shot
        scared = true
        break
      }
    }
    if (scared) continue

    // Rabbit contact (pixel-perfect). Falling onto its back = stomp → it bolts;
    // anything else = the rabbit gets hurt.
    if (masksOverlap(playerMask, px, py, mask, mx, my) > 0) {
      const stomp = playerVy > 0 && playerFeetY <= my + 6
      if (stomp) {
        m.state = 'flee'
        m.dir = px + 8 < m.x ? 1 : -1 // bolt away from the rabbit
        result.stomped = true
      } else {
        result.hitX = m.x
      }
    }
  }

  return result
}

export function renderMice(paint: Painter, list: Mouse[], camX: number, camY: number): void {
  for (const m of list) {
    if (!m.active) continue
    const frame = frameFor(m)
    const bmp = m.dir < 0 ? flippedBitmap(frame.bitmap) : frame.bitmap
    paint.bitmap(bmp, Math.round(m.x - camX), Math.round(m.y - camY), THEME_MOUSE_INK, undefined, true)
  }
}

/**
 * The rabbit — entity + animation state machine + snappy platformer movement.
 *
 * Ground detection uses an explicit probe (solid tile 1px below the body box)
 * rather than relying on collision-resolver flags — that keeps `onGround` rock
 * stable, which fixes both the trembling (state no longer flickers idle↔jump)
 * and the jump (a press always registers while grounded). Jump feel: coyote
 * time, jump buffering, variable height, and heavier fall gravity.
 *
 * Tile movement resolves against a tight, facing-aware body box (the mask's
 * bounding rect, mirrored when facing left). Entity-vs-entity hits use real
 * `masksOverlap` elsewhere.
 */
import {
  drawBitmap, mirrorBitmap, bitmapPixelMask, resolveRectX, resolveRectY, isHeld, CELL,
  type Rect, type Bitmap, type PixelMask, type TileMap,
} from 'zx-kit'
import { atlas, type SpriteAsset } from '../art/atlas.js'
import { physics, RABBIT_INK } from '../config.js'

export type PlayerState = 'idle' | 'walk' | 'jump' | 'crouch' | 'shoot'

export interface Player {
  x: number
  y: number
  vx: number
  vy: number
  facing: 1 | -1
  onGround: boolean
  state: PlayerState
  animTime: number
  shootLock: number
  coyote: number
  jumpBuffer: number
  jumpHeld: boolean
  fireHeld: boolean
  /** Hit points. */
  hp: number
  /** Invulnerability time remaining after a hit (ms) — also drives the blink. */
  invuln: number
  /** Knockback time remaining (ms) — suspends movement control. */
  knockback: number
  /** Spawn position — used by the safety net to recover from a bad state. */
  homeX: number
  homeY: number
}

/** Events emitted by a single update — drive SFX and projectile spawning. */
export interface PlayerEvents {
  jumped: boolean
  landed: boolean
  shot: boolean
}

const SPRITE_W = atlas.rabbitSideIdleA.width

// Hand-tuned body collision box (relative to the 24×32 sprite origin). It skips
// the ears and the top of the head (rows 0–7) so the rabbit is ~22px tall for
// collision — short enough to slip between platforms a bit more than its full
// sprite height — and narrower than the art for a forgiving fit.
const BOX: Rect = { x: 2, y: 8, w: 12, h: 22 }

/** Player collision height in pixels — used by spawn placement. */
export const PLAYER_HEIGHT = BOX.y + BOX.h

function box(p: Player): Rect {
  const bx = p.facing < 0 ? SPRITE_W - (BOX.x + BOX.w) : BOX.x
  return { x: p.x + bx, y: p.y + BOX.y, w: BOX.w, h: BOX.h }
}

/** True when a solid tile sits directly beneath the box bottom (with 1px tolerance). */
function solidBelow(b: Rect, map: TileMap): boolean {
  const ty = Math.floor((b.y + b.h) / CELL)
  const x0 = Math.floor(b.x / CELL)
  const x1 = Math.floor((b.x + b.w - 1) / CELL)
  for (let tx = x0; tx <= x1; tx++) if (map.isSolid(tx, ty)) return true
  return false
}

export function createPlayer(spawnX: number, spawnY: number): Player {
  return {
    x: spawnX, y: spawnY, vx: 0, vy: 0,
    facing: 1, onGround: false, state: 'idle',
    animTime: 0, shootLock: 0, coyote: 0, jumpBuffer: 0,
    jumpHeld: false, fireHeld: false,
    hp: 3, invuln: 0, knockback: 0,
    homeX: spawnX, homeY: spawnY,
  }
}

/**
 * Applies damage from a hit source at world X `fromX`. No-op while invulnerable.
 * Sets invulnerability, a short knockback away from the source, and returns
 * whether damage actually landed (for SFX / screen flash).
 */
export function damagePlayer(p: Player, fromX: number): boolean {
  if (p.invuln > 0) return false
  p.hp -= 1
  p.invuln = 1200
  p.knockback = 220
  const away = p.x + 8 < fromX ? -1 : 1
  p.vx = away * 0.25
  p.vy = -0.28
  p.onGround = false
  return true
}

export function updatePlayer(p: Player, map: TileMap, dt: number): PlayerEvents {
  const events: PlayerEvents = { jumped: false, landed: false, shot: false }
  const wasGround = p.onGround
  if (p.invuln > 0) p.invuln -= dt

  const left = isHeld('ArrowLeft') || isHeld('a') || isHeld('A')
  const right = isHeld('ArrowRight') || isHeld('d') || isHeld('D')
  const down = isHeld('ArrowDown') || isHeld('s') || isHeld('S')
  const jump = isHeld(' ') || isHeld('ArrowUp') || isHeld('w') || isHeld('W')
  const fire = isHeld('z') || isHeld('Z') || isHeld('Control')

  const jumpPressed = jump && !p.jumpHeld
  const firePressed = fire && !p.fireHeld
  const crouching = down && p.onGround

  // ── Horizontal: accelerate on the ground, preserve momentum in the air ──
  // This is what makes a running jump arc forward like a thrown projectile —
  // vx carries through the whole parabola instead of snapping to 0.
  let dir = (right ? 1 : 0) - (left ? 1 : 0)
  if (crouching) dir = 0
  if (p.knockback > 0) { p.knockback -= dt; dir = 0 } // no control mid-knockback
  if (dir !== 0) {
    p.facing = dir > 0 ? 1 : -1
    const target = dir * physics.maxSpeed
    const a = (p.onGround ? physics.accelGround : physics.accelAir) * dt
    if (p.vx < target) p.vx = Math.min(target, p.vx + a)
    else if (p.vx > target) p.vx = Math.max(target, p.vx - a)
  } else if (p.onGround) {
    // Friction only on the ground; in the air we keep the launch momentum.
    const f = physics.frictionGround * dt
    if (p.vx > 0) p.vx = Math.max(0, p.vx - f)
    else if (p.vx < 0) p.vx = Math.min(0, p.vx + f)
  }

  // ── Jump: buffer the press, allow within coyote window ──
  p.jumpBuffer = jumpPressed ? physics.jumpBufferMs : Math.max(0, p.jumpBuffer - dt)
  p.coyote = p.onGround ? physics.coyoteMs : Math.max(0, p.coyote - dt)
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = physics.jumpVelocity
    p.onGround = false
    p.coyote = 0
    p.jumpBuffer = 0
    events.jumped = true
  }
  // Variable height: releasing mid-rise cuts the jump short.
  if (!jump && p.jumpHeld && p.vy < 0) p.vy *= physics.jumpCut

  // ── Shoot (rising edge, gated by a short anim/cooldown lock) ──
  if (firePressed && p.shootLock <= 0) {
    p.shootLock = 150
    events.shot = true
  }
  if (p.shootLock > 0) p.shootLock -= dt

  // ── Gravity (heavier while falling) ──
  const g = p.vy > 0 ? physics.fallGravity : physics.gravity
  p.vy = Math.min(p.vy + g * dt, physics.maxFallSpeed)

  // ── Move & resolve, sub-stepped (≤ MAX_STEP px) so fast motion can't tunnel
  //    through 8px-thin platforms — resolveRect* only checks the leading edge. ──
  const MAX_STEP = 4

  const dx = p.vx * dt
  const xSteps = Math.max(1, Math.ceil(Math.abs(dx) / MAX_STEP))
  const sx = dx / xSteps
  for (let i = 0; i < xSteps; i++) {
    const b = box(p)
    const r = resolveRectX(b, map, b.x + sx)
    p.x += r.x - b.x
    if (r.hitLeft || r.hitRight) { p.vx = 0; break }
  }

  const dy = p.vy * dt
  const ySteps = Math.max(1, Math.ceil(Math.abs(dy) / MAX_STEP))
  const sy = dy / ySteps
  for (let i = 0; i < ySteps; i++) {
    const b = box(p)
    const r = resolveRectY(b, map, b.y + sy)
    p.y += r.y - b.y
    if (r.hitTop && p.vy < 0) { p.vy = 0; break }
    if (r.hitBottom) { p.vy = 0; break }
  }

  // ── Stable ground state via probe + flush snap (no sinking, no flicker) ──
  const bb = box(p)
  if (solidBelow(bb, map)) {
    p.onGround = true
    if (p.vy > 0) {
      const floorTop = Math.floor((bb.y + bb.h) / CELL) * CELL
      p.y += floorTop - (bb.y + bb.h) // align flush, kill sub-pixel sink
      p.vy = 0
    }
  } else {
    p.onGround = false
  }
  if (p.onGround && !wasGround && p.vy >= 0) events.landed = true

  // ── Safety net: never let the rabbit go non-finite or escape the world ──
  const worldW = map.cols * CELL
  const worldH = map.rows * CELL
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) ||
      p.x < -64 || p.x > worldW + 64 || p.y < -64 || p.y > worldH + 64) {
    p.x = p.homeX
    p.y = p.homeY
    p.vx = 0
    p.vy = 0
    p.onGround = false
  }

  // ── Animation state ──
  p.animTime += dt
  if (p.shootLock > 0) p.state = 'shoot'
  else if (!p.onGround) p.state = 'jump'
  else if (crouching) p.state = 'crouch'
  else if (Math.abs(p.vx) > 0.01) p.state = 'walk'
  else p.state = 'idle'

  p.jumpHeld = jump
  p.fireHeld = fire
  return events
}

function frameAsset(p: Player): SpriteAsset {
  switch (p.state) {
    case 'jump': return atlas.rabbitJump
    case 'crouch': return atlas.rabbitCrouch
    case 'shoot': return atlas.rabbitShoot
    case 'walk': return Math.floor(p.animTime / 110) % 2 === 0 ? atlas.rabbitWalkA : atlas.rabbitWalkB
    case 'idle':
    default: return Math.floor(p.animTime / 600) % 2 === 0 ? atlas.rabbitSideIdleA : atlas.rabbitSideIdleB
  }
}

const flipCache = new Map<SpriteAsset, Bitmap>()
function flipped(a: SpriteAsset): Bitmap {
  let f = flipCache.get(a)
  if (!f) { f = mirrorBitmap(a.bitmap); flipCache.set(a, f) }
  return f
}

const maskFlipCache = new Map<SpriteAsset, PixelMask>()
function flippedMask(a: SpriteAsset): PixelMask {
  let m = maskFlipCache.get(a)
  if (!m) { m = bitmapPixelMask(flipped(a)); maskFlipCache.set(a, m) }
  return m
}

/** The rabbit's current pixel mask (matching the drawn frame and facing). */
export function playerMask(p: Player): PixelMask {
  const a = frameAsset(p)
  return p.facing < 0 ? flippedMask(a) : a.mask
}

export function renderPlayer(ctx: CanvasRenderingContext2D, p: Player, camX: number, camY: number): void {
  // Blink while invulnerable.
  if (p.invuln > 0 && Math.floor(p.invuln / 70) % 2 === 1) return
  const asset = frameAsset(p)
  const bmp = p.facing < 0 ? flipped(asset) : asset.bitmap
  drawBitmap(ctx, bmp, Math.round(p.x - camX), Math.round(p.y - camY), RABBIT_INK)
}

/** Current collision box in world pixels — for the debug overlay. */
export function playerBox(p: Player): Rect {
  return box(p)
}

/** Muzzle point (world px) for spawning a carrot shot, in the facing direction. */
export function muzzle(p: Player): { x: number; y: number } {
  const b = box(p)
  return {
    x: p.facing > 0 ? b.x + b.w : b.x - 8,
    y: b.y + Math.floor(b.h * 0.32),
  }
}

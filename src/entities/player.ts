/**
 * The rabbit — entity + animation state machine + snappy platformer movement.
 *
 * Ground detection uses an explicit probe (solid tile 1px below the body box)
 * rather than relying on collision-resolver flags — that keeps `onGround` rock
 * stable, which fixes both the trembling (state no longer flickers idle↔jump)
 * and the jump (a press always registers while grounded). The jump is a Jump-King
 * charge-jump: hold to charge while rooted, release to leap; no mid-air steering.
 *
 * Tile movement resolves against a tight, facing-aware body box (the mask's
 * bounding rect, mirrored when facing left). Entity-vs-entity hits use real
 * `masksOverlap` elsewhere.
 */
import {
  mirrorBitmap, bitmapPixelMask, resolveRectX, resolveRectY, isHeld, CELL,
  type Rect, type Bitmap, type PixelMask, type TileMap, type SpectrumColor,
} from 'zx-kit'
import type { Painter } from '../world/playfield.js'
import { atlas, type RabbitAsset } from '../art/atlas.js'
import { RABBIT_BOX, CROUCH_BOX } from '../rabbit.js'
import {
  physics, chargeVelocity, ANIM_WALK_MS, ANIM_IDLE_MS,
  THEME_RABBIT_BODY_INK, THEME_RABBIT_BELLY_INK, THEME_RABBIT_ACCENT_INK, THEME_RABBIT_EYE_INK,
} from '../config.js'

export type PlayerState = 'idle' | 'walk' | 'jump' | 'crouch' | 'shoot' | 'climb' | 'charge'

export interface Player {
  x: number
  y: number
  vx: number
  vy: number
  facing: 1 | -1
  onGround: boolean
  /** True while ducked: shorter collision box, can crawl, cannot jump. */
  crouching: boolean
  state: PlayerState
  animTime: number
  shootLock: number
  coyote: number
  /** Charge-jump: ms Space has been held while rooted (0 when not charging). */
  chargeMs: number
  /** True while charging a jump (rooted in place, Space held). */
  charging: boolean
  jumpHeld: boolean
  fireHeld: boolean
  /** True while gripping a ladder (gravity suspended, vertical control). */
  onLadder: boolean
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

// Body collision box — derived from the rabbit's actual pixels in `rabbit.ts`
// (skips the ears, forgiving side inset). Scales with the sprite size, so a
// redraw needs no change here.
const BOX: Rect = RABBIT_BOX

/** Player collision height in pixels — used by spawn placement. */
export const PLAYER_HEIGHT = BOX.y + BOX.h

function box(p: Player): Rect {
  const b = p.crouching ? CROUCH_BOX : BOX
  const bx = p.facing < 0 ? SPRITE_W - (b.x + b.w) : b.x
  return { x: p.x + bx, y: p.y + b.y, w: b.w, h: b.h }
}

/** True when the rabbit can stand up here — no solid in the headroom the standing
 *  box needs above the crouch box. Keeps it crouched under a low overhang. */
function canStand(p: Player, map: TileMap): boolean {
  const bx = p.facing < 0 ? SPRITE_W - (BOX.x + BOX.w) : BOX.x
  const x0 = Math.floor((p.x + bx) / CELL)
  const x1 = Math.floor((p.x + bx + BOX.w - 1) / CELL)
  const ty0 = Math.floor((p.y + BOX.y) / CELL)            // standing box top
  const ty1 = Math.floor((p.y + CROUCH_BOX.y - 1) / CELL) // just above the crouch box top
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (map.isSolid(tx, ty)) return false
  return true
}

/** True when a FLOOR sits directly beneath the box bottom — not a flanking wall.
 *  A floor column is solid below the feet but open at foot level; a side wall is
 *  solid at BOTH (it spans the body's whole height). Only counting true floors
 *  fixes the "rabbit floats up to the sky" bug: when the body box dipped a pixel
 *  into a border wall, that wall column read as ground, so `onGround` stuck true
 *  in mid-air — refreshing coyote time and snapping the rabbit upward, letting it
 *  ratchet up the wall (even with no key held). */
function solidBelow(b: Rect, map: TileMap): boolean {
  const feetRow = Math.floor((b.y + b.h - 1) / CELL) // row the feet occupy
  const belowRow = Math.floor((b.y + b.h) / CELL)    // row just beneath the feet
  const x0 = Math.floor(b.x / CELL)
  const x1 = Math.floor((b.x + b.w - 1) / CELL)
  for (let tx = x0; tx <= x1; tx++)
    if (map.isSolid(tx, belowRow) && !map.isSolid(tx, feetRow)) return true
  return false
}

/**
 * Pushes the body box out of any wall it overlaps horizontally, back to flush.
 *
 * The box is facing-aware (mirrored to match the sprite), so turning around while
 * snug against a wall teleports the asymmetric box a few px *into* it on a frame
 * with no horizontal move — and the leading-edge tile resolver only corrects the
 * edge it's travelling toward. Left embedded, `resolveRectY` reads the wall under
 * the box's bottom edge as a FLOOR and snaps the box onto its "top" — i.e. up one
 * cell — every frame, ratcheting the rabbit up the wall and out through the ceiling
 * (the "fly slowly up to the sky" bug; out-of-bounds tiles count as solid, so above
 * the ceiling is solid too). Re-flushing here keeps the box in free space, so the
 * resolver only ever sees real floors. Checks the box's own rows (body height), so
 * a real floor below — or an overhang cap above a crouch — never trips it.
 */
function depenetrateX(p: Player, map: TileMap): void {
  const b = box(p)
  const rowTop = Math.floor(b.y / CELL)
  const rowBot = Math.floor((b.y + b.h - 1) / CELL)
  const colSolid = (tx: number): boolean => {
    for (let ty = rowTop; ty <= rowBot; ty++) if (map.isSolid(tx, ty)) return true
    return false
  }
  const colR = Math.floor((b.x + b.w - 1) / CELL)
  if (colSolid(colR)) { p.x -= (b.x + b.w) - colR * CELL; p.vx = 0; return } // flush to a wall on the right
  const colL = Math.floor(b.x / CELL)
  if (colSolid(colL)) { p.x += (colL + 1) * CELL - b.x; p.vx = 0 }           // flush to a wall on the left
}

/** Column of a ladder tile overlapping the body box, or -1 if none in reach. */
function ladderColAt(b: Rect, map: TileMap): number {
  const x0 = Math.floor(b.x / CELL)
  const x1 = Math.floor((b.x + b.w - 1) / CELL)
  const y0 = Math.floor(b.y / CELL)
  const y1 = Math.floor((b.y + b.h - 1) / CELL)
  for (let tx = x0; tx <= x1; tx++)
    for (let ty = y0; ty <= y1; ty++)
      if (map.getTile(tx, ty)?.id === 'ladder') return tx
  return -1
}

export function createPlayer(spawnX: number, spawnY: number): Player {
  return {
    x: spawnX, y: spawnY, vx: 0, vy: 0,
    facing: 1, onGround: false, crouching: false, state: 'idle',
    animTime: 0, shootLock: 0, coyote: 0, chargeMs: 0, charging: false,
    jumpHeld: false, fireHeld: false, onLadder: false,
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
  const climbUp = isHeld('ArrowUp')                 // ladders use Up/Down…
  const jump = isHeld(' ') || isHeld('w') || isHeld('W')  // …jump is Space/W
  const fire = isHeld('z') || isHeld('Z') || isHeld('Control')

  const jumpPressed = jump && !p.jumpHeld
  const firePressed = fire && !p.fireHeld

  // ── Ladders: a second route where a jump can't go (stacked / too-high platforms).
  // Grab with Up; climb with Up/Down; step off with Left/Right or hop off with jump.
  const ladderCol = ladderColAt(box(p), map)
  if (!p.onLadder && ladderCol >= 0 && climbUp) p.onLadder = true
  if (p.onLadder) {
    if (ladderCol < 0 || left || right || jumpPressed) {
      p.onLadder = false
      if (jumpPressed) { p.vy = physics.jumpVelocity; p.onGround = false; events.jumped = true }
      // fall through to normal movement this frame
    } else {
      p.x = ladderCol * CELL + (CELL - SPRITE_W) / 2 // centre the sprite on the rungs
      p.vx = 0
      p.vy = 0
      if (climbUp) p.y -= physics.climbSpeed * dt
      else if (down) p.y += physics.climbSpeed * dt
      p.state = 'climb'
      p.animTime += dt
      p.jumpHeld = jump
      p.fireHeld = fire
      return events
    }
  }

  // Crouch: duck on purpose (Down on the ground), and stay ducked while a low
  // ceiling blocks standing up. You can crawl crouched — but you cannot jump.
  const wantCrouch = down && p.onGround
  p.crouching = p.onGround && (wantCrouch || (p.crouching && !canStand(p, map)))

  // ── Charge-jump (Jump King): hold Space to charge while rooted, release to leap.
  // Height = how long you held before release (`chargeVelocity`: diminishing returns,
  // NO cap → over-charging overshoots and you fall). You can't charge from a Down-
  // crouch (no jump from a crouch). A short coyote window still lets you start a
  // charge just after stepping off a ledge.
  p.coyote = p.onGround ? physics.coyoteMs : Math.max(0, p.coyote - dt)
  const canCharge = (p.onGround || p.coyote > 0) && !p.crouching && !p.onLadder
  let launch = false
  if (p.charging) {
    if (!jump) launch = true                                       // released → leap
    else if (p.crouching) { p.charging = false; p.chargeMs = 0 }   // ducked → cancel
    else if (!canCharge) launch = true                            // ground gone past coyote → leap
    else p.chargeMs += dt                                          // keep charging
  } else if (jump && canCharge && p.onGround) {
    p.charging = true                                             // start charging (rooted)
    p.chargeMs += dt
  }
  if (launch) {
    p.vy = chargeVelocity(p.chargeMs)
    p.vx = p.facing * physics.hopSpeed                            // always a forward hop
    p.onGround = false
    p.coyote = 0
    p.charging = false
    p.chargeMs = 0
    events.jumped = true
  }

  // ── Horizontal: run on the ground; rooted while charging; NO mid-air steering
  //    (the hop's arc commits at launch — pure Jump King; vx keeps its launch value). ──
  let dir = (right ? 1 : 0) - (left ? 1 : 0)
  if (p.knockback > 0) { p.knockback -= dt; dir = 0 } // no control mid-knockback
  if (p.charging) {
    p.vx = 0                                          // rooted: charge from a standstill…
    if (dir !== 0) p.facing = dir > 0 ? 1 : -1        // …but you may aim the upcoming hop
  } else if (p.onGround) {
    if (dir !== 0) {
      p.facing = dir > 0 ? 1 : -1
      const target = dir * (p.crouching ? physics.crouchSpeed : physics.maxSpeed) // crawl when ducked
      const a = physics.accelGround * dt
      if (p.vx < target) p.vx = Math.min(target, p.vx + a)
      else if (p.vx > target) p.vx = Math.max(target, p.vx - a)
    } else {
      const f = physics.frictionGround * dt
      if (p.vx > 0) p.vx = Math.max(0, p.vx - f)
      else if (p.vx < 0) p.vx = Math.min(0, p.vx + f)
    }
  }

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
  // Clean up any wall the box ended up inside (facing flip / crouch box / lag) before
  // the vertical pass — an embedded box makes resolveRectY climb the wall (see above).
  depenetrateX(p, map)

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
  if (p.charging) p.state = 'charge'          // rooted, winding up a leap
  else if (p.crouching) p.state = 'crouch'    // crouch-shoot keeps the low pose (shot leaves low)
  else if (p.shootLock > 0) p.state = 'shoot'
  else if (!p.onGround) p.state = 'jump'
  else if (Math.abs(p.vx) > 0.01) p.state = 'walk'
  else p.state = 'idle'

  p.jumpHeld = jump
  p.fireHeld = fire
  return events
}

function frameAsset(p: Player): RabbitAsset {
  switch (p.state) {
    case 'jump': return atlas.rabbitJump
    // Charge winds up from the crouch (anticipation); a dedicated squash pose comes
    // with the rabbit redraw.
    case 'charge': return atlas.rabbitCrouch
    case 'crouch': return atlas.rabbitCrouch
    case 'shoot': return atlas.rabbitShoot
    case 'climb': return atlas.rabbitSideIdleA // dedicated climb pose: later
    case 'walk': {
      // 3-beat gait: stride → passing → stride → passing.
      const cycle = [atlas.rabbitWalkA, atlas.rabbitWalkB, atlas.rabbitWalkC, atlas.rabbitWalkB]
      return cycle[Math.floor(p.animTime / ANIM_WALK_MS) % cycle.length]!
    }
    case 'idle':
    default: return Math.floor(p.animTime / ANIM_IDLE_MS) % 2 === 0 ? atlas.rabbitSideIdleA : atlas.rabbitSideIdleB
  }
}

const flipCache = new Map<Bitmap, Bitmap>()
function flippedBitmap(bitmap: Bitmap): Bitmap {
  let f = flipCache.get(bitmap)
  if (!f) { f = mirrorBitmap(bitmap); flipCache.set(bitmap, f) }
  return f
}

const maskFlipCache = new Map<RabbitAsset, PixelMask>()
function flippedMask(a: RabbitAsset): PixelMask {
  let m = maskFlipCache.get(a)
  if (!m) { m = bitmapPixelMask(flippedBitmap(a.bitmap)); maskFlipCache.set(a, m) }
  return m
}

/** The rabbit's current pixel mask (matching the drawn frame and facing). */
export function playerMask(p: Player): PixelMask {
  const a = frameAsset(p)
  return p.facing < 0 ? flippedMask(a) : a.mask
}

export function renderPlayer(paint: Painter, p: Player, camX: number, camY: number, soloInk?: SpectrumColor): void {
  // Blink while invulnerable.
  if (p.invuln > 0 && Math.floor(p.invuln / 70) % 2 === 1) return
  const asset = frameAsset(p)
  const x = Math.round(p.x - camX)
  const y = Math.round(p.y - camY)
  const layer = (bitmap: Bitmap): Bitmap => p.facing < 0 ? flippedBitmap(bitmap) : bitmap

  // Clash view: draw the whole silhouette in ONE ink, so the rabbit doesn't clash
  // with itself (its colour layers would each re-attribute the cells they touch). It
  // still clashes with obstacles per cell — the rabbit is stamped last, so a shared
  // 8×8 cell snaps to the rabbit's ink.
  if (soloInk) {
    paint.bitmap(layer(asset.bitmap), x, y, soloInk, undefined, true)
    return
  }

  // Four colour layers in the full-colour view. In mono they all collapse to one
  // ink — a clean rabbit silhouette, no clash. The authored sprite is mono-first:
  // white body, cyan underside shade, magenta ear/nose accents, black eye.
  paint.bitmap(layer(asset.layers.body), x, y, THEME_RABBIT_BODY_INK, undefined, true)
  paint.bitmap(layer(asset.layers.belly), x, y, THEME_RABBIT_BELLY_INK, undefined, true)
  paint.bitmap(layer(asset.layers.accent), x, y, THEME_RABBIT_ACCENT_INK, undefined, true)
  paint.bitmap(layer(asset.layers.eye), x, y, THEME_RABBIT_EYE_INK, undefined, true)
}

/** Current collision box in world pixels — for the debug overlay. */
export function playerBox(p: Player): Rect {
  return box(p)
}

/** Muzzle point (world px) for spawning a carrot shot, in the facing direction.
 *  Two distinct heights for feel: standing fires from shoulder/arm height; crouching
 *  fires low, skimming the ground — so a low bat is only hittable from a crouch (and a
 *  higher one only standing). The box is already crouch-aware, so the feet line is shared. */
export function muzzle(p: Player): { x: number; y: number } {
  const b = box(p)
  const y = p.crouching ? b.y + b.h - 4 : b.y + Math.round(b.h * 0.4)
  return {
    x: p.facing > 0 ? b.x + b.w : b.x - 8,
    y,
  }
}

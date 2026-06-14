import { describe, it, expect, vi } from 'vitest'

// The charge-jump tests drive held keys; swap zx-kit's DOM-backed isHeld for a Set.
const { HELD } = vi.hoisted(() => ({ HELD: new Set<string>() }))
vi.mock('zx-kit', async (orig) => {
  const real = await orig<typeof import('zx-kit')>()
  return { ...real, isHeld: (k: string) => HELD.has(k) }
})

import { createTileMap, CELL, C, type Tile } from 'zx-kit'
import { createPlayer, updatePlayer, playerBox } from '../src/entities/player.js'
import { chargeVelocity, physics } from '../src/config.js'
import { atlas } from '../src/art/atlas.js'

/** Set the currently-held keys (mirrors zx-kit isHeld for the player input). */
function hold(...keys: string[]): void { HELD.clear(); for (const k of keys) HELD.add(k) }

function solidTile(): Tile {
  return { sprite: atlas.caveStoneTile.bitmap.data, ink: C.WHITE, paper: C.BLACK, solid: true, id: 'stone' }
}

describe('player physics — the "rabbit flew to infinity" bug', () => {
  it('a fast fall lands on a 1-tile platform instead of tunnelling through it', () => {
    const map = createTileMap(6, 20)
    map.fillRect(0, 10, 6, 1, solidTile()) // 1-tile platform at row 10 → top edge y=80

    const player = createPlayer(2 * CELL, 0)
    const box0 = playerBox(player)
    const bottomOffset = (box0.y - player.y) + box0.h
    player.y = 80 - bottomOffset - 10 // box bottom at y=70, just above the platform
    player.vy = 0.6                    // big downward speed: full-step would overshoot the 8px platform

    updatePlayer(player, map, 50)

    const b = playerBox(player)
    expect(player.onGround).toBe(true)
    expect(b.y + b.h).toBe(80) // rests exactly on the platform surface — did not pass through
  })

  it('recovers to spawn if the position ever becomes non-finite', () => {
    const map = createTileMap(6, 20)
    map.fillRect(0, 19, 6, 1, solidTile())
    const player = createPlayer(2 * CELL, 5 * CELL)
    player.y = Number.NaN

    updatePlayer(player, map, 16)

    expect(Number.isFinite(player.x)).toBe(true)
    expect(Number.isFinite(player.y)).toBe(true)
    expect(player.x).toBe(player.homeX)
    expect(player.y).toBe(player.homeY)
  })

  it('does not climb a wall to the sky when its box is shoved inside one', () => {
    // A tall wall down the left edge + a floor far below. Embed the body box a few
    // px into the wall (what a facing flip / lag spike used to do) while airborne.
    // The old bug: resolveRectY read the wall under the box bottom as a floor and
    // snapped the box up one cell per frame, ratcheting it up and out the ceiling.
    const map = createTileMap(10, 40)
    for (let r = 0; r < 40; r++) map.setTile(0, r, solidTile()) // left wall, full height
    map.fillRect(0, 39, 10, 1, solidTile())                     // floor at the bottom

    const player = createPlayer(0, 10 * CELL)
    const b = playerBox(player)
    player.x += CELL - (b.x - player.x) - 2 // box left edge ~2px inside the wall column
    const startY = player.y

    for (let i = 0; i < 120; i++) updatePlayer(player, map, 16)

    // It must never rise above where it started (let alone fly through the ceiling),
    // and must not be falsely grounded while hanging in the air beside the wall.
    expect(player.y).toBeGreaterThanOrEqual(startY)
    expect(player.y).toBeGreaterThan(0)
  })
})

describe('charge-jump (Jump King)', () => {
  /** A rabbit standing on a floor, no keys held. */
  function groundedPlayer() {
    const map = createTileMap(12, 24)
    map.fillRect(0, 23, 12, 1, solidTile()) // floor at row 23
    const p = createPlayer(4 * CELL, 0)
    hold()
    for (let i = 0; i < 80; i++) updatePlayer(p, map, 16) // fall & settle
    return { map, p }
  }

  it('chargeVelocity: tap≈min, asymptotes to max, monotone, never past the cap', () => {
    expect(chargeVelocity(0)).toBeCloseTo(physics.chargeMinVel, 5)
    expect(chargeVelocity(1e6)).toBeCloseTo(physics.chargeMaxVel, 3)
    let prev = chargeVelocity(0)
    for (let ms = 20; ms <= 3000; ms += 20) {
      const v = chargeVelocity(ms)
      expect(v).toBeLessThanOrEqual(prev + 1e-9)             // more negative each step (higher)
      expect(v).toBeGreaterThanOrEqual(physics.chargeMaxVel) // never past the asymptote
      expect(v).toBeLessThanOrEqual(physics.chargeMinVel)
      prev = v
    }
  })

  it('holds to charge (rooted in place), releases to leap', () => {
    const { map, p } = groundedPlayer()
    expect(p.onGround).toBe(true)
    hold(' ')
    for (let i = 0; i < 15; i++) updatePlayer(p, map, 16)
    expect(p.charging).toBe(true)
    expect(p.vx).toBe(0)                  // rooted while charging
    expect(p.chargeMs).toBeGreaterThan(0)
    hold()                                // release
    updatePlayer(p, map, 16)
    expect(p.onGround).toBe(false)        // launched
    expect(p.vy).toBeLessThan(0)          // rising
    expect(p.charging).toBe(false)
    expect(p.chargeMs).toBe(0)
  })

  it('a longer charge launches harder (higher apex)', () => {
    const launchVy = (frames: number): number => {
      const { map, p } = groundedPlayer()
      hold(' ')
      for (let i = 0; i < frames; i++) updatePlayer(p, map, 16)
      hold()
      updatePlayer(p, map, 16) // release frame
      return p.vy
    }
    expect(launchVy(30)).toBeLessThan(launchVy(1)) // more negative = higher
  })

  it('cannot charge or jump from a Down-crouch', () => {
    const { map, p } = groundedPlayer()
    hold('ArrowDown', ' ')                // duck + hold jump
    for (let i = 0; i < 20; i++) updatePlayer(p, map, 16)
    expect(p.crouching).toBe(true)
    expect(p.charging).toBe(false)        // no charging while crouched
    hold('ArrowDown')                     // release jump, still ducking
    updatePlayer(p, map, 16)
    expect(p.onGround).toBe(true)         // never launched
  })

  it('no mid-air steering — vx is locked at launch', () => {
    const { map, p } = groundedPlayer()
    hold(' ')
    for (let i = 0; i < 15; i++) updatePlayer(p, map, 16)
    hold()
    updatePlayer(p, map, 16)              // launch (facing right by default)
    const launchVx = p.vx
    expect(launchVx).toBeGreaterThan(0)   // a forward hop
    hold('ArrowLeft')
    for (let i = 0; i < 4; i++) updatePlayer(p, map, 16) // try to steer left, still airborne
    expect(p.onGround).toBe(false)
    expect(p.vx).toBe(launchVx)           // unchanged — committed arc
  })
})

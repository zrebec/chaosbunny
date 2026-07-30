import { describe, it, expect } from 'vitest'
import { createTileMap, CELL, C, type Tile } from 'zx-kit'
import { createPlayer, updatePlayer, playerBox } from '../src/entities/player.js'
import { FALL_MIN_PX, PX_PER_METRE } from '../src/config.js'
import { atlas } from '../src/art/atlas.js'

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

// ── Fall telemetry (the sidebar's FALLS readout) ───────────────────────────────

describe('player fall telemetry', () => {
  /** Drops the player from `fromY` onto a floor and returns the settled player. */
  function dropOnto(fromY: number, floorRow: number) {
    const map = createTileMap(6, 40)
    map.fillRect(0, floorRow, 6, 1, solidTile())
    const player = createPlayer(2 * CELL, fromY)
    // one tick to leave the ground, then run until it settles
    for (let i = 0; i < 200 && !player.onGround; i++) updatePlayer(player, map, 16)
    updatePlayer(player, map, 16)
    return player
  }

  it('starts a run with a clean sheet', () => {
    const p = createPlayer(0, 0)
    expect(p.falls).toBe(0)
    expect(p.fallenPx).toBe(0)
    expect(p.fallFromY).toBeNull()
  })

  it('counts a real drop and records how far it fell', () => {
    const p = dropOnto(0, 30)
    expect(p.onGround).toBe(true)
    expect(p.falls).toBe(1)
    expect(p.fallenPx).toBeGreaterThanOrEqual(FALL_MIN_PX)
    // the readout divides by PX_PER_METRE, so the metre figure must be sane too
    expect(Math.round(p.fallenPx / PX_PER_METRE)).toBeGreaterThan(0)
  })

  it('ignores a drop shorter than FALL_MIN_PX (a 1-cell lip is not a fall)', () => {
    const map = createTileMap(6, 40)
    map.fillRect(0, 20, 6, 1, solidTile())
    const player = createPlayer(2 * CELL, 0)
    for (let i = 0; i < 200 && !player.onGround; i++) updatePlayer(player, map, 16)
    player.falls = 0
    player.fallenPx = 0
    // step off a lip barely shorter than the threshold
    player.onGround = false
    player.fallFromY = player.y
    player.y += FALL_MIN_PX - 1
    updatePlayer(player, map, 16)
    expect(player.falls).toBe(0)
  })

  it('accumulates across several falls', () => {
    const map = createTileMap(6, 60)
    map.fillRect(0, 50, 6, 1, solidTile())
    const player = createPlayer(2 * CELL, 0)
    for (let i = 0; i < 300 && !player.onGround; i++) updatePlayer(player, map, 16)
    updatePlayer(player, map, 16)
    const afterFirst = { falls: player.falls, px: player.fallenPx }
    // lift it back up and let it fall again
    player.y -= 200
    player.onGround = false
    player.vy = 0
    for (let i = 0; i < 300 && !player.onGround; i++) updatePlayer(player, map, 16)
    updatePlayer(player, map, 16)
    expect(player.falls).toBe(afterFirst.falls + 1)
    expect(player.fallenPx).toBeGreaterThan(afterFirst.px)
  })
})

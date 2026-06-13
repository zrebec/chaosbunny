import { describe, it, expect } from 'vitest'
import { createTileMap, CELL, C, type Tile } from 'zx-kit'
import { createPlayer, updatePlayer, playerBox } from '../src/entities/player.js'
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

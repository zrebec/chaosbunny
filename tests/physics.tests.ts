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
})

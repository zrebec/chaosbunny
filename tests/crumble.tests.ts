import { describe, it, expect } from 'vitest'
import { createTileMap, C, type Tile, type Rect } from 'zx-kit'
import { makeCrumblers, updateCrumblers } from '../src/world/crumble.js'

// A crumble platform at col 5, row 10, width 3.
function fixture() {
  const map = createTileMap(16, 16)
  const tile: Tile = { sprite: new Uint8Array(8), ink: C.B_YELLOW, paper: C.BLACK, solid: true, id: 'crumble' }
  for (let c = 5; c < 8; c++) map.setTile(c, 10, tile)
  const crumblers = makeCrumblers(map, [{ x: 5, y: 10, w: 3, kind: 'crumble' }])
  // Rabbit standing on row 10 (feet at the platform top), overlapping its columns.
  const box: Rect = { x: 5 * 8, y: 10 * 8 - 18, w: 10, h: 18 }
  return { map, crumblers, box }
}

describe('crumblers', () => {
  it('collapses after standing past the delay, then respawns', () => {
    const { map, crumblers, box } = fixture()
    expect(map.isSolid(5, 10)).toBe(true)

    // Stand on it: 4×100ms (400 < 450) — still intact.
    for (let i = 0; i < 4; i++) updateCrumblers(crumblers, map, box, true, 100)
    expect(map.isSolid(5, 10)).toBe(true)

    // One more 100ms tips past 450ms → collapse (returns true that frame).
    expect(updateCrumblers(crumblers, map, box, true, 100)).toBe(true)
    expect(map.isSolid(5, 10)).toBe(false)
    expect(map.isSolid(7, 10)).toBe(false)

    // Off the platform now; after the respawn window it comes back.
    const off: Rect = { x: 0, y: 0, w: 10, h: 18 }
    for (let i = 0; i < 26; i++) updateCrumblers(crumblers, map, off, false, 100) // 2600 > 2500ms
    expect(map.isSolid(5, 10)).toBe(true)
  })

  it('recovers if you step off before the delay (a quick touch is safe)', () => {
    const { map, crumblers, box } = fixture()
    const off: Rect = { x: 0, y: 0, w: 10, h: 18 }
    updateCrumblers(crumblers, map, box, true, 300) // almost collapses
    for (let i = 0; i < 10; i++) updateCrumblers(crumblers, map, off, false, 100) // step off → timer decays
    updateCrumblers(crumblers, map, box, true, 300) // 300 < 450 again → safe
    expect(map.isSolid(5, 10)).toBe(true)
  })

  it('ignores non-crumble platforms', () => {
    const map = createTileMap(16, 16)
    expect(makeCrumblers(map, [{ x: 1, y: 1, w: 3, kind: 'moss' }, { x: 1, y: 2, w: 3 }])).toHaveLength(0)
  })
})

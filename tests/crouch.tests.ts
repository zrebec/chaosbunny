import { describe, it, expect, vi, beforeEach } from 'vitest'

// Control isHeld() so we can simulate input in a headless (node) test.
const HELD = vi.hoisted(() => new Set<string>())
vi.mock('zx-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zx-kit')>()
  return { ...actual, isHeld: (k: string) => HELD.has(k) }
})

import { createTileMap, CELL, C, masksOverlap, type Tile, type TileMap } from 'zx-kit'
import { createPlayer, updatePlayer, muzzle } from '../src/entities/player.js'
import { RABBIT_BOX, CROUCH_BOX } from '../src/rabbit.js'
import { atlas } from '../src/art/atlas.js'
import { buildRoomFromLevel } from '../src/world/room.js'
import { LEVEL } from '../src/world/level.js'
import { spawnShot, shotMask, type Shot } from '../src/entities/projectile.js'
import type { Player } from '../src/entities/player.js'

function stone(): Tile {
  return { sprite: atlas.caveStoneTile.bitmap.data, ink: C.WHITE, paper: C.BLACK, solid: true, id: 'stone' }
}

/** Open shaft with a solid floor on the bottom row. */
function floorMap(): TileMap {
  const map = createTileMap(10, 12)
  for (let x = 0; x < 10; x++) map.setTile(x, 11, stone())
  return map
}

/** Drop the rabbit onto the floor with no keys held, so it is settled + grounded. */
function settleOnGround(p: Player, map: TileMap): void {
  HELD.clear()
  for (let i = 0; i < 30; i++) updatePlayer(p, map, 16)
}

// ── Crouch geometry (the crouch-gate clearance window) ────────────────────────

describe('crouch geometry', () => {
  it('the crouch box is shorter than standing, with the same feet line', () => {
    expect(CROUCH_BOX.h).toBeLessThan(RABBIT_BOX.h)
    expect(CROUCH_BOX.y + CROUCH_BOX.h).toBe(RABBIT_BOX.y + RABBIT_BOX.h) // bottom-aligned: no sink/float
  })

  it('a 3-row overhang (16px clearance) fits crouched but bonks standing', () => {
    const clearance = (3 - 1) * CELL // overhang 3 rows above its platform
    expect(clearance).toBeGreaterThanOrEqual(CROUCH_BOX.h) // crouched passes
    expect(clearance).toBeLessThan(RABBIT_BOX.h)           // standing is blocked
  })
})

// ── No jump from a crouch (the headline rule) ─────────────────────────────────

describe('no jump from a crouch', () => {
  beforeEach(() => HELD.clear())

  it('holding Down + Jump on the ground does NOT leave the ground', () => {
    const map = floorMap()
    const p = createPlayer(2 * CELL, 8 * CELL)
    settleOnGround(p, map)
    expect(p.onGround).toBe(true)

    HELD.clear()
    HELD.add('ArrowDown') // crouch
    HELD.add(' ')         // and press jump
    const ev = updatePlayer(p, map, 16)

    expect(p.crouching).toBe(true)
    expect(ev.jumped).toBe(false)
    expect(p.onGround).toBe(true)
    expect(p.vy).toBeGreaterThanOrEqual(0) // never launched upward
  })

  it('Jump alone (standing) DOES leave the ground — hold to charge, release to leap', () => {
    const map = floorMap()
    const p = createPlayer(2 * CELL, 8 * CELL)
    settleOnGround(p, map)

    HELD.clear()
    HELD.add(' ') // hold jump → charge (rooted, still grounded)
    for (let i = 0; i < 8; i++) updatePlayer(p, map, 16)
    expect(p.charging).toBe(true)
    expect(p.onGround).toBe(true)

    HELD.clear() // release → launch
    const ev = updatePlayer(p, map, 16)
    expect(ev.jumped).toBe(true)
    expect(p.vy).toBeLessThan(0) // moving upward
  })
})

// ── Can't un-crouch under a low ceiling (Step 2) ──────────────────────────────

/** Floor on the bottom row; optionally a solid ceiling 3 rows up (crouch-only). */
function ceilingMap(withCeiling: boolean): TileMap {
  const map = createTileMap(10, 12)
  for (let x = 0; x < 10; x++) map.setTile(x, 11, stone())
  if (withCeiling) for (let x = 0; x < 10; x++) map.setTile(x, 8, stone())
  return map
}

describe('cannot stand up under a low ceiling', () => {
  beforeEach(() => HELD.clear())

  it('stays crouched while a low ceiling is overhead (even after releasing Down)', () => {
    const map = ceilingMap(true)
    const p = createPlayer(2 * CELL, 8 * CELL)
    HELD.add('ArrowDown')
    for (let i = 0; i < 20; i++) updatePlayer(p, map, 16) // settle into the crouch gap
    expect(p.onGround).toBe(true)
    expect(p.crouching).toBe(true)

    HELD.clear() // release Down — the ceiling blocks standing
    updatePlayer(p, map, 16)
    expect(p.crouching).toBe(true)
  })

  it('stands up once there is headroom', () => {
    const map = ceilingMap(false) // open above
    const p = createPlayer(2 * CELL, 8 * CELL)
    HELD.add('ArrowDown')
    for (let i = 0; i < 20; i++) updatePlayer(p, map, 16)
    expect(p.crouching).toBe(true)

    HELD.clear()
    updatePlayer(p, map, 16)
    expect(p.crouching).toBe(false)
  })
})

// ── Overhangs built into the room (Step 2) ────────────────────────────────────

describe('buildRoomFromLevel — overhangs', () => {
  it('lays an overhang as a solid block: stone cap + bottom lip', () => {
    const level = { ...LEVEL, overhangs: [{ x: 3, y: 5, w: 2, h: 3 }] }
    const room = buildRoomFromLevel(level)
    for (let r = 5; r <= 7; r++)
      for (let c = 3; c <= 4; c++)
        expect(room.map.isSolid(c, r), `cell ${c},${r}`).toBe(true)
    expect(room.map.getTile(3, 7)?.id).toBe('overhang') // bottom row = duck-here lip
    expect(room.map.getTile(3, 5)?.id).toBe('stone')    // rows above = solid cap
  })
})

// ── Carrot shot has two heights (crouch shoots low) ───────────────────────────

describe('carrot shot — two fire heights', () => {
  it('the crouch shot leaves clearly lower than the standing shot', () => {
    const p = createPlayer(0, 0)
    p.crouching = false
    const hi = muzzle(p).y
    p.crouching = true
    const lo = muzzle(p).y
    expect(lo).toBeGreaterThan(hi)
    expect(lo - hi).toBeGreaterThanOrEqual(6) // a meaningful gap (the old incidental one was ~5px)
  })

  it('a low bat is hit only from a crouch (the standing shot passes over it)', () => {
    const p = createPlayer(0, 0)
    p.crouching = false
    const hi = muzzle(p)
    p.crouching = true
    const lo = muzzle(p)
    expect(hi.x).toBe(lo.x) // same horizontal muzzle; only the height differs

    // Place a bat so its top-most solid pixel sits exactly on the low (crouch) shot.
    const batMask = atlas.batWingsUp.mask
    let brow = -1, bcol = -1
    for (let r = 0; r < batMask.height && brow < 0; r++) {
      const cols = batMask.rows[r]
      if (cols && cols.length) { brow = r; bcol = cols[0]! }
    }
    const bx = Math.round(lo.x) - bcol
    const by = Math.round(lo.y) - brow // the bat's top solid lands on the crouch-shot row

    const shots: Shot[] = []
    spawnShot(shots, lo.x, lo.y, 1) // crouch shot
    spawnShot(shots, hi.x, hi.y, 1) // standing shot
    const [loShot, hiShot] = shots

    // Crouch shot overlaps the bat; the standing shot is above the whole bat → misses.
    expect(masksOverlap(shotMask(loShot!), Math.round(loShot!.x), Math.round(loShot!.y), batMask, bx, by)).toBeGreaterThan(0)
    expect(masksOverlap(shotMask(hiShot!), Math.round(hiShot!.x), Math.round(hiShot!.y), batMask, bx, by)).toBe(0)
  })
})

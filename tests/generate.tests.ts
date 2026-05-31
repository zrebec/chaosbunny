import { describe, it, expect } from 'vitest'
import { generateCaveRoom, STEP_UP, EDGE_GAP_MAX, PLAT_W_MIN } from '../src/world/room.js'
import { FLOOR_TARGET } from '../src/config.js'
import { RABBIT_H } from '../src/rabbit.js'
import { CELL, type TileMap } from 'zx-kit'

// Snapshot of a room minus its TileMap (which doesn't serialize cleanly).
function layout(room: ReturnType<typeof generateCaveRoom>) {
  const { spawnX, spawnY, carrots, spiders, bats, torches, exit } = room
  return JSON.stringify({ spawnX, spawnY, carrots, spiders, bats, torches, exit })
}

// Platform spans (interior solid tiles) grouped by row, top → bottom.
function platforms(map: TileMap): Array<{ row: number; min: number; max: number; mid: number }> {
  const out = new Map<number, { min: number; max: number }>()
  for (let y = 1; y < map.rows - 1; y++) {
    for (let x = 1; x < map.cols - 1; x++) {
      if (map.isSolid(x, y)) {
        const e = out.get(y) ?? { min: x, max: x }
        e.min = Math.min(e.min, x)
        e.max = Math.max(e.max, x)
        out.set(y, e)
      }
    }
  }
  return [...out.entries()]
    .map(([row, s]) => ({ row, min: s.min, max: s.max, mid: (s.min + s.max) / 2 }))
    .sort((a, b) => a.row - b.row)
}

describe('generateCaveRoom — determinism', () => {
  it('same seed → identical layout', () => {
    expect(layout(generateCaveRoom(1234))).toEqual(layout(generateCaveRoom(1234)))
    expect(layout(generateCaveRoom('cave-7'))).toEqual(layout(generateCaveRoom('cave-7')))
  })

  it('different seeds → different layout', () => {
    expect(layout(generateCaveRoom(1))).not.toEqual(layout(generateCaveRoom(2)))
  })
})

describe('generateCaveRoom — structure', () => {
  it('builds exactly FLOOR_TARGET platforms', () => {
    expect(platforms(generateCaveRoom(42).map)).toHaveLength(FLOOR_TARGET)
  })

  it('the world is the screen width (pure vertical climb)', () => {
    expect(generateCaveRoom(42).map.cols).toBe(32)
  })

  it('spawn sits on the floor, below every platform', () => {
    const room = generateCaveRoom(99)
    const lowest = platforms(room.map).at(-1)!
    // The rabbit's feet (~one body-height below the sprite top) clear the lowest
    // platform — the spawn stands on the floor, beneath the whole staircase.
    expect(room.spawnY + RABBIT_H).toBeGreaterThan(lowest.row * CELL)
  })

  it('carves a 4-wide ceiling hole at the exit', () => {
    const room = generateCaveRoom(99)
    let open = 0
    for (let x = 1; x < room.map.cols - 1; x++) if (!room.map.isSolid(x, 0)) open++
    expect(open).toBe(4)
    expect(room.exit.w).toBe(4 * CELL)
  })
})

describe('generateCaveRoom — reachability by construction', () => {
  // The real rule (the head-bonk fix): every consecutive pair is a clean diagonal
  // hop — exactly one floor-gap up, NO horizontal overlap above the takeoff, and a
  // small air gap within the conservative jump reach. Proven over many seeds.
  it('consecutive platforms never overlap and stay within jump range', () => {
    for (let seed = 0; seed < 300; seed++) {
      const ps = platforms(generateCaveRoom(seed).map) // sorted top→bottom
      for (let i = 1; i < ps.length; i++) {
        const upper = ps[i - 1]!
        const lower = ps[i]!
        expect(lower.row - upper.row, `seed ${seed}: step`).toBe(STEP_UP) // ≤ jump apex

        // Wide enough to stand and land on.
        expect(lower.max - lower.min + 1, `seed ${seed}: width`).toBeGreaterThanOrEqual(PLAT_W_MIN)

        // No X-overlap → one platform is entirely beside the other (anti head-bonk).
        const disjoint = upper.max < lower.min || upper.min > lower.max
        expect(disjoint, `seed ${seed}: platforms overlap (head-bonk)`).toBe(true)

        // Air gap between their near edges is within the horizontal jump reach.
        const gap = upper.min > lower.max ? upper.min - lower.max - 1 : lower.min - upper.max - 1
        expect(gap, `seed ${seed}: gap=${gap}`).toBeGreaterThanOrEqual(0)
        expect(gap, `seed ${seed}: gap=${gap}`).toBeLessThanOrEqual(EDGE_GAP_MAX)
      }
    }
  })
})

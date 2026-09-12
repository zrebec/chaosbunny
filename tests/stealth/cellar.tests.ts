import { describe, it, expect } from 'vitest'
import { mapNodes } from '../../src/stealth/cellar.js'
import { PLAY_H, PLAY_W } from '../../src/stealth/view.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'

describe('the cellar map', () => {
  const nodes = mapNodes(ROOM_SOURCES.length)

  it('has a place for every room', () => {
    expect(nodes).toHaveLength(ROOM_SOURCES.length)
  })

  it('keeps every room on the screen, clear of the title and the hint', () => {
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(16)
      expect(n.x).toBeLessThanOrEqual(PLAY_W - 16)
      expect(n.y).toBeGreaterThanOrEqual(32)
      expect(n.y).toBeLessThanOrEqual(PLAY_H - 16)
    }
  })

  it('never puts two rooms in the same place', () => {
    const seen = new Set(nodes.map((n) => `${n.x},${n.y}`))
    expect(seen.size).toBe(nodes.length)
  })

  it('snakes: each row runs the opposite way to the one above', () => {
    const first = mapNodes(8)
    expect(first[0]!.x).toBeLessThan(first[3]!.x) // left to right
    expect(first[4]!.x).toBeGreaterThan(first[7]!.x) // and back again
    expect(first[4]!.y).toBeGreaterThan(first[0]!.y)
  })

  it('lays out a short cellar and a long one without stacking rows off screen', () => {
    for (const count of [1, 4, 5, 12, 20]) {
      for (const n of mapNodes(count)) expect(n.y).toBeLessThanOrEqual(PLAY_H - 16)
    }
  })
})

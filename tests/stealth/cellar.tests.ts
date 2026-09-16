import { describe, it, expect } from 'vitest'
import { MAP_TRIES_Y, mapNodes, markedRoomLines } from '../../src/stealth/cellar.js'
import { parseRoom } from '../../src/stealth/room.js'
import { PLAY_H, PLAY_W } from '../../src/stealth/view.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { LOCALES, STR } from '../../src/stealth/strings.js'

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

  it("has room on one line for the marked cellar's par and record", () => {
    for (const src of ROOM_SOURCES) {
      const line = `${STR.par(src.par!)}  ${STR.record(999)}`
      expect(line.length, `"${line}"`).toBeLessThanOrEqual(32)
    }
  })

  it('says everything about the marked room above the chain, in 32 columns, in both tongues', () => {
    const rooms = ROOM_SOURCES.map(parseRoom)
    const records = Object.fromEntries(rooms.map((r) => [r.name, 999]))
    const stats = Object.fromEntries(rooms.map((r) => [r.name, { attempts: 888, caught: 888 }]))
    const topOfChain = Math.min(...nodes.map((n) => n.y)) - 7 - 3 // box half-height, cursor frame
    for (const str of Object.values(LOCALES)) {
      rooms.forEach((_, i) => {
        // Unlocked with a record and a history, and locked, both.
        for (const recs of [records, {}]) {
          for (const line of markedRoomLines(rooms, i, recs, stats, str)) {
            expect(line.text.length, `"${line.text}"`).toBeLessThanOrEqual(32)
            expect(line.y + 8, `"${line.text}" runs into the chain`).toBeLessThanOrEqual(topOfChain)
          }
        }
      })
    }
    expect(MAP_TRIES_Y + 8).toBeLessThanOrEqual(topOfChain)
  })

  it('shows attempts and catches only for a room that has been tried', () => {
    const rooms = ROOM_SOURCES.map(parseRoom)
    expect(markedRoomLines(rooms, 0, {}, {}, STR)).toHaveLength(1)
    expect(markedRoomLines(rooms, 0, {}, { [rooms[0]!.name]: { attempts: 2, caught: 1 } }, STR)).toHaveLength(2)
  })

  it('lays out a short cellar and a long one without stacking rows off screen', () => {
    for (const count of [1, 4, 5, 12, 20]) {
      for (const n of mapNodes(count)) expect(n.y).toBeLessThanOrEqual(PLAY_H - 16)
    }
  })
})

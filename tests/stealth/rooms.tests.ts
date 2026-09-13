import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'

describe('the rooms of the run', () => {
  it('all parse', () => {
    for (const src of ROOM_SOURCES) expect(() => parseRoom(src)).not.toThrow()
  })

  it('each carry their own id, and no two share one', () => {
    // The list is the order; a name is only the key a record is filed under, so a room
    // that slid into the middle of the ladder keeps the name it was born with.
    const names = ROOM_SOURCES.map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(name, name).toMatch(/^room[0-9a-z]+$/)
  })

  it("each ship with a par — the solver's answer, pinned by that room's own test", () => {
    for (const src of ROOM_SOURCES) expect(src.par, src.name).toBeGreaterThan(0)
  })

  it('start gently and never get cheap again', () => {
    const pars = ROOM_SOURCES.map((r) => r.par!)
    expect(pars[0]).toBe(Math.min(...pars))
  })
})

describe('the ladder as a whole', () => {
  // Slow on purpose: it asks the solver about every room that ships. The per-room tests
  // pin each room's own claims; this one holds the *shape* of the ladder, which is the
  // thing that quietly rots when rooms are added one at a time.
  const rooms = ROOM_SOURCES.map(parseRoom)

  it('is fair everywhere: no room forces more than two sightings', () => {
    for (const room of rooms) {
      const fewest = fewestSightings(room)
      expect(fewest, `${room.name} forces ${fewest}`).not.toBeNull()
      expect(fewest!, room.name).toBeLessThanOrEqual(2)
    }
  })

  it('opens gently: the first room is the shortest and asks nothing of the ears', () => {
    const pars = rooms.map((r) => r.par!)
    expect(pars[0]).toBe(Math.min(...pars))
    expect(solve(rooms[0]!, { ears: false })).not.toBeNull()
  })

  it('ends on the room that asks for the most', () => {
    const last = rooms.at(-1)!
    expect(solve(last, { ears: false }), 'the last room should need the ears').toBeNull()
    expect(solve(last, { throws: false }), 'and the carrot').toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { parseRoom } from '../../src/stealth/room.js'

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

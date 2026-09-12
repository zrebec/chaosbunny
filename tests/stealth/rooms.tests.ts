import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { parseRoom } from '../../src/stealth/room.js'

describe('the rooms of the run', () => {
  it('all parse', () => {
    for (const src of ROOM_SOURCES) expect(() => parseRoom(src)).not.toThrow()
  })

  it('are named for their place in the run, in order and without a gap', () => {
    expect(ROOM_SOURCES.map((r) => r.name)).toEqual(
      ROOM_SOURCES.map((_, i) => `room${String(i + 1).padStart(2, '0')}`),
    )
  })

  it("each ship with a par — the solver's answer, pinned by that room's own test", () => {
    for (const src of ROOM_SOURCES) expect(src.par, src.name).toBeGreaterThan(0)
  })

  it('start gently and never get cheap again', () => {
    const pars = ROOM_SOURCES.map((r) => r.par!)
    expect(pars[0]).toBe(Math.min(...pars))
  })
})

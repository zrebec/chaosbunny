import { describe, it, expect } from 'vitest'
import { ROOM_02 } from '../../src/stealth/rooms/room02.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// room02 is meant to be found, not read: these tests prove what the room claims without
// ever printing a way through. Keep it that way — no path in an assertion message, no
// snapshot, no console output. A failing claim means redesign the room, not the test.
describe('room02 — the dark corridor', () => {
  const room = parseRoom(ROOM_02)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('cannot be left without throwing the carrot', () => {
    expect(solve(room, { throws: false })).toBeNull()
  })

  it('cannot be left with the ears kept up', () => {
    expect(solve(room, { ears: false })).toBeNull()
  })

  it('lets the most careful player through with a single ? — and no clean sneak exists', () => {
    expect(fewestSightings(room)).toBe(1)
  })

  it('starts Randy empty-handed: the carrot has to be found first', () => {
    expect(room.carrots).toBe(0)
    expect(room.pickups).toHaveLength(1)
  })

  it('is harder than room01: two foxes and a longer par', () => {
    expect(room.patrols).toHaveLength(2)
    expect(room.par!).toBeGreaterThan(20)
  })
})

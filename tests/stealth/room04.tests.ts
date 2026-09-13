import { describe, it, expect } from 'vitest'
import { ROOM_04 } from '../../src/stealth/rooms/room04.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe("room04 — the bat's larder", () => {
  const room = parseRoom(ROOM_04)
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

  it('cannot be left with the ears kept up — because of the bat', () => {
    expect(solve(room, { ears: false })).toBeNull()
    const noBat = parseRoom({ ...ROOM_04, bats: [] })
    expect(solve(noBat, { ears: false }) !== null).toBe(true)
  })

  it('has a clean sneak: the careful need not be noticed at all', () => {
    expect(fewestSightings(room)).toBe(0)
  })

  it('has one bat and one fox', () => {
    expect(room.bats).toHaveLength(1)
    expect(room.patrols).toHaveLength(1)
  })
})

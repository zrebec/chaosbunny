import { describe, it, expect } from 'vitest'
import { ROOM_12 } from '../../src/stealth/rooms/room12.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room12 — the roost', () => {
  const room = parseRoom(ROOM_12)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('cannot be left with the lamp burning, the ears up, or the carrot kept', () => {
    expect(solve(room, { lamps: false })).toBeNull()
    expect(solve(room, { ears: false })).toBeNull()
    expect(solve(room, { throws: false })).toBeNull()
  })

  it('hangs one bat, and it is worth nine beats', () => {
    expect(room.bats).toHaveLength(1)
    const quiet = solve(parseRoom({ ...ROOM_12, bats: [] }))
    expect(quiet!.length).toBe(24)
    expect(room.par! - quiet!.length).toBe(9)
  })

  it('still needs the ears with the bat gone — the lamp sees to that', () => {
    expect(solve(parseRoom({ ...ROOM_12, bats: [] }), { ears: false })).toBeNull()
  })

  it('notices even the most careful player once', () => {
    expect(fewestSightings(room)).toBe(1)
  })
})

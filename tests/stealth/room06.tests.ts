import { describe, it, expect } from 'vitest'
import { ROOM_06 } from '../../src/stealth/rooms/room06.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room06 — the sentry', () => {
  const room = parseRoom(ROOM_06)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('holds no carrot at all: timing and ears, nothing to throw', () => {
    expect(room.carrots).toBe(0)
    expect(room.pickups).toHaveLength(0)
  })

  it('cannot be left with the ears kept up', () => {
    expect(solve(room, { ears: false })).toBeNull()
  })

  it('cannot be left at all if the sentry stops turning', () => {
    const frozen = parseRoom({
      ...ROOM_06,
      patrols: ROOM_06.patrols.map((p) => (p.turns ? { route: p.route, facing: p.turns[0] } : p)),
    })
    expect(solve(frozen)).toBeNull()
  })

  it('notices even the most careful player twice', () => {
    expect(fewestSightings(room)).toBe(2)
  })
})

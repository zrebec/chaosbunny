import { describe, it, expect } from 'vitest'
import { ROOM_2B } from '../../src/stealth/rooms/room2b.js'
import { ROOM_02 } from '../../src/stealth/rooms/room02.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room2b — the dark step', () => {
  const room = parseRoom(ROOM_2B)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('cannot be left with the ears kept up — the whole lesson', () => {
    expect(solve(room, { ears: false })).toBeNull()
  })

  it('holds nothing else that could be the lesson: no carrot, one guard', () => {
    expect(room.carrots).toBe(0)
    expect(room.pickups).toHaveLength(0)
    expect(room.patrols).toHaveLength(1)
    expect(room.lamps).toHaveLength(0)
    expect(room.bats).toHaveLength(0)
  })

  it('notices the most careful player once, and is shorter than the corridor it prepares', () => {
    expect(fewestSightings(room)).toBe(1)
    expect(room.par!).toBeLessThan(ROOM_02.par!)
  })
})

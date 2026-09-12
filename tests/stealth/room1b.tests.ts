import { describe, it, expect } from 'vitest'
import { ROOM_1B } from '../../src/stealth/rooms/room1b.js'
import { ROOM_02 } from '../../src/stealth/rooms/room02.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room1b — the crossing', () => {
  const room = parseRoom(ROOM_1B)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('cannot be left unseen: being noticed once is the lesson', () => {
    expect(fewestSightings(room)).toBe(1)
  })

  it('teaches nothing else — no carrot in it, and the ears buy no beats', () => {
    expect(room.carrots).toBe(0)
    expect(room.pickups).toHaveLength(0)
    expect(solve(room, { ears: false })!.length).toBe(room.par)
  })

  it('is shorter than the room it prepares', () => {
    expect(room.par!).toBeLessThan(ROOM_02.par!)
  })
})

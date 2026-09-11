import { describe, it, expect } from 'vitest'
import { ROOM_03 } from '../../src/stealth/rooms/room03.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room03 — the junction', () => {
  const room = parseRoom(ROOM_03)
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

  it('notices even the most careful player twice', () => {
    expect(fewestSightings(room)).toBe(2)
  })

  it('is watched by two foxes that stand their ground', () => {
    expect(room.patrols.map((p) => p.route.length)).toEqual([1, 1])
  })
})

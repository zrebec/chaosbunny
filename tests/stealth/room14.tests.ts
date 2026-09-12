import { describe, it, expect } from 'vitest'
import { ROOM_14 } from '../../src/stealth/rooms/room14.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room14 — the fork', () => {
  const room = parseRoom(ROOM_14)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('offers two real ways out, near enough in price that neither is the answer', () => {
    const lit = solve(room, { lamps: false }) // never touch the lamp
    const dark = solve(room, { lampsOut: true }) // leave it out behind you
    expect(lit).not.toBeNull()
    expect(dark).not.toBeNull()
    expect(Math.abs(lit!.length - dark!.length)).toBeLessThanOrEqual(2)
    expect(Math.min(lit!.length, dark!.length)).toBe(room.par)
  })

  it('wants the carrot whichever way is taken, and there is only one', () => {
    expect(room.carrots).toBe(1)
    expect(room.pickups).toHaveLength(0)
    expect(solve(room, { throws: false })).toBeNull()
    expect(solve(room, { throws: false, lamps: false })).toBeNull()
  })

  it('can be walked without ever being seen', () => {
    expect(fewestSightings(room)).toBe(0)
  })
})

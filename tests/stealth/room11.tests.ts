import { describe, it, expect } from 'vitest'
import { ROOM_11 } from '../../src/stealth/rooms/room11.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room11 — the window', () => {
  const room = parseRoom(ROOM_11)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('needs every verb the game has: the handle, the dark, the carrot, the ears', () => {
    const walled = parseRoom({
      ...ROOM_11,
      rows: ROOM_11.rows.map((r) => r.split('+').join('#').split('/').join('.')),
    })
    expect(solve(walled)).toBeNull() // the grate
    expect(solve(room, { lamps: false })).toBeNull() // the lamp
    expect(solve(room, { throws: false })).toBeNull() // the carrot
    expect(solve(room, { ears: false })).toBeNull() // the ears
  })

  it('walls its guard in, where no carrot can reach it', () => {
    expect(room.patrols).toHaveLength(1)
    expect(room.lamps).toHaveLength(1)
    // The way out is the dark one: par counts only plans that put the lamp out.
    expect(solve(room, { lampsOut: true })!.length).toBe(room.par)
  })

  it('notices even the most careful player once', () => {
    expect(fewestSightings(room)).toBe(1)
  })
})

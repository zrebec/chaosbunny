import { describe, it, expect } from 'vitest'
import { ROOM_3B } from '../../src/stealth/rooms/room3b.js'
import { ROOM_02 } from '../../src/stealth/rooms/room02.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { beatsOf, play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room3b — the shadow shelf', () => {
  const room = parseRoom(ROOM_3B)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
    expect(beatsOf(room, best!)).toBe(room.par)
  })

  it('wants the ears down — with them up there is no way out', () => {
    expect(solve(room, { ears: false })).toBeNull()
  })

  it('wants the carrot thrown — kept in hand there is no way out either', () => {
    expect(solve(room, { throws: false })).toBeNull()
    expect(room.carrots).toBe(1)
  })

  it('holds nothing a player has not met by now', () => {
    expect(room.lamps).toHaveLength(0)
    expect(room.levers).toHaveLength(0)
    expect(room.grates).toHaveLength(0)
    expect(room.bats).toHaveLength(0)
    expect(ROOM_3B.rows.join('')).not.toContain('~')
    expect(ROOM_3B.rows.join('')).not.toContain('w')
  })

  it('can be walked without ever being seen', () => {
    expect(fewestSightings(room)).toBe(0)
  })

  it('is shorter than the room it prepares, which is why it exists', () => {
    expect(room.par!).toBeLessThan(ROOM_02.par!)
  })
})

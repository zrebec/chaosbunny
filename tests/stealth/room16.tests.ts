import { describe, it, expect } from 'vitest'
import { ROOM_16 } from '../../src/stealth/rooms/room16.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { beatsOf, play } from './helpers.js'

/** The same room with the pool drained: the straight way is then simply the way. */
const drained = () => parseRoom({ ...ROOM_16, rows: ROOM_16.rows.map((r) => r.split('w').join('.')) })

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room16 — the wade', () => {
  const room = parseRoom(ROOM_16)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats — which is not its number of steps', () => {
    expect(beatsOf(room, best!)).toBe(room.par)
    expect(best!.length).toBeLessThan(room.par!) // wading spends a beat it does not step
  })

  it('pays for the water: drained, the same room is three beats cheaper', () => {
    const dry = drained()
    expect(beatsOf(dry, solve(dry)!)).toBe(room.par! - 3)
  })

  it('leaves keeping his feet dry a real way out, three beats dearer', () => {
    const dry = solve(room, { wade: false })
    expect(dry).not.toBeNull()
    expect(beatsOf(room, dry!) - room.par!).toBe(3)
  })

  it('holds nothing else that could be the lesson: no carrot, one guard', () => {
    expect(room.carrots).toBe(0)
    expect(room.pickups).toHaveLength(0)
    expect(room.patrols).toHaveLength(1)
  })

  it('can be walked without ever being seen', () => {
    expect(fewestSightings(room)).toBe(0)
  })
})

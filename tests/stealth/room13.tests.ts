import { describe, it, expect } from 'vitest'
import { ROOM_13 } from '../../src/stealth/rooms/room13.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { beatsOf, play } from './helpers.js'

/** The same room with the stair drained — the shape it would have had without a flood. */
const drained = () => parseRoom({ ...ROOM_13, rows: ROOM_13.rows.map((r) => r.split('w').join('.')) })

/** The sentry stopped on the facing it starts with, to ask whether its turning is the room. */
const frozen = () =>
  parseRoom({ ...ROOM_13, patrols: ROOM_13.patrols.map((p) => ({ route: p.route, facing: p.turns?.[0] })) })

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room13 — the flood', () => {
  const room = parseRoom(ROOM_13)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats — three more than its steps', () => {
    expect(beatsOf(room, best!)).toBe(room.par)
    expect(room.par! - best!.length).toBe(3) // three cells of water, and each takes a beat extra
  })

  it('cannot be left dry — the one room in the cellar that says so', () => {
    expect(solve(room, { wade: false })).toBeNull()
  })

  it('pays for the water: drained, the same room is four beats cheaper', () => {
    const dry = drained()
    expect(beatsOf(dry, solve(dry)!)).toBe(room.par! - 4)
  })

  it('needs the sentry to turn: frozen on its first facing, the room shuts', () => {
    expect(solve(frozen())).toBeNull()
  })

  it('holds nothing else that is load-bearing: the ears may stay up, the carrot may stay in hand', () => {
    expect(beatsOf(room, solve(room, { ears: false })!)).toBe(room.par)
    expect(beatsOf(room, solve(room, { throws: false })!)).toBe(room.par)
    expect(room.patrols).toHaveLength(1)
  })

  it('still earns its carrot: without one he is noticed, with one he need not be', () => {
    expect(fewestSightings(room)).toBe(0)
    expect(fewestSightings(parseRoom({ ...ROOM_13, carrots: 0 }))).toBe(1)
  })
})

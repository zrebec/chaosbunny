import { describe, it, expect } from 'vitest'
import { ROOM_08 } from '../../src/stealth/rooms/room08.js'
import { parseRoom, tileAt } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

/** The room with every plank replaced — `#` walls it off, `.` makes it silent floor. */
const planksAs = (ch: string) => parseRoom({ ...ROOM_08, rows: ROOM_08.rows.map((r) => r.split('~').join(ch)) })

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room08 — the plank', () => {
  const room = parseRoom(ROOM_08)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('holds one plank, and walling it off leaves no way out — it is the only way through', () => {
    const planks = ROOM_08.rows.join('').split('~').length - 1
    expect(planks).toBe(1)
    expect(tileAt(room, { x: 2, y: 8 })).toBe('board')
    expect(solve(planksAs('#'))).toBeNull()
  })

  it("costs the room its length: silent floor in the plank's place is far shorter", () => {
    const silent = solve(planksAs('.'))
    expect(silent!.length).toBe(21)
    expect(room.par! - silent!.length).toBeGreaterThanOrEqual(10)
  })

  it('cannot be left without the carrot', () => {
    expect(solve(room, { throws: false })).toBeNull()
  })

  it('can be left without ever being seen — the noise is not a sighting', () => {
    expect(fewestSightings(room)).toBe(0)
  })
})

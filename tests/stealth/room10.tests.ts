import { describe, it, expect } from 'vitest'
import { ROOM_10 } from '../../src/stealth/rooms/room10.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

/** The room with one kind of ironwork or carpentry taken out. */
const swap = (find: string, put: string) =>
  parseRoom({ ...ROOM_10, rows: ROOM_10.rows.map((r) => r.split(find).join(put)) })

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room10 — the long way round', () => {
  const room = parseRoom(ROOM_10)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('carries two gates, and the grate is one of them: walled up, there is no way out', () => {
    expect(room.grates).toHaveLength(1)
    expect(room.levers).toHaveLength(1)
    const walled = parseRoom({
      ...ROOM_10,
      rows: ROOM_10.rows.map((r) => r.split('+').join('#').split('/').join('.')),
    })
    expect(solve(walled)).toBeNull()
  })

  it('and the plank is the other: silent floor in its place is seven beats shorter', () => {
    const silent = solve(swap('~', '.'))
    expect(silent!.length).toBe(21)
    expect(room.par! - silent!.length).toBe(7)
  })

  it('cannot be left without the carrot', () => {
    expect(solve(room, { throws: false })).toBeNull()
  })

  it('notices even the most careful player once', () => {
    expect(fewestSightings(room)).toBe(1)
  })
})

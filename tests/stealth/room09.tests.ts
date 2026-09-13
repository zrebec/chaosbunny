import { describe, it, expect } from 'vitest'
import { beat, startWorld } from '../../src/stealth/beat.js'
import { ROOM_09 } from '../../src/stealth/rooms/room09.js'
import { parseRoom, tileAt } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { move, play } from './helpers.js'

/** The same room with the ironwork replaced: `#` walls the grate up, `.` leaves it open. */
const gratesAs = (ch: string) =>
  parseRoom({ ...ROOM_09, rows: ROOM_09.rows.map((r) => r.split('+').join(ch).split('/').join('.')) })

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room09 — the handle', () => {
  const room = parseRoom(ROOM_09)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('holds one grate and one handle, and walling the grate up leaves no way out', () => {
    expect(room.grates).toHaveLength(1)
    expect(room.levers).toHaveLength(1)
    expect(tileAt(room, { x: 4, y: 5 })).toBe('grate')
    expect(solve(gratesAs('#'))).toBeNull()
  })

  it('is a stroll with the grate already open — the handle is what it costs', () => {
    const strolled = solve(gratesAs('.'))
    expect(strolled!.length).toBe(13)
    expect(room.par! - strolled!.length).toBeGreaterThanOrEqual(12)
  })

  it('cannot be left with the ears kept up', () => {
    expect(solve(room, { ears: false })).toBeNull()
  })

  it('puts the handle where the guard can hear it', () => {
    const w = startWorld(room)
    const lever = room.levers[0]!
    const beside = { ...w, randy: { ...w.randy, cell: { x: lever.x + 1, y: lever.y } } }
    const pull = beat(room, beside, move('left'))
    expect(pull.world.pulled).toBe(true)
    expect(pull.events.some((e) => e.type === 'heard')).toBe(true)
  })

  it('notices even the most careful player twice', () => {
    expect(fewestSightings(room)).toBe(2)
  })
})

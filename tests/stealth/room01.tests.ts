import { describe, it, expect } from 'vitest'
import { startWorld, type World } from '../../src/stealth/beat.js'
import { ROOM_01 } from '../../src/stealth/rooms/room01.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play, WAIT } from './helpers.js'

// The room is the prototype's whole question, so its design claims are tests, not comments.
// If a rule or the layout changes and one of these fails, the room no longer teaches what it
// was built to teach — redesign it, do not relax the test.
//
// History: under the first rules (unlimited creeping) a third claim held — hiding behind the
// crate was a beat faster than any way round it. With SNEAK_STEPS = 2 (owner's call, 2026-09-11)
// no layout of this hall keeps that (measured over 30 variants): `?` lets an ears-up player
// dodge just as fast. The claim that does hold, and is what the crate is for, is below.
describe('room01 — the pantry corridor', () => {
  const room = parseRoom(ROOM_01)
  const best = solve(room)

  it('can be walked out of, and the shortest way really wins when played', () => {
    expect(best).not.toBeNull()
    expect(play(room, best!).at(-1)!.outcome).toBe('won')
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length).toBe(room.par)
  })

  it('cannot be done without throwing the carrot', () => {
    expect(solve(room, { throws: false })).toBeNull()
  })

  it('can be done without ever being noticed — a first room forgives, it does not demand', () => {
    expect(fewestSightings(room)).toBe(0)
  })

  it('behind the crate, ears down, the fox never sees Randy — ears up, it does', () => {
    const behind = { x: 7, y: 6 }
    const at = (earsDown: boolean): World => {
      const w = startWorld(room)
      return { ...w, randy: { ...w.randy, cell: behind, earsDown } }
    }
    const cycle = Array.from({ length: 2 * room.patrols[0]!.route.length }, () => WAIT)
    const hidden = play(room, cycle, at(true))
    expect(hidden).toHaveLength(cycle.length)
    expect(hidden.flatMap((r) => r.events).some((e) => e.type === 'suspicious' || e.type === 'caught')).toBe(false)
    const exposed = play(room, cycle, at(false))
    expect(exposed.flatMap((r) => r.events).some((e) => e.type === 'suspicious')).toBe(true)
  })

  it('is short: a room to learn the verbs in, not a maze', () => {
    expect(best!.length).toBeGreaterThanOrEqual(10)
    expect(best!.length).toBeLessThanOrEqual(20)
  })
})

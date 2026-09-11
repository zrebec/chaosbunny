import { describe, it, expect } from 'vitest'
import { ROOM_01 } from '../../src/stealth/rooms/room01.js'
import { parseRoom } from '../../src/stealth/room.js'
import { solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// The room is the prototype's whole question, so its design claims are tests, not comments.
// If a rule or the layout changes and one of these fails, the room no longer teaches what it
// was built to teach — redesign it, do not relax the test.
describe('room01 — the pantry corridor', () => {
  const room = parseRoom(ROOM_01)
  const best = solve(room)

  it('can be walked out of, and the shortest way really wins when played', () => {
    expect(best).not.toBeNull()
    expect(play(room, best!).at(-1)!.outcome).toBe('won')
  })

  it('cannot be done without throwing the carrot', () => {
    expect(solve(room, { throws: false })).toBeNull()
  })

  it('is quicker with the ears down behind the crate than any way round it', () => {
    const noEars = solve(room, { ears: false })
    expect(noEars).not.toBeNull()
    expect(best!.length).toBeLessThan(noEars!.length)
    expect(best!.some((a) => a.kind === 'ears')).toBe(true)
  })

  it('is short: a room to learn the verbs in, not a maze', () => {
    expect(best!.length).toBeGreaterThanOrEqual(10)
    expect(best!.length).toBeLessThanOrEqual(20)
  })
})

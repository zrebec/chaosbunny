import { describe, it, expect } from 'vitest'
import { ROOM_05 } from '../../src/stealth/rooms/room05.js'
import { parseRoom } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe("room05 — the bat's hall", () => {
  const room = parseRoom(ROOM_05)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('cannot be left without throwing the carrot', () => {
    expect(solve(room, { throws: false })).toBeNull()
  })

  it('cannot be left with the ears kept up — and the bat is why', () => {
    expect(solve(room, { ears: false })).toBeNull()
    const noBat = parseRoom({ ...ROOM_05, bats: [] })
    expect(solve(noBat, { ears: false }) !== null).toBe(true)
    expect(fewestSightings(noBat)).toBe(0)
  })

  it('notices even the most careful player once', () => {
    expect(fewestSightings(room)).toBe(1)
  })

  it('has two foxes and a bat', () => {
    expect(room.patrols).toHaveLength(2)
    expect(room.bats).toHaveLength(1)
  })
})

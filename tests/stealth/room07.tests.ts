import { describe, it, expect } from 'vitest'
import { ROOM_07 } from '../../src/stealth/rooms/room07.js'
import { allLampsOn, cellIndex, litCells } from '../../src/stealth/light.js'
import { parseRoom, tileAt } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { play } from './helpers.js'

// Found, not read: proves the room's claims without printing a way through (see room02.tests.ts).
describe('room07 — the lit corner', () => {
  const room = parseRoom(ROOM_07)
  const best = solve(room)

  it('can be left, and the way the solver found really wins when played', () => {
    expect(best !== null).toBe(true)
    expect(play(room, best!).at(-1)!.outcome === 'won').toBe(true)
  })

  it('has par equal to the true fewest beats', () => {
    expect(best!.length === room.par).toBe(true)
  })

  it('cannot be left with the lamp left burning — the room is the lamp', () => {
    expect(solve(room, { lamps: false })).toBeNull()
  })

  it('cannot be left without the carrot, nor with the ears kept up', () => {
    expect(solve(room, { throws: false })).toBeNull()
    expect(solve(room, { ears: false })).toBeNull()
  })

  it('holds exactly one lamp, standing where nothing can walk', () => {
    expect(room.lamps).toHaveLength(1)
    expect(tileAt(room, room.lamps[0]!)).toBe('lamp')
  })

  it('has every shadow on it lit while the lamp burns, and dark once it is out', () => {
    const shadows: number[] = []
    for (let y = 0; y < room.rows; y++) {
      for (let x = 0; x < room.cols; x++) {
        if (tileAt(room, { x, y }) === 'shadow') shadows.push(cellIndex(room, { x, y }))
      }
    }
    const burning = litCells(room, allLampsOn(room))
    // Not every shadow in the room — the ones on the way out, the three by the lamp.
    expect(shadows.filter((i) => burning.has(i))).toHaveLength(3)
    expect(litCells(room, 0).size).toBe(0)
  })

  it('notices even the most careful player twice', () => {
    expect(fewestSightings(room)).toBe(2)
  })
})

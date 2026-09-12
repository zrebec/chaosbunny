import { describe, it, expect } from 'vitest'
import type { Action } from '../../src/stealth/beat.js'
import { decodeRun, encodeRun, playRun, runWins } from '../../src/stealth/replay.js'
import { testRoom } from './helpers.js'
import { parseRoom } from '../../src/stealth/room.js'
import { solve } from '../../src/stealth/solver.js'
import { ROOM_10 } from '../../src/stealth/rooms/room10.js'
import { ROOM_14 } from '../../src/stealth/rooms/room14.js'

describe('encodeRun and decodeRun', () => {
  const every: Action[] = [
    { kind: 'move', dir: 'up' }, { kind: 'move', dir: 'right' }, { kind: 'move', dir: 'down' }, { kind: 'move', dir: 'left' },
    { kind: 'throw', dir: 'up' }, { kind: 'throw', dir: 'right' }, { kind: 'throw', dir: 'down' }, { kind: 'throw', dir: 'left' },
    { kind: 'ears' }, { kind: 'wait' },
  ]

  it('write one character per beat', () => {
    expect(encodeRun(every)).toBe('URDLurdlE.')
  })

  it('read back exactly what was written', () => {
    expect(decodeRun(encodeRun(every))).toEqual(every)
    expect(decodeRun('')).toEqual([])
  })

  it('refuse anything that is not an action', () => {
    expect(() => decodeRun('UUx')).toThrow(/'x' at 2/)
  })
})

describe('playRun', () => {
  const room = testRoom(['#R..D'])

  it('plays a winning run to the door', () => {
    const run = decodeRun('RRR')
    expect(playRun(room, run).map((r) => r.outcome)).toEqual(['ok', 'ok', 'won'])
    expect(runWins(room, run)).toBe(true)
  })

  it('stops at a beat the room will not take', () => {
    expect(playRun(room, decodeRun('LRRR')).map((r) => r.outcome)).toEqual(['blocked'])
    expect(runWins(room, decodeRun('LRRR'))).toBe(false)
  })

  it('makes the same beats every time', () => {
    const run = decodeRun('RE.RR')
    expect(playRun(room, run).map((r) => r.world)).toEqual(playRun(room, run).map((r) => r.world))
  })
})

describe('a run through everything the cellar has', () => {
  // A record is stored as its actions, so anything a room can do has to survive the
  // round trip. room14 is the room that uses the most of them at once — a lamp put out
  // with a carrot, a plank, and two guards — and room10 adds a lever and a grate.
  it.each([['room14', ROOM_14], ['room10', ROOM_10]])('replays %s beat for beat', (_name, source) => {
    const room = parseRoom(source)
    const best = solve(room)!
    const run = decodeRun(encodeRun(best))
    expect(run).toEqual(best)
    expect(runWins(room, run)).toBe(true)
  })

  it('keeps the run in the alphabet a save will accept', () => {
    const room = parseRoom(ROOM_14)
    expect(encodeRun(solve(room)!)).toMatch(/^[URDLurdlE.]+$/)
  })
})

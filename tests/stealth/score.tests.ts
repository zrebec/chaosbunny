import { describe, it, expect } from 'vitest'
import { MEDAL_GLYPH } from '../../src/stealth/cellar.js'
import { parseRoom } from '../../src/stealth/room.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import {
  cellarScore, isUnlocked, maxCellarScore, medalFor, recordScore, roomMedal, roomScore, ROOM_POINTS,
} from '../../src/stealth/score.js'

const ROOMS = ROOM_SOURCES.map(parseRoom)

describe('roomScore — a ratio, not a countdown', () => {
  it('pays the numbers the proposal was agreed on', () => {
    // The table from the 2026-09-13 summary, §6: room 1 (par 13) and room 11 (par 35).
    expect(roomScore(13, 13)).toBe(1000)
    expect(roomScore(13, 14)).toBe(929)
    expect(roomScore(13, 20)).toBe(650)
    expect(roomScore(13, 33)).toBe(394)
    expect(roomScore(35, 36)).toBe(972)
    expect(roomScore(35, 55)).toBe(636)
  })

  it('never pays more than a room on par, even against a stale par', () => {
    expect(roomScore(13, 12)).toBe(ROOM_POINTS)
  })

  it('never reaches zero for a finished room, however long it took', () => {
    expect(roomScore(13, 1_000_000)).toBe(1)
  })

  it('costs more per wasted beat in a short room than in a long one', () => {
    expect(roomScore(13, 13) - roomScore(13, 14)).toBeGreaterThan(roomScore(35, 35) - roomScore(35, 36))
  })

  it('only ever falls as the beats go up', () => {
    for (let beats = 13; beats < 200; beats++) expect(roomScore(13, beats + 1)).toBeLessThanOrEqual(roomScore(13, beats))
  })
})

describe('medalFor', () => {
  it('gives par on par, near within a quarter over, done past that', () => {
    expect(medalFor(13, 13)).toBe('par')
    expect(medalFor(13, 16)).toBe('near') // 16 ≤ 16.25
    expect(medalFor(13, 17)).toBe('done')
    expect(medalFor(20, 25)).toBe('near') // exactly five quarters
    expect(medalFor(20, 26)).toBe('done')
  })

  it('draws a glyph for the two medals worth chasing, and none for merely escaping', () => {
    expect(MEDAL_GLYPH.par?.char).not.toBe(MEDAL_GLYPH.near?.char)
    for (const glyph of [MEDAL_GLYPH.par, MEDAL_GLYPH.near]) expect(glyph?.char).toMatch(/^[\x21-\x7e]$/)
    expect(MEDAL_GLYPH.done).toBeNull()
  })
})

describe('the score read off the records', () => {
  it('is nothing for a room without a record', () => {
    expect(recordScore(ROOMS[0]!, {})).toBe(0)
    expect(roomMedal(ROOMS[0]!, {})).toBeNull()
  })

  it('scores the record, which is the best run', () => {
    const room = ROOMS[0]!
    expect(recordScore(room, { [room.name]: room.par! })).toBe(ROOM_POINTS)
    expect(roomMedal(room, { [room.name]: room.par! })).toBe('par')
  })

  it('makes a whole cellar escaped on par worth a thousand a room', () => {
    const onPar = Object.fromEntries(ROOMS.map((r) => [r.name, r.par!]))
    expect(maxCellarScore(ROOMS)).toBe(ROOMS.length * ROOM_POINTS)
    expect(cellarScore(ROOMS, onPar)).toBe(maxCellarScore(ROOMS))
  })

  it('ignores records for rooms the cellar no longer holds', () => {
    expect(cellarScore(ROOMS, { 'a-room-that-was-cut': 5 })).toBe(0)
  })
})

describe('isUnlocked — a room opens once the one before it is escaped', () => {
  it('always opens the first room, and nothing else on a fresh save', () => {
    expect(isUnlocked(ROOMS, {}, 0)).toBe(true)
    for (let i = 1; i < ROOMS.length; i++) expect(isUnlocked(ROOMS, {}, i)).toBe(false)
  })

  it('opens the next room, and only the next, when a room gets a record', () => {
    const records = { [ROOMS[0]!.name]: 20 }
    expect(isUnlocked(ROOMS, records, 1)).toBe(true)
    expect(isUnlocked(ROOMS, records, 2)).toBe(false)
  })

  it('goes by the order the rooms are played, not by their ids', () => {
    // room1b is played second: escaping it opens the third room, whatever that one is called.
    const second = ROOMS[1]!
    expect(second.name).toBe('room1b')
    expect(isUnlocked(ROOMS, { [second.name]: 30 }, 2)).toBe(true)
  })

  it('always leaves the first unescaped room open — the one the title map marks', () => {
    for (let done = 0; done < ROOMS.length; done++) {
      const records = Object.fromEntries(ROOMS.slice(0, done).map((r) => [r.name, r.par!]))
      const next = ROOMS.findIndex((r) => records[r.name] === undefined)
      expect(isUnlocked(ROOMS, records, next)).toBe(true)
    }
  })
})

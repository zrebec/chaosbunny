/**
 * The lamp as a choice you can see, and the lamp as a thing that breathes.
 *
 * `shadowsWon` is the only one of the two that touches what a player knows, so it is
 * the one held hardest: it may name a shadow cell only when putting that lamp out
 * really does give it back, and it must never name anything else. The pulse is
 * decoration and is pinned only to what it stays between — a lamp that flickers to
 * black would read as a lamp going out, which is a lie about a rule.
 */
import { describe, expect, it } from 'vitest'
import { LAMP_REACH, allLampsOn, cellIndex, cellOfIndex, litCells, shadowsWon } from '../../src/stealth/light.js'
import { tileAt } from '../../src/stealth/room.js'
import { lampPulse } from '../../src/stealth/view.js'
import { testRoom } from './helpers.js'

/** A lamp at (4,1) with shadow on both sides of it, and a shadow cell out of its reach. */
const room = testRoom([
  '################',
  '#RssLss...s...D#',
  '################',
])

describe('shadowsWon — what the carrot actually buys', () => {
  const lamps = allLampsOn(room)

  it('names only shadow cells, never floor the light also leaves', () => {
    const won = shadowsWon(room, lamps, 0)
    expect(won.length).toBeGreaterThan(0)
    for (const cell of won) expect(tileAt(room, cell), `${cell.x},${cell.y}`).toBe('shadow')
  })

  it('names exactly the shadow cells that are lit now and would not be', () => {
    const now = litCells(room, lamps)
    const after = litCells(room, 0)
    const expected = [...now]
      .filter((i) => !after.has(i) && tileAt(room, cellOfIndex(room, i)) === 'shadow')
      .sort()
    expect(shadowsWon(room, lamps, 0).map((c) => cellIndex(room, c)).sort()).toEqual(expected)
  })

  it('never names a shadow cell the lamp was not reaching anyway', () => {
    const far = { x: 10, y: 1 } // shadow, but more than LAMP_REACH steps from the lamp
    expect(tileAt(room, far)).toBe('shadow')
    expect(shadowsWon(room, lamps, 0)).not.toContainEqual(far)
  })

  it('promises nothing once the lamp is already out', () => {
    expect(shadowsWon(room, 0, 0)).toEqual([])
  })

  it('stays inside the reach the rules promise', () => {
    for (const cell of shadowsWon(room, lamps, 0)) {
      const steps = Math.abs(cell.x - 4) + Math.abs(cell.y - 1)
      expect(steps, `${cell.x},${cell.y}`).toBeLessThanOrEqual(LAMP_REACH)
    }
  })

  it('is a promise the rules then keep: every cell it named really does hide him', () => {
    const after = litCells(room, 0)
    for (const cell of shadowsWon(room, allLampsOn(room), 0)) {
      expect(after.has(cellIndex(room, cell)), `${cell.x},${cell.y} must be dark`).toBe(false)
    }
  })
})

describe('cellOfIndex is the exact inverse of cellIndex', () => {
  it('round-trips every cell of a room', () => {
    for (let y = 0; y < room.rows; y++) {
      for (let x = 0; x < room.cols; x++) {
        expect(cellOfIndex(room, cellIndex(room, { x, y }))).toEqual({ x, y })
      }
    }
  })
})

describe('a lamp breathes, and never blinks', () => {
  it('stays near full brightness — a lamp that dipped to nothing would read as one going out', () => {
    for (let now = 0; now < 20_000; now += 7) {
      const p = lampPulse(now)
      expect(p, `at ${now}ms`).toBeGreaterThan(0.8)
      expect(p, `at ${now}ms`).toBeLessThan(1.2)
    }
  })

  it('is deterministic — the same moment is always the same lamp', () => {
    expect(lampPulse(1234.5, 2)).toBe(lampPulse(1234.5, 2))
  })

  it('gives two lamps in one room different phases, so they do not pulse as one', () => {
    const a = Array.from({ length: 40 }, (_, i) => lampPulse(i * 50, 0))
    const b = Array.from({ length: 40 }, (_, i) => lampPulse(i * 50, 1))
    expect(a).not.toEqual(b)
  })

  it('does not visibly repeat: the two sines share no short period', () => {
    // If the periods divided each other the pattern would loop; a second apart, they do not.
    const first = Array.from({ length: 60 }, (_, i) => lampPulse(i * 20).toFixed(4))
    const later = Array.from({ length: 60 }, (_, i) => lampPulse(1190 + i * 20).toFixed(4))
    expect(first).not.toEqual(later)
  })
})

import { describe, it, expect } from 'vitest'
import { LOAD_MS, loadStateAt, PILOT_MS, screenRowOfMemoryRow } from '../../src/stealth/loader.js'

describe('screenRowOfMemoryRow', () => {
  it('visits every screen row exactly once', () => {
    const rows = Array.from({ length: 192 }, (_, m) => screenRowOfMemoryRow(m))
    expect(new Set(rows).size).toBe(192)
    expect(Math.min(...rows)).toBe(0)
    expect(Math.max(...rows)).toBe(191)
  })

  it('is its own inverse', () => {
    for (let m = 0; m < 192; m++) expect(screenRowOfMemoryRow(screenRowOfMemoryRow(m))).toBe(m)
  })

  it('runs the first pixel row of all eight character rows of a third before the second', () => {
    // Memory rows 0..7 paint y = 0, 8, 16, …, 56; memory row 8 paints y = 1.
    expect(Array.from({ length: 9 }, (_, m) => screenRowOfMemoryRow(m))).toEqual([0, 8, 16, 24, 32, 40, 48, 56, 1])
    // The second third starts at memory row 64 with y = 64.
    expect(screenRowOfMemoryRow(64)).toBe(64)
  })

  it('agrees with the Spectrum address formula zx-kit decodes', () => {
    // offset = TT·2048 + RRR·256 + SSS·32 — one memory row is 32 bytes.
    for (let y = 0; y < 192; y++) {
      const offset = ((y & 0b11000000) << 5) | ((y & 0b00000111) << 8) | ((y & 0b00111000) << 2)
      expect(screenRowOfMemoryRow(offset / 32)).toBe(y)
    }
  })
})

describe('loadStateAt', () => {
  it('plays the pilot tone first, with nothing on screen', () => {
    expect(loadStateAt(0)).toEqual({ phase: 'pilot', memoryRows: 0, attrRows: 0 })
    expect(loadStateAt(PILOT_MS - 1).phase).toBe('pilot')
  })

  it('then fills the bitmap, then colours it, and only moves forward', () => {
    let prev = loadStateAt(0)
    const seen = new Set<string>()
    for (let ms = 0; ms <= LOAD_MS + 50; ms += 10) {
      const s = loadStateAt(ms)
      seen.add(s.phase)
      expect(s.memoryRows).toBeGreaterThanOrEqual(prev.memoryRows)
      expect(s.attrRows).toBeGreaterThanOrEqual(prev.attrRows)
      if (s.attrRows > 0) expect(s.memoryRows).toBe(192) // colour only after the whole bitmap
      prev = s
    }
    expect([...seen]).toEqual(['pilot', 'pixels', 'attrs', 'done'])
  })

  it('is complete at the end', () => {
    expect(loadStateAt(LOAD_MS)).toEqual({ phase: 'done', memoryRows: 192, attrRows: 24 })
  })
})

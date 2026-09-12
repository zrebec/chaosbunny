import { describe, it, expect } from 'vitest'
import { AIR, DRIP, DRONE, LOOP_MS } from '../../src/stealth/music.js'

const total = (notes: readonly { dur: number }[]) => notes.reduce((n, x) => n + x.dur, 0)

describe('the cellar hum', () => {
  it('has three voices of exactly the same length, so the loop never drifts', () => {
    expect(total(DRONE)).toBe(LOOP_MS)
    expect(total(DRIP)).toBe(LOOP_MS)
    expect(total(AIR)).toBe(LOOP_MS)
  })

  it('names notes the chip can actually play — no rest is a note and no note is silent', () => {
    for (const [name, voice] of Object.entries({ DRONE, DRIP, AIR })) {
      for (const n of voice) {
        expect(Number.isFinite(n.freq), `${name}: ${n.freq}`).toBe(true)
        expect(n.freq === 0 || (n.freq > 20 && n.freq < 4000), `${name}: ${n.freq} Hz`).toBe(true)
      }
    }
  })

  it('stays under the beeper: nothing louder than a third of the chip', () => {
    for (const n of [...DRONE, ...AIR]) expect(n.vol!).toBeLessThanOrEqual(5)
  })
})

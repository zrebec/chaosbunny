import { describe, it, expect } from 'vitest'
import { AIR, DRONE, HUM_MIN_NOTE_MS, LOOP_MS } from '../../src/stealth/music.js'
import { VOICE_KEYS } from '../../src/stealth/title.js'
import { LOCALES } from '../../src/stealth/strings.js'

const total = (notes: readonly { dur: number }[]) => notes.reduce((n, x) => n + x.dur, 0)

describe('the cellar hum', () => {
  it('has voices of exactly the same length, so the loop never drifts', () => {
    expect(total(DRONE)).toBe(LOOP_MS)
    expect(total(AIR)).toBe(LOOP_MS)
  })

  it('never plays a blip — in this game a short sound means something happened', () => {
    // The drip was a 90 ms drop every few seconds, and a player heard it as a beep from
    // nowhere. Rests may be any length; a sound, and the envelope it decays over, may not.
    for (const [name, voice] of Object.entries({ DRONE, AIR })) {
      for (const n of voice) {
        if (n.freq === 0) continue
        expect(n.dur, `${name}: a ${n.dur} ms note`).toBeGreaterThanOrEqual(HUM_MIN_NOTE_MS)
        if (n.envCycleDurMs !== undefined) expect(n.envCycleDurMs, `${name}: envelope`).toBeGreaterThanOrEqual(HUM_MIN_NOTE_MS)
      }
    }
  })

  it('gives every voice on the bench a key and a name in both tongues', () => {
    for (const str of Object.values(LOCALES)) expect(str.voiceNames).toHaveLength(VOICE_KEYS.length)
  })

  it('names notes the chip can actually play — no rest is a note and no note is silent', () => {
    for (const [name, voice] of Object.entries({ DRONE, AIR })) {
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

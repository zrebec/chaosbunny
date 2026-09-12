/**
 * Beeper sound for the beat events — one short ZX blip per thing that happened.
 * The two that carry the game are `?` (two soft high ticks) and `!` (a sharp
 * falling pair): a player must be able to hear being noticed without looking.
 *
 * Untested by ear — the levels and pitches are a first guess for the owner to tune.
 */
import { beep, getAudioContext, resumeAudio, stopBeep } from 'zx-kit'
import type { BeatEvent } from './beat.js'
import { ATTRS_MS, PILOT_MS, PIXELS_MS } from './loader.js'

function blip(freq: number, ms: number, delayMs = 0, volume = 0.5): void {
  const ctx = getAudioContext()
  if (!ctx) return
  resumeAudio()
  beep(freq, ms, ctx.currentTime + delayMs / 1000, 0, volume)
}

export function playEvents(events: readonly BeatEvent[]): void {
  for (const e of events) {
    switch (e.type) {
      case 'step':
        blip(95, 12, 0, 0.15)
        break
      case 'ears':
        if (e.down) { blip(660, 25, 0, 0.3); blip(440, 35, 25, 0.3) }
        else { blip(440, 25, 0, 0.3); blip(660, 35, 25, 0.3) }
        break
      case 'throw':
        blip(1200, 20, 0, 0.3); blip(900, 20, 30, 0.3); blip(600, 30, 60, 0.3)
        break
      case 'heard':
        blip(260, 35, 110, 0.4) // the carrot landing, just after the throw
        break
      case 'lampOut':
        // Glass, then the room going quiet: three quick high shards and a low thud,
        // timed to land after the throw's own arc.
        blip(2600, 14, 95, 0.5); blip(1900, 14, 113, 0.45); blip(2300, 12, 131, 0.4)
        blip(150, 110, 155, 0.45)
        break
      case 'creak':
        // Old wood bending: two low tones that slide the wrong way, and loud enough to worry.
        blip(190, 55, 0, 0.4); blip(150, 70, 50, 0.4)
        break
      case 'lever':
        // Iron: the handle clunks, then the grate grinds — up when it opens, down when it shuts.
        blip(120, 70, 0, 0.5)
        if (e.open) { blip(300, 40, 80, 0.4); blip(380, 40, 125, 0.4); blip(460, 60, 170, 0.4) }
        else { blip(460, 40, 80, 0.4); blip(380, 40, 125, 0.4); blip(300, 60, 170, 0.4) }
        break
      case 'pickup':
        blip(880, 40, 0, 0.4); blip(1320, 60, 45, 0.4)
        break
      case 'eat':
        blip(200, 30, 0, 0.3); blip(170, 30, 70, 0.3)
        break
      case 'suspicious':
        blip(1500, 25, 0, 0.35); blip(1500, 25, 90, 0.35)
        break
      case 'calm':
        blip(700, 40, 0, 0.2)
        break
      case 'caught':
      case 'bitten':
        blip(1800, 60, 0, 0.6); blip(900, 140, 70, 0.6)
        break
      case 'batHeard':
        blip(3200, 12, 0, 0.25); blip(3600, 12, 40, 0.25); blip(3200, 12, 80, 0.25) // a squeak
        break
      case 'won':
        blip(660, 70, 0, 0.5); blip(880, 70, 80, 0.5); blip(1320, 140, 160, 0.5)
        break
      case 'wait':
        break
    }
  }
}

/**
 * The sounds, one key each, for the screen that plays them back to back (`title.ts`,
 * mode `sound`). Tuning a beeper means hearing two of them next to each other, which
 * is hard to do while playing — so this is the tuning bench: every number that makes
 * a sound is in `playEvents` above, and this list is how you audition a change.
 */
export const SOUND_BENCH: ReadonlyArray<{ readonly key: string; readonly play: () => void }> = [
  { key: '1', play: () => playEvents([{ type: 'step' }]) },
  { key: '2', play: () => playEvents([{ type: 'ears', down: true }]) },
  { key: '3', play: () => playEvents([{ type: 'throw', from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }]) },
  { key: '4', play: () => playEvents([{ type: 'heard', fox: 0 }]) },
  { key: '5', play: () => playEvents([{ type: 'lampOut', lamp: 0, at: { x: 0, y: 0 } }]) },
  { key: '6', play: () => playEvents([{ type: 'creak', at: { x: 0, y: 0 } }]) },
  { key: '7', play: () => playEvents([{ type: 'lever', at: { x: 0, y: 0 }, open: true }]) },
  { key: '8', play: () => playEvents([{ type: 'pickup', at: { x: 0, y: 0 } }]) },
  { key: '9', play: () => playEvents([{ type: 'suspicious', fox: 0 }]) },
  { key: '0', play: () => playEvents([{ type: 'caught', fox: 0, why: 'seen' }]) },
  { key: 'A', play: () => playEvents([{ type: 'batHeard', bat: 0 }]) },
  { key: 'B', play: () => playEvents([{ type: 'won' }]) },
]

/** A step into a wall, or a throw with nowhere to go: a dull knock, and no beat. */
export function playBlocked(): void {
  blip(110, 40, 0, 0.3)
}

/** A beat taken back: the step blip played backwards — quiet, and rising. */
export function playUndo(): void {
  blip(300, 18, 0, 0.25)
  blip(450, 18, 22, 0.25)
  blip(620, 22, 44, 0.2)
}

/**
 * A tape loading: the 808 Hz pilot tone, then data — a stream of short pulses at
 * the two bit frequencies, drawn from a fixed seed so every load sounds the same.
 * Quiet on purpose: it is atmosphere, and a key cuts it short ({@link stopTape}).
 */
export function playTape(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  resumeAudio()
  const t0 = ctx.currentTime
  beep(808, PILOT_MS - 20, t0, 0, 0.1)
  let seed = 0x2f6b
  for (let t = 0; t < PIXELS_MS + ATTRS_MS; t += 9) {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff
    beep(seed & 0x10000 ? 2000 : 1000, 6, t0 + (PILOT_MS + t) / 1000, 0, 0.06)
  }
}

export function stopTape(): void {
  stopBeep()
}

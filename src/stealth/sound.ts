/**
 * Beeper sound for the beat events — one short ZX blip per thing that happened.
 * The two that carry the game are `?` (two soft high ticks) and `!` (a sharp
 * falling pair): a player must be able to hear being noticed without looking.
 *
 * Untested by ear — the levels and pitches are a first guess for the owner to tune.
 */
import { beep, getAudioContext, resumeAudio } from 'zx-kit'
import type { BeatEvent } from './beat.js'

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
        blip(1800, 60, 0, 0.6); blip(900, 140, 70, 0.6)
        break
      case 'won':
        blip(660, 70, 0, 0.5); blip(880, 70, 80, 0.5); blip(1320, 140, 160, 0.5)
        break
      case 'wait':
        break
    }
  }
}

/** A step into a wall, or a throw with nowhere to go: a dull knock, and no beat. */
export function playBlocked(): void {
  blip(110, 40, 0, 0.3)
}

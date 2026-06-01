/**
 * Beeper sound effects. The shared AudioContext must be created inside a user
 * gesture (browser autoplay policy), so call {@link ensureAudio} from the first
 * keydown/pointerdown. Each effect is a short square-wave blip via zx-kit's
 * `beep` — authentic ZX 48K beeper.
 */
import { initAudio, resumeAudio, getAudioContext, beep } from 'zx-kit'

/**
 * Unlocks audio on a user gesture. Call from every keydown/pointerdown: it
 * creates the context once, then **resumes it on every gesture** — gated on the
 * real `AudioContext`, not a module flag. A one-shot flag could go stale across
 * Vite HMR while the context was left suspended, killing all sound.
 */
export function ensureAudio(): void {
  if (!getAudioContext()) initAudio(0.3)
  resumeAudio()
}

function blip(freq: number, durMs: number, delayMs = 0): void {
  const ctx = getAudioContext()
  if (!ctx) return
  resumeAudio()
  beep(freq, durMs, ctx.currentTime + delayMs / 1000)
}

export const SFX = {
  jump(): void {
    // quick upward chirp
    blip(520, 50)
    blip(780, 60, 45)
  },
  land(): void {
    blip(170, 50)
  },
  shoot(): void {
    blip(900, 35)
    blip(1300, 30, 30)
  },
  pickup(): void {
    blip(880, 45)
    blip(1320, 60, 50)
  },
  hurt(): void {
    blip(220, 90)
    blip(140, 110, 70)
  },
}

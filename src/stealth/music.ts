/**
 * The cellar hum: one AY loop, quiet enough to leave the beeper in charge.
 *
 * Three voices, each 12.8 s long so the loop never drifts: a low drone that
 * breathes, a drip that lands rarely and high, and a noise channel that moves like
 * air in a cellar. Nothing on a beat — the music is the room, not the clock, and
 * the beeper's `?` and `!` must always cut through it.
 *
 * Untested by ear. Every number here is a guess for the owner to tune; the notes
 * are data, so tuning is editing three strings.
 */
import { getAudioContext, playAYLoop, seq, type AYNote, type LoopHandle } from 'zx-kit'

/** Every voice is exactly this long, or the loop would drift against itself. */
export const LOOP_MS = 12_800

const quiet = (notes: AYNote[], vol: number): AYNote[] => notes.map((n) => ({ ...n, vol }))

/** A slow low pulse: the building itself. */
export const DRONE = quiet(seq('A1:2400 r:600 G1:2400 r:800 A1:2400 r:600 F1:2400 r:1200'), 5)

/** Water somewhere, three times a loop, each drop a short decay. */
export const DRIP = seq('r:3000 E6:90 r:5200 B5:90 r:4000 E6:70 r:350').map((n) =>
  n.freq === 0 ? n : { ...n, envShape: 0, envCycleDurMs: 220 },
)

/** Air moving: noise, low and long. */
export const AIR = quiet(seq('r:1500 D2:2000 r:3000 C2:1800 r:2500 D2:1500 r:500', { noise: true, noisePeriod: 24 }), 3)

let loop: LoopHandle | null = null
/** The player's intent, which survives the title screen and every room change. */
let wanted = true

export function musicOn(): boolean {
  return wanted
}

/**
 * Starts the hum. Without an audio context yet (before the first key) nothing is
 * created, so the next call can try again — playAYLoop would hand back a handle
 * that does nothing and we would think we were playing.
 */
export function startMusic(): void {
  wanted = true
  if (!loop && getAudioContext()) loop = playAYLoop({ a: DRONE, b: DRIP, c: AIR })
}

/** Silences the loop but keeps the player's intent — for the title, where the tape plays. */
export function pauseMusic(): void {
  loop?.stop()
  loop = null
}

export function stopMusic(): void {
  wanted = false
  pauseMusic()
}

/** Returns whether the music is now on. */
export function toggleMusic(): boolean {
  if (wanted) stopMusic()
  else startMusic()
  return wanted
}

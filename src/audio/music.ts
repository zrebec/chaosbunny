/**
 * Background cave music — an arrangement of the traditional (public-domain)
 * **Scarborough Fair** in A-Dorian, 3/4, ~9.6 s, looping. Three AY channels:
 *  - melody: the Scarborough Fair tune (the Dorian F# gives its haunting colour),
 *  - bass:   a low steady drone (boomy),
 *  - drums:  a heavy kick on beat 1 of each bar — a low tone + noise with a fast
 *            decay envelope (a "boom"). Beeper stays reserved for SFX.
 *
 * Transcribed by ear — tune the note strings freely. `M` mutes it.
 */
import { seq, playAYLoop, getAudioContext, type AYNote, type LoopHandle } from 'zx-kit'

// 8 bars × 1200 ms = 9600 ms; every channel sums to that for a clean loop.
const MELODY = seq(
  'A4:800 E5:400 ' + // Are you go-
  'E5:800 F#5:400 ' + // -ing to
  'E5:400 D5:400 C5:400 ' + // Scar-bo-rough
  'B4:800 A4:400 ' + // Fair?
  'A4:400 B4:400 C5:400 ' + // Pars-ley sage
  'D5:800 C5:400 ' + // rose-ma-
  'B4:400 A4:400 G4:400 ' + // -ry and thyme
  'A4:1200', // (resolve)
)

const BASS = seq('A2:1200 A2:1200 G2:1200 A2:1200 A2:1200 F2:1200 E2:1200 A2:1200')

// Kick: low tone + noise, fast decay envelope = a boomy thud on beat 1 of each bar.
const KICK: AYNote = { freq: 55, dur: 160, noise: true, noisePeriod: 24, envShape: 0, envCycleDurMs: 160 }
const REST: AYNote = { freq: 0, dur: 1040 }
const DRUMS: AYNote[] = Array.from({ length: 8 }, () => [KICK, REST]).flat()

let track: LoopHandle | null = null

/** Starts the loop once audio is unlocked. Safe to call on every gesture. */
export function startMusic(): void {
  if (track || !getAudioContext()) return
  track = playAYLoop({ a: MELODY, b: BASS, c: DRUMS })
}

/** Stops the music (e.g. on game over). The current loop's tail may play out. */
export function stopMusic(): void {
  track?.stop()
  track = null
}

/** Mutes / unmutes (stop takes effect at the loop boundary). */
export function toggleMusic(): void {
  if (track) stopMusic()
  else startMusic()
}

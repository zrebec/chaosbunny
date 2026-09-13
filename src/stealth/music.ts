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
import { getAudioContext, playAYLoop, seq, type AYChannel, type AYNote, type LoopHandle } from 'zx-kit'

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

/** The three voices, in the order `playAYLoop` takes them. */
export const CHANNELS: readonly AYChannel[] = ['A', 'B', 'C']

/**
 * How far the hum drops out of the way of a warning. Not to silence: a `?` that
 * stopped the music would be a bigger event than being caught, and the cellar going
 * quiet is itself a signal. A third is enough for a beeper blip to cut through.
 */
export const DUCK_GAIN = 0.35
/** How long it stays down — a little longer than the longest warning blip. */
export const DUCK_MS = 220
/** Into the duck fast enough to be under the blip, out of it slowly enough not to pump. */
const DUCK_IN_MS = 20
const DUCK_OUT_MS = 180

let loop: LoopHandle | null = null
/** The player's intent, which survives the title screen and every room change. */
let wanted = true
/**
 * What the player (or the bench) wants each voice to be worth, 0..1. The duck is not
 * in here — it multiplies on top, so ducking a soloed channel still comes back to the
 * solo rather than to full.
 */
const mix: Record<AYChannel, number> = { A: 1, B: 1, C: 1 }
let ducked = false
let duckTimer: ReturnType<typeof setTimeout> | null = null

function applyMix(rampMs: number): void {
  for (const ch of CHANNELS) loop?.setChannelGain(ch, mix[ch] * (ducked ? DUCK_GAIN : 1), rampMs)
}

export function musicOn(): boolean {
  return wanted
}

/**
 * Pulls the hum down for a moment so a beeper warning is heard over it.
 *
 * This is the whole of what S1 asked: the question was never whether the blips are
 * pretty, it was whether a `?` cuts through the cellar. The loop's mixer survives the
 * loop boundary (zx-kit `LoopHandle`), so a duck that straddles the seam does not
 * leak a frame at full level the way a re-scheduled gain would.
 */
export function duckMusic(ms = DUCK_MS): void {
  if (!loop) return
  ducked = true
  applyMix(DUCK_IN_MS)
  if (duckTimer) clearTimeout(duckTimer)
  duckTimer = setTimeout(() => {
    duckTimer = null
    ducked = false
    applyMix(DUCK_OUT_MS)
  }, ms)
}

/** What each voice is currently worth — the bench draws this. */
export function channelMix(): Readonly<Record<AYChannel, number>> {
  return { ...mix }
}

/**
 * Mutes or restores one voice, for tuning by ear. Three voices written blind cannot
 * be judged together; the only way to hear whether the drip is too loud is to hear
 * the drip alone. Survives the loop boundary, so it holds while you listen.
 */
export function toggleChannel(ch: AYChannel): boolean {
  mix[ch] = mix[ch] > 0 ? 0 : 1
  applyMix(DUCK_IN_MS)
  return mix[ch] > 0
}

/** Every voice back on. */
export function resetChannels(): void {
  for (const ch of CHANNELS) mix[ch] = 1
  applyMix(DUCK_IN_MS)
}

/**
 * Starts the hum. Without an audio context yet (before the first key) nothing is
 * created, so the next call can try again — playAYLoop would hand back a handle
 * that does nothing and we would think we were playing.
 */
export function startMusic(): void {
  wanted = true
  if (!loop && getAudioContext()) {
    loop = playAYLoop({ a: DRONE, b: DRIP, c: AIR })
    applyMix(0) // a voice muted at the bench stays muted when the hum comes back
  }
}

/** Silences the loop but keeps the player's intent — for the title, where the tape plays. */
export function pauseMusic(): void {
  // A duck left in flight would fire against the next loop and pull it down for no reason.
  if (duckTimer) clearTimeout(duckTimer)
  duckTimer = null
  ducked = false
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

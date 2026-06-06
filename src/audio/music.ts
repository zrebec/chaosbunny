/**
 * Background cave music — short AY loops for the vertical slice.
 *
 * Track 0 preserves the original public-domain Scarborough Fair arrangement.
 * The added tracks are original cave loops: slow minor/dorian motifs, low drones
 * and sparse AY noise drips. Beeper stays reserved for SFX.
 *
 * `M` mutes/unmutes. `N` skips to the next track. While playing, the game also
 * auto-shuffles to another loop every `MUSIC_LOOPS_PER_TRACK` repeats.
 */
import { seq, playAY, getAudioContext, createRng, type AYNote, type AYHandle, type Rng } from 'zx-kit'
import { MUSIC_LOOPS_PER_TRACK } from '../config.js'

// 8 bars × 1200 ms = 9600 ms; every channel sums to that for a clean loop.
const SCARBOROUGH_MELODY = seq(
  'A4:800 E5:400 ' + // Are you go-
  'E5:800 F#5:400 ' + // -ing to
  'E5:400 D5:400 C5:400 ' + // Scar-bo-rough
  'B4:800 A4:400 ' + // Fair?
  'A4:400 B4:400 C5:400 ' + // Pars-ley sage
  'D5:800 C5:400 ' + // rose-ma-
  'B4:400 A4:400 G4:400 ' + // -ry and thyme
  'A4:1200', // (resolve)
)

const SCARBOROUGH_BASS = seq('A2:1200 A2:1200 G2:1200 A2:1200 A2:1200 F2:1200 E2:1200 A2:1200')

// Kick: low tone + noise, fast decay envelope = a boomy thud on beat 1 of each bar.
const KICK: AYNote = { freq: 55, dur: 160, noise: true, noisePeriod: 24, envShape: 0, envCycleDurMs: 160 }
const REST: AYNote = { freq: 0, dur: 1040 }
const SCARBOROUGH_DRUMS: AYNote[] = Array.from({ length: 8 }, () => [KICK, REST]).flat()

const DRIP: AYNote = { freq: 0, dur: 90, noise: true, noisePeriod: 7, envShape: 0, envCycleDurMs: 90 }
const DEEP_DRIP: AYNote = { freq: 0, dur: 120, noise: true, noisePeriod: 18, envShape: 0, envCycleDurMs: 120 }
const rest = (dur: number): AYNote => ({ freq: 0, dur })

const CRYSTAL_DRIP_MELODY = seq(
  'E5:300 r:100 D#5:300 r:100 B4:400 ' +
  'G4:300 r:100 A4:300 r:100 B4:400 ' +
  'E5:300 r:100 G5:300 r:100 F5:400 ' +
  'D5:600 B4:300 r:300 ' +
  'C5:300 r:100 B4:300 r:100 G4:400 ' +
  'A4:300 r:100 C5:300 r:100 B4:400 ' +
  'G4:400 F4:400 E4:400 ' +
  'E5:600 r:600',
)
const CRYSTAL_DRIP_BASS = seq('E2:2400 C2:1200 D2:1200 E2:2400 B1:1200 A1:1200')
const CRYSTAL_DRIP_NOISE: AYNote[] = [
  rest(520), DRIP, rest(590),
  rest(1120), DRIP, rest(80),
  rest(760), DRIP, rest(350),
  rest(1200),
  rest(430), DRIP, rest(680),
  rest(950), DRIP, rest(160),
  rest(1200),
  rest(690), DRIP, rest(330),
]

const DEEP_BURROW_MELODY = seq(
  'D4:600 F4:300 E4:300 ' +
  'C4:600 D4:300 r:300 ' +
  'A3:600 C4:300 D4:300 ' +
  'E4:900 r:300 ' +
  'F4:600 E4:300 C4:300 ' +
  'D4:600 A3:300 r:300 ' +
  'Bb3:600 C4:300 D4:300 ' +
  'A3:1200',
)
const DEEP_BURROW_BASS = seq('D2:1200 D2:1200 C2:1200 D2:1200 F1:1200 G1:1200 D2:1200 A1:1200')
const LOW_PULSE: AYNote = { freq: 43, dur: 180, noise: true, noisePeriod: 31, envShape: 0, envCycleDurMs: 180 }
const DEEP_BURROW_NOISE: AYNote[] = Array.from({ length: 8 }, (_, i) =>
  i % 2 === 0 ? [LOW_PULSE, rest(420), DEEP_DRIP, rest(480)] : [LOW_PULSE, rest(1020)],
).flat()

interface MusicTrack {
  readonly name: string
  readonly a: AYNote[]
  readonly b: AYNote[]
  readonly c: AYNote[]
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { name: 'Scarborough Cave', a: SCARBOROUGH_MELODY, b: SCARBOROUGH_BASS, c: SCARBOROUGH_DRUMS },
  { name: 'Crystal Drip', a: CRYSTAL_DRIP_MELODY, b: CRYSTAL_DRIP_BASS, c: CRYSTAL_DRIP_NOISE },
  { name: 'Deep Burrow', a: DEEP_BURROW_MELODY, b: DEEP_BURROW_BASS, c: DEEP_BURROW_NOISE },
] as const

type Timer = ReturnType<typeof setTimeout>

let loopTimer: Timer | null = null
let current: AYHandle | null = null
let currentTrack = 0
let loopsPlayed = 0 // how many times the current track has looped (drives auto-rotation)

/**
 * Shuffle-bag track picker: returns each track index once per cycle in a random
 * (seeded → deterministic) order, never the same track twice in a row. Exported
 * for tests; the running game uses the seeded instance below.
 */
export function makeTrackShuffler(rng: Rng): (current: number, count: number) => number {
  let bag: number[] = []
  return (current, count) => {
    if (count <= 1) return current
    if (bag.length === 0) {
      bag = rng.shuffle(Array.from({ length: count }, (_, i) => i))
      if (bag[0] === current) bag.push(bag.shift()!) // no repeat across the bag seam
    }
    return bag.shift()!
  }
}

const nextShuffledTrack = makeTrackShuffler(createRng('chaosBunny-music'))

function activeTrack(): MusicTrack {
  return MUSIC_TRACKS[currentTrack]!
}

function trackLength(t: MusicTrack): number {
  const total = (ns: readonly AYNote[]) => ns.reduce((sum, n) => sum + n.dur, 0)
  return Math.max(total(t.a), total(t.b), total(t.c))
}

function clearLoop(): void {
  if (loopTimer) clearTimeout(loopTimer)
  loopTimer = null
}

/**
 * Plays the current track once and schedules the next loop. After
 * {@link MUSIC_LOOPS_PER_TRACK} repeats it shuffles to another track on the loop
 * boundary (no stop needed — the old loop ends exactly as the new one starts).
 * Self-reschedules with each track's own length, so tracks may differ in length.
 */
function playLoopAndScheduleNext(): void {
  const t = activeTrack()
  current = playAY({ a: t.a, b: t.b, c: t.c })
  loopTimer = setTimeout(() => {
    loopsPlayed += 1
    if (MUSIC_LOOPS_PER_TRACK > 0 && loopsPlayed >= MUSIC_LOOPS_PER_TRACK) {
      currentTrack = nextShuffledTrack(currentTrack, MUSIC_TRACKS.length)
      loopsPlayed = 0
    }
    playLoopAndScheduleNext()
  }, trackLength(t))
}

/** Starts the loop once audio is unlocked. Safe to call on every gesture. */
export function startMusic(): void {
  if (loopTimer || !getAudioContext()) return
  loopsPlayed = 0
  playLoopAndScheduleNext()
}

/** Stops the music immediately (e.g. on game over or mute) — silences the
 *  in-flight loop now, not at the next loop boundary. */
export function stopMusic(): void {
  clearLoop()
  current?.stop()
  current = null
}

/** Mutes / unmutes — muting silences the music instantly. */
export function toggleMusic(): void {
  if (loopTimer) stopMusic()
  else startMusic()
}

/** Manually skips to the next track (in order). If music is playing it starts
 *  immediately; also resets the auto-rotation counter. */
export function nextMusicTrack(): string {
  const wasPlaying = loopTimer !== null
  if (wasPlaying) stopMusic()                            // silence the current track now
  currentTrack = (currentTrack + 1) % MUSIC_TRACKS.length
  loopsPlayed = 0
  if (wasPlaying) playLoopAndScheduleNext()              // start the new one from the top
  return activeTrack().name
}

export function currentMusicTrackName(): string {
  return activeTrack().name
}

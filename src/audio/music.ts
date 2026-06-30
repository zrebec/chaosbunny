/**
 * Background cave music — action-oriented AY suites for chaosBunny.
 * Rýchlejšie, rytmickejšie, hnacie verzie (Jump King feel).
 * Všetko kompatibilné s existujúcim schedulerom.
 */

import { seq, playAY, getAudioContext, createRng, type AYNote, type AYHandle, type Rng } from 'zx-kit'
import { MUSIC_LOOPS_PER_TRACK } from '../config.js'

// ─── Action-oriented helpers ─────────────────────────────────────────────────

const KICK: AYNote = { freq: 52, dur: 120, noise: true, noisePeriod: 24, envShape: 0, envCycleDurMs: 120 }
const HARD_KICK: AYNote = { freq: 46, dur: 100, noise: true, noisePeriod: 22, envShape: 0, envCycleDurMs: 100 }
const DRIP: AYNote = { freq: 0, dur: 70, noise: true, noisePeriod: 16, envShape: 0, envCycleDurMs: 70 }
const DEEP_DRIP: AYNote = { freq: 0, dur: 95, noise: true, noisePeriod: 23, envShape: 0, envCycleDurMs: 95 }
const PULSE: AYNote = { freq: 42, dur: 140, noise: true, noisePeriod: 27, envShape: 0, envCycleDurMs: 140 }
const rest = (dur: number): AYNote => ({ freq: 0, dur })

const silentBar = (): AYNote[] => [rest(1100)]
const kickBar = (): AYNote[] => [KICK, rest(980)]
const hardKickBar = (): AYNote[] => [HARD_KICK, rest(1000)]
const doubleKick = (): AYNote[] => [KICK, rest(380), KICK, rest(420)]
const tripleKick = (): AYNote[] => [KICK, rest(160), KICK, rest(160), KICK, rest(320)]

const fastDripBar = (): AYNote[] => [rest(420), DRIP, rest(580)]
const doubleDripBar = (): AYNote[] => [rest(200), DRIP, rest(300), DRIP, rest(400)]
const deepDripBar = (): AYNote[] => [rest(360), DEEP_DRIP, rest(640)]
const pulseBar = (): AYNote[] => [PULSE, rest(960)]
const pulseDripBar = (): AYNote[] => [PULSE, rest(360), DEEP_DRIP, rest(480)]

// ─── TRACK 1: Void Drive (rýchle stúpanie) ────────────────────────────────────

const VOID_DRIVE_MELODY = seq(
  'A3:200 C4:200 E4:300 G4:200 F#4:200 E4:300 ' +
  'D4:200 C4:200 B3:300 C4:200 E4:200 G4:300 ' +
  'A4:200 G4:200 F#4:300 E4:200 D4:200 C4:300 ' +
  'B3:200 A3:200 G3:300 A3:600 r:500 ' +
  'C4:200 E4:200 G4:300 B4:200 A4:200 G4:300 ' +
  'F#4:200 E4:200 D4:300 E4:200 G4:200 B4:300 ' +
  'A4:200 G4:200 F#4:300 E4:200 D4:200 C4:300 ' +
  'B3:200 A3:200 G3:300 A3:900 r:200 ' +
  'E4:200 G4:200 B4:300 D5:200 C5:200 B4:300 ' +
  'A4:200 G4:200 F#4:300 G4:200 B4:200 D5:300 ' +
  'C5:200 B4:200 A4:300 G4:200 F#4:200 E4:300 ' +
  'D4:200 C4:200 B3:300 C4:700 r:400 '
)

const VOID_DRIVE_BASS = seq(
  'A1:300 E2:300 A1:300 E2:300 ' +
  'G1:300 D2:300 G1:300 D2:300 ' +
  'F1:300 C2:300 F1:300 C2:300 ' +
  'E1:300 B1:300 E1:300 B1:300 ' +
  'A1:300 E2:300 G1:300 D2:300 ' +
  'F1:300 C2:300 E1:300 B1:300 ' +
  'D1:300 A1:300 C1:300 G1:300 ' +
  'A1:900 '
)

const VOID_DRIVE_DRUMS: AYNote[] = [
  ...Array.from({ length: 4 }, silentBar).flat(),
  ...Array.from({ length: 10 }, doubleKick).flat(),
  ...Array.from({ length: 8 }, kickBar).flat(),
  ...Array.from({ length: 10 }, doubleKick).flat(),
  ...Array.from({ length: 6 }, tripleKick).flat(),
  ...Array.from({ length: 8 }, doubleKick).flat(),
]

// ─── TRACK 2: Shadow Pulse (rýchlejšie kvapkanie + napätie) ──────────────────

const SHADOW_PULSE_MELODY = seq(
  'E4:180 r:80 D#4:180 r:80 B3:240 G3:180 r:80 A3:180 r:80 B3:240 ' +
  'E4:180 r:80 G4:180 r:80 F4:240 D4:300 B3:180 r:120 ' +
  'C4:180 r:80 B3:180 r:80 G3:240 A3:180 r:80 C4:180 r:80 B3:240 ' +
  'G3:240 F3:240 E3:240 E4:400 r:300 ' +
  'E4:200 F#4:200 G4:240 B3:300 A3:180 G3:180 ' +
  'E4:200 D#4:200 B3:240 G3:300 A3:180 B3:180 ' +
  'C4:200 B3:200 A3:240 G3:200 F#3:200 E3:240 ' +
  'D#4:400 B3:180 r:120 E4:900 '
)

const SHADOW_PULSE_BASS = seq(
  'E1:300 B1:300 E1:300 B1:300 ' +
  'D1:300 A1:300 D1:300 A1:300 ' +
  'C1:300 G1:300 C1:300 G1:300 ' +
  'B0:300 F#1:300 B0:300 F#1:300 ' +
  'E1:300 B1:300 D1:300 A1:300 ' +
  'C1:300 G1:300 B0:300 F#1:300 ' +
  'A0:300 E1:300 G0:300 D1:300 ' +
  'E1:900 '
)

const SHADOW_PULSE_NOISE: AYNote[] = [
  ...Array.from({ length: 3 }, silentBar).flat(),
  ...Array.from({ length: 8 }, fastDripBar).flat(),
  ...Array.from({ length: 8 }, doubleDripBar).flat(),
  ...Array.from({ length: 6 }, deepDripBar).flat(),
  ...Array.from({ length: 8 }, doubleDripBar).flat(),
  ...Array.from({ length: 6 }, fastDripBar).flat(),
  ...Array.from({ length: 5 }, silentBar).flat(),
]

// ─── TRACK 3: Winged Drive (vylepšená verzia najlepšieho tracku) ─────────────

const WINGED_DRIVE_MELODY = seq(
  'A3:160 C4:160 E4:220 G4:160 F#4:160 E4:220 ' +
  'D4:160 C4:160 B3:220 C4:160 E4:160 G4:220 ' +
  'A4:160 G4:160 F#4:220 E4:160 D4:160 C4:220 ' +
  'B3:160 A3:160 G3:220 A3:500 r:300 ' +
  'C4:160 E4:160 G4:220 B4:160 A4:160 G4:220 ' +
  'F#4:160 E4:160 D4:220 E4:160 G4:160 B4:220 ' +
  'A4:160 G4:160 F#4:220 E4:160 D4:160 C4:220 ' +
  'B3:160 A3:160 G3:220 A3:800 r:100 ' +
  'E4:160 G4:160 B4:220 D5:160 C5:160 B4:220 ' +
  'A4:160 G4:160 F#4:220 G4:160 B4:160 D5:220 ' +
  'C5:160 B4:160 A4:220 G4:160 F#4:160 E4:220 ' +
  'D4:160 C4:160 B3:220 C4:600 r:200 '
)

const WINGED_DRIVE_BASS = seq(
  'A1:220 E2:220 A1:220 E2:220 ' +
  'G1:220 D2:220 G1:220 D2:220 ' +
  'F1:220 C2:220 F1:220 C2:220 ' +
  'E1:220 B1:220 E1:220 B1:220 ' +
  'A1:220 E2:220 G1:220 D2:220 ' +
  'F1:220 C2:220 E1:220 B1:220 ' +
  'D1:220 A1:220 C1:220 G1:220 ' +
  'A1:800 '
)

const WINGED_DRIVE_NOISE: AYNote[] = [
  ...Array.from({ length: 3 }, silentBar).flat(),
  ...Array.from({ length: 10 }, doubleKick).flat(),
  ...Array.from({ length: 8 }, hardKickBar).flat(),
  ...Array.from({ length: 10 }, doubleKick).flat(),
  ...Array.from({ length: 8 }, tripleKick).flat(),
  ...Array.from({ length: 6 }, doubleKick).flat(),
]

// ─── TRACK 4: Moon Rush (rýchly, hnací, s nádejou) ────────────────────────────

const MOON_RUSH_MELODY = seq(
  'A3:180 C4:180 E4:240 G4:180 F#4:180 E4:240 ' +
  'D4:180 C4:180 B3:240 C4:180 E4:180 G4:240 ' +
  'A4:180 G4:180 F#4:240 E4:180 D4:180 C4:240 ' +
  'B3:180 A3:180 G3:240 A3:700 r:200 ' +
  'E4:180 G4:180 B4:240 D5:180 C5:180 B4:240 ' +
  'A4:180 G4:180 F#4:240 G4:180 B4:180 D5:240 ' +
  'C5:180 B4:180 A4:240 G4:180 F#4:180 E4:240 ' +
  'D4:180 C4:180 B3:240 C4:700 r:200 ' +
  'A3:180 C4:180 E4:240 G4:180 F#4:180 E4:240 ' +
  'D4:180 C4:180 B3:240 C4:180 E4:180 G4:240 ' +
  'A4:180 G4:180 F#4:240 E4:180 D4:180 C4:240 ' +
  'B3:180 A3:180 G3:240 A3:900 '
)

const MOON_RUSH_BASS = seq(
  'A1:240 E2:240 A1:240 E2:240 ' +
  'G1:240 D2:240 G1:240 D2:240 ' +
  'F1:240 C2:240 F1:240 C2:240 ' +
  'E1:240 B1:240 E1:240 B1:240 ' +
  'A1:240 E2:240 G1:240 D2:240 ' +
  'F1:240 C2:240 E1:240 B1:240 ' +
  'D1:240 A1:240 C1:240 G1:240 ' +
  'A1:900 '
)

const MOON_RUSH_DRUMS: AYNote[] = [
  ...Array.from({ length: 3 }, silentBar).flat(),
  ...Array.from({ length: 9 }, doubleKick).flat(),
  ...Array.from({ length: 8 }, hardKickBar).flat(),
  ...Array.from({ length: 10 }, doubleKick).flat(),
  ...Array.from({ length: 7 }, tripleKick).flat(),
  ...Array.from({ length: 8 }, doubleKick).flat(),
]

// ─── Finálna štruktúra ───────────────────────────────────────────────────────

interface MusicTrack {
  readonly name: string
  readonly a: AYNote[]
  readonly b: AYNote[]
  readonly c: AYNote[]
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { name: 'Void Drive', a: VOID_DRIVE_MELODY, b: VOID_DRIVE_BASS, c: VOID_DRIVE_DRUMS },
  { name: 'Shadow Pulse', a: SHADOW_PULSE_MELODY, b: SHADOW_PULSE_BASS, c: SHADOW_PULSE_NOISE },
  { name: 'Winged Drive', a: WINGED_DRIVE_MELODY, b: WINGED_DRIVE_BASS, c: WINGED_DRIVE_NOISE },
  { name: 'Moon Rush', a: MOON_RUSH_MELODY, b: MOON_RUSH_BASS, c: MOON_RUSH_DRUMS },
] as const

// ─── Scheduler a ovládanie (nemením) ─────────────────────────────────────────

type Timer = ReturnType<typeof setTimeout>

let loopTimer: Timer | null = null
let current: AYHandle | null = null
let currentTrack = 0
let loopsPlayed = 0
let muted = false

export function makeTrackShuffler(rng: Rng): (current: number, count: number) => number {
  let bag: number[] = []
  return (current, count) => {
    if (count <= 1) return current
    if (bag.length === 0) {
      bag = rng.shuffle(Array.from({ length: count }, (_, i) => i))
      if (bag[0] === current) bag.push(bag.shift()!)
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

export function startMusic(): void {
  if (loopTimer || muted || !getAudioContext()) return
  loopsPlayed = 0
  playLoopAndScheduleNext()
}

export function stopMusic(): void {
  clearLoop()
  current?.stop()
  current = null
}

export function toggleMusic(): void {
  if (loopTimer) {
    muted = true
    stopMusic()
  } else {
    muted = false
    startMusic()
  }
}

export function isMusicPlaying(): boolean {
  return loopTimer !== null
}

export function nextMusicTrack(): string {
  const wasPlaying = loopTimer !== null
  if (wasPlaying) stopMusic()
  currentTrack = (currentTrack + 1) % MUSIC_TRACKS.length
  loopsPlayed = 0
  if (wasPlaying) playLoopAndScheduleNext()
  return activeTrack().name
}

export function currentMusicTrackName(): string {
  return activeTrack().name
}
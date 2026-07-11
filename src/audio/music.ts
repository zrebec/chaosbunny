/**
 * Background cave music — action-oriented AY suites for chaosBunny.
 * Rýchlejšie, rytmickejšie, hnacie verzie (Jump King feel).
 * Všetko kompatibilné s existujúcim schedulerom.
 */

import {
  seq, playAY, getAudioContext, loadPSG, playAYDump, AY_MACHINE,
  type AYNote, type AYHandle, type AYDump, type Rng,
} from 'zx-kit'
import { MUSIC_LOOPS_PER_TRACK } from '../config.js'

// ─── Action-oriented helpers ─────────────────────────────────────────────────

const KICK: AYNote = { freq: 52, dur: 120, noise: true, noisePeriod: 24, envShape: 0, envCycleDurMs: 120 }
const HARD_KICK: AYNote = { freq: 46, dur: 100, noise: true, noisePeriod: 22, envShape: 0, envCycleDurMs: 100 }
const DRIP: AYNote = { freq: 0, dur: 70, noise: true, noisePeriod: 16, envShape: 0, envCycleDurMs: 70 }
const DEEP_DRIP: AYNote = { freq: 0, dur: 95, noise: true, noisePeriod: 23, envShape: 0, envCycleDurMs: 95 }
const rest = (dur: number): AYNote => ({ freq: 0, dur })

const silentBar = (): AYNote[] => [rest(1100)]
const kickBar = (): AYNote[] => [KICK, rest(980)]
const hardKickBar = (): AYNote[] => [HARD_KICK, rest(1000)]
const doubleKick = (): AYNote[] => [KICK, rest(380), KICK, rest(420)]
const tripleKick = (): AYNote[] => [KICK, rest(160), KICK, rest(160), KICK, rest(320)]

const fastDripBar = (): AYNote[] => [rest(420), DRIP, rest(580)]
const doubleDripBar = (): AYNote[] => [rest(200), DRIP, rest(300), DRIP, rest(400)]
const deepDripBar = (): AYNote[] => [rest(360), DEEP_DRIP, rest(640)]

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

// ─── Unified music transport — one playlist, one next(), any kind ─────────────
// A song is just DATA; we don't care how it was made — hand-composed AY note loops,
// or a real PSG register dump from the scene (author's export, offline PT3→PSG…).
// The transport holds ONE index and ONE `source`, and offers ONE next(). A per-kind
// adapter is the only code that knows how to turn a song into a playable Source.
// Radio: when a song ends, the source calls onEnded → the transport advances to the
// next song, across kinds. Add a new format = a Song variant + a case in start().

type Timer = ReturnType<typeof setTimeout>

/** Anything the transport can drive once started — kind-agnostic. */
interface Source {
  stop(): void
  setMuted(on: boolean): void
}

/** A song is data. `ay` = note loops (playAY); `psg` = a scene register dump (playAYDump). */
type Song =
  | { kind: 'ay'; name: string; a: AYNote[]; b: AYNote[]; c: AYNote[] }
  | { kind: 'psg'; name: string; url: string }

// The ONE playlist. AY tracks + PSG showcase tunes — treated identically. Add any
// .psg to public/music/ (converted offline; only tunes you're licensed to use) or
// any AY track; next() walks through all of them, in order.
export const PLAYLIST: readonly Song[] = [
  ...MUSIC_TRACKS.map((t): Song => ({ kind: 'ay', name: t.name, a: t.a, b: t.b, c: t.c })),
  { kind: 'psg', name: 'nq — rgbk+', url: './music/nq-rgbk.psg' },
  { kind: 'psg', name: 'je_main_trigger5', url: './music/je_main_trigger5.psg' },
]

// State — the whole model is two variables (index + source) plus intent/mute flags.
let index = 0
let source: Source | null = null
let wantPlaying = false            // does the player want music on? (survives mute)
let muted = false
let token = 0                      // guards async starts against a newer next()/stop()
let status = ''                    // HUD "now playing" line
const psgCache = new Map<string, AYDump>()

const wrap = (i: number): number => ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length

// Pure shuffle-bag (kept; handy if you later want a shuffled play order).
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

// ── Per-kind adapters — the ONLY code that knows about a kind ──

function startAy(song: Extract<Song, { kind: 'ay' }>, onEnded: () => void): Source {
  const len = Math.max(...[song.a, song.b, song.c].map((ns) => ns.reduce((s, n) => s + n.dur, 0)))
  const target = MUSIC_LOOPS_PER_TRACK > 0 ? MUSIC_LOOPS_PER_TRACK : 1
  let handle: AYHandle | null = null
  let timer: Timer | null = null
  let loops = 0
  const loop = (): void => {
    handle = playAY({ a: song.a, b: song.b, c: song.c })
    timer = setTimeout(() => { if (++loops >= target) onEnded(); else loop() }, len)
  }
  loop()
  return {
    stop() { if (timer) clearTimeout(timer); timer = null; handle?.stop(); handle = null },
    setMuted(on) {
      if (on) { if (timer) clearTimeout(timer); timer = null; handle?.stop(); handle = null }
      else if (!handle) loop()
    },
  }
}

async function startPsg(song: Extract<Song, { kind: 'psg' }>, onEnded: () => void): Promise<Source> {
  let dump = psgCache.get(song.url)
  if (!dump) { dump = await loadPSG(song.url); psgCache.set(song.url, dump) }
  const h = await playAYDump(dump, { loop: false, ...AY_MACHINE.melodik }) // loop:false → it ends → onEnded
  h.onEnded = onEnded
  return { stop: () => h.stop(), setMuted: (on) => { if (on) h.pause(); else h.resume() } }
}

// ── Transport — kind-agnostic; the switch on kind lives ONLY here ──

function startCurrent(): void {
  const mine = ++token
  source?.stop()
  source = null
  const song = PLAYLIST[index]!
  status = `♪ ${index + 1}/${PLAYLIST.length} ${song.name}`
  const onEnded = (): void => { if (mine === token) advance(index + 1) }
  const applied = (s: Source): void => {
    if (mine !== token) { s.stop(); return }   // a newer start won the race
    source = s
    s.setMuted(muted)
  }
  const failed = (err: unknown): void => {
    console.error('[chaosbunny] music failed:', err)
    status = `♪ ERR ${song.name}`
    if (mine === token) advance(index + 1)     // radio: skip a track that won't load
  }
  // AY is synchronous (source ready immediately); PSG loads/decodes, so it's async.
  if (song.kind === 'psg') startPsg(song, onEnded).then(applied).catch(failed)
  else applied(startAy(song, onEnded))
}

function advance(i: number): void {
  index = wrap(i)
  if (wantPlaying) startCurrent()
}

// ── Public API — this is all the game touches ──

/** Start the radio (first user gesture). No-op before audio is unlocked or if already on. */
export function startMusic(): void {
  if (!getAudioContext() || wantPlaying) return
  wantPlaying = true
  startCurrent()
}

/** Stop playback entirely (game over / pause). Keeps the index. */
export function stopMusic(): void {
  wantPlaying = false
  token++                          // invalidate any in-flight start
  source?.stop()
  source = null
}

/** N: next song — any kind. Before audio is unlocked it just moves the pointer. */
export function nextTrack(): string {
  index = wrap(index + 1)
  if (wantPlaying) startCurrent()
  else status = `♪ ${index + 1}/${PLAYLIST.length} ${PLAYLIST[index]!.name}`
  return PLAYLIST[index]!.name
}

/** M: mute / unmute whatever is playing. */
export function toggleMute(): void {
  muted = !muted
  source?.setMuted(muted)
}

export function isMusicPlaying(): boolean { return wantPlaying }
export function isMuted(): boolean { return muted }
export function currentTrackName(): string { return PLAYLIST[index]!.name }

/** HUD "now playing" line (empty when off). */
export function musicStatus(): string {
  return wantPlaying ? `${status}${muted ? ' (muted)' : ''}` : ''
}

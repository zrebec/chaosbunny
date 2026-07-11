import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { createRng, initAudio } from 'zx-kit'
import {
  makeTrackShuffler,
  startMusic,
  stopMusic,
  toggleMute,
  nextTrack,
  currentTrackName,
  isMusicPlaying,
  isMuted,
  PLAYLIST,
  MUSIC_TRACKS,
} from '../src/audio/music.js'
import { MUSIC_LOOPS_PER_TRACK } from '../src/config.js'

// ── makeTrackShuffler (pure logic) — unchanged ────────────────────────────────

describe('makeTrackShuffler', () => {
  it('never returns the same track twice in a row', () => {
    const next = makeTrackShuffler(createRng('seed-a'))
    let cur = 0
    for (let i = 0; i < 200; i++) {
      const n = next(cur, 3)
      expect(n).not.toBe(cur)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(3)
      cur = n
    }
  })

  it('plays every track once per cycle (shuffle-bag — no droughts)', () => {
    const next = makeTrackShuffler(createRng('seed-b'))
    let cur = 0
    const seen = new Set<number>()
    for (let i = 0; i < 3; i++) { cur = next(cur, 3); seen.add(cur) }
    expect(seen).toEqual(new Set([0, 1, 2]))
  })

  it('is deterministic for a given seed', () => {
    const a = makeTrackShuffler(createRng('same'))
    const b = makeTrackShuffler(createRng('same'))
    let ca = 0, cb = 0
    for (let i = 0; i < 20; i++) {
      ca = a(ca, 4); cb = b(cb, 4)
      expect(ca).toBe(cb)
    }
  })

  it('with a single track just returns it (no rotation)', () => {
    expect(makeTrackShuffler(createRng('x'))(0, 1)).toBe(0)
  })
})

// ── nextTrack headless (before audio unlock): walks the whole playlist ─────────

describe('nextTrack (headless pointer walk — any kind)', () => {
  it('cycles through every song in the playlist and wraps', () => {
    const start = currentTrackName()
    const names = [start]
    for (let i = 0; i < PLAYLIST.length; i++) names.push(nextTrack())
    expect(names.at(-1)).toBe(start)                                   // full wrap
    expect(new Set(names)).toEqual(new Set(PLAYLIST.map((s) => s.name))) // AY + PSG, all visited
  })
})

// ── radio auto-advance + mute (mocked AudioContext + fake timers, AY portion) ──

function makeParam() {
  return {
    value: 0,
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  }
}

class MockAudioContext {
  readonly sampleRate = 44100
  readonly currentTime = 0
  readonly destination = {}
  readonly state = 'running'
  createOscillator() { return { type: 'sine', frequency: makeParam(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
  createGain() { return { gain: makeParam(), connect: vi.fn(), disconnect: vi.fn(), context: this } }
  createBiquadFilter() { return { type: 'lowpass', frequency: makeParam(), connect: vi.fn(), disconnect: vi.fn() } }
  createBuffer(_ch: number, len: number) { return { getChannelData: () => new Float32Array(len) } }
  createBufferSource() { return { buffer: null as unknown, loop: false, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
}

// Loop length of an AY track = its longest channel (matches startAy()).
const loopMsOf = (name: string): number => {
  const t = MUSIC_TRACKS.find((x) => x.name === name)!
  const sum = (ns: readonly { readonly dur: number }[]) => ns.reduce((s, n) => s + n.dur, 0)
  return Math.max(sum(t.a), sum(t.b), sum(t.c))
}

// Move the transport's pointer to a known AY track (index 0) without touching audio.
function seekToFirstAyTrack(): void {
  let guard = 0
  while (currentTrackName() !== MUSIC_TRACKS[0]!.name && guard++ < PLAYLIST.length * 2) nextTrack()
}

describe('radio auto-advance (AY loops)', () => {
  beforeAll(() => {
    vi.stubGlobal('AudioContext', MockAudioContext)
    initAudio() // unlock zx-kit's shared context so playAY actually schedules
  })
  afterEach(() => { stopMusic() })
  afterAll(() => { vi.unstubAllGlobals() })

  it('auto-advances to the next song after MUSIC_LOOPS_PER_TRACK loops', () => {
    vi.useFakeTimers()
    seekToFirstAyTrack()
    const before = currentTrackName()
    const loopMs = loopMsOf(before)
    startMusic()
    expect(currentTrackName()).toBe(before)                         // still on the starting song
    vi.advanceTimersByTime(MUSIC_LOOPS_PER_TRACK * loopMs + 50)     // Nth loop boundary → advance
    expect(currentTrackName()).not.toBe(before)                    // moved on, on its own
    vi.useRealTimers()
  })

  it('does not advance while muted', () => {
    vi.useFakeTimers()
    seekToFirstAyTrack()
    startMusic()
    toggleMute()                                                   // mute → the loop timer is cleared
    const at = currentTrackName()
    vi.advanceTimersByTime(5 * loopMsOf(at))                       // nothing scheduled → no rotation
    expect(currentTrackName()).toBe(at)
    toggleMute()                                                   // leave it unmuted for the next test
    vi.useRealTimers()
  })
})

// ── mute survives a later startMusic() (the audio-unlock bug) ──────────────────

describe('mute is not undone by a later startMusic()', () => {
  beforeAll(() => {
    vi.stubGlobal('AudioContext', MockAudioContext)
    initAudio()
  })
  afterAll(() => { vi.unstubAllGlobals() })
  afterEach(() => { stopMusic() })

  it('a later startMusic() does not unmute', () => {
    vi.useFakeTimers()
    seekToFirstAyTrack()
    startMusic()
    expect(isMusicPlaying()).toBe(true)
    expect(isMuted()).toBe(false)

    toggleMute()                         // press M → mute
    expect(isMuted()).toBe(true)

    startMusic()                         // a later keydown fires the audio-unlock handler
    expect(isMuted()).toBe(true)         // stays muted (was the bug: it restarted unmuted)

    toggleMute()                         // press M again → unmute
    expect(isMuted()).toBe(false)
    vi.useRealTimers()
  })
})

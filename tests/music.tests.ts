import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { createRng, initAudio } from 'zx-kit'
import {
  makeTrackShuffler,
  startMusic,
  stopMusic,
  toggleMusic,
  nextMusicTrack,
  currentMusicTrackName,
  isMusicPlaying,
  MUSIC_TRACKS,
} from '../src/audio/music.js'

// ── makeTrackShuffler (pure logic) ────────────────────────────────────────────

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

// ── nextMusicTrack (manual skip, headless — runs before audio is unlocked) ─────

describe('nextMusicTrack (manual skip, headless)', () => {
  it('cycles through every track name in order and wraps to the start', () => {
    const start = currentMusicTrackName()
    const names = [start]
    for (let i = 0; i < MUSIC_TRACKS.length; i++) names.push(nextMusicTrack())
    expect(names.at(-1)).toBe(start)                                  // full wrap
    expect(new Set(names)).toEqual(new Set(MUSIC_TRACKS.map((t) => t.name))) // visited all
  })
})

// ── auto-rotation (mocked AudioContext + fake timers) ─────────────────────────

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

const LOOP_MS = 9600 // every track sums to 8 bars × 1200 ms

describe('background music auto-rotation', () => {
  beforeAll(() => {
    vi.stubGlobal('AudioContext', MockAudioContext)
    initAudio() // unlock zx-kit's shared context so startMusic() actually schedules loops
  })
  afterEach(() => { stopMusic() })
  afterAll(() => { vi.unstubAllGlobals() })

  it('auto-shuffles to a different track after MUSIC_LOOPS_PER_TRACK loops', () => {
    vi.useFakeTimers()
    const before = currentMusicTrackName()
    startMusic()
    expect(currentMusicTrackName()).toBe(before)          // still on the starting track
    vi.advanceTimersByTime(2 * LOOP_MS)                   // 2nd loop boundary triggers the switch
    expect(currentMusicTrackName()).not.toBe(before)      // auto-rotated
    vi.useRealTimers()
  })

  it('stays put while muted — no loop is scheduled after toggling off', () => {
    vi.useFakeTimers()
    startMusic()
    toggleMusic()                                         // mute (stops immediately)
    const muted = currentMusicTrackName()
    vi.advanceTimersByTime(5 * LOOP_MS)                   // nothing scheduled → no rotation
    expect(currentMusicTrackName()).toBe(muted)
    vi.useRealTimers()
  })
})

// ── Mute stays muted across audio-unlock gestures (bug fix) ───────────────────

describe('mute is not undone by a later startMusic() (M then move)', () => {
  beforeAll(() => {
    vi.stubGlobal('AudioContext', MockAudioContext)
    initAudio()
  })
  afterAll(() => { vi.unstubAllGlobals() })
  afterEach(() => { stopMusic() })

  it('startMusic() after pressing M does NOT restart the music', () => {
    vi.useFakeTimers()
    if (!isMusicPlaying()) toggleMusic() // ensure a clean, unmuted, playing start
    expect(isMusicPlaying()).toBe(true)

    toggleMusic()                        // press M → mute
    expect(isMusicPlaying()).toBe(false)

    startMusic()                         // a later keydown fires the audio-unlock handler
    expect(isMusicPlaying()).toBe(false) // stays muted (was the bug: it restarted)

    toggleMusic()                        // press M again → unmute
    expect(isMusicPlaying()).toBe(true)
    vi.useRealTimers()
  })
})

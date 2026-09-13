/**
 * Beeper sound for the beat events — one short ZX blip per thing that happened.
 * The two that carry the game are `?` (two soft high ticks) and `!` (a sharp
 * falling pair): a player must be able to hear being noticed without looking.
 *
 * Three rules hold this together, and all three came out of the same complaint —
 * that a `?` could not be heard:
 *
 * 1. **A beat says at most {@link SOUNDS_PER_BEAT} things**, highest priority first
 *    ({@link orderEvents}). A step that picks up a carrot, creaks a board, is heard
 *    and gets noticed used to fire five blips at once; the one that mattered was
 *    buried under the four that did not. The hints already obey this rule — only one
 *    sentence fits in a beat — and the sound had no such rule at all.
 * 2. **A noise comes from where it happened** ({@link panFor}), panned relative to
 *    Randy: the plank that creaked to his left is heard on the left. The room is one
 *    screen, so this adds no information the player cannot already see — it only
 *    makes what he can see easier to find.
 * 3. **A warning ducks the hum** (`music.ts`), because the real question was never
 *    whether the blips are pretty but whether one cuts through the cellar.
 *
 * Untested by ear — the levels and pitches are a first guess for the owner to tune
 * (`S` on the loaded picture is the bench).
 */
import { beep, getAudioContext, resumeAudio, stopBeep } from 'zx-kit'
import type { BeatEvent, World } from './beat.js'
import type { Cell } from './grid.js'
import { ATTRS_MS, PILOT_MS, PIXELS_MS } from './loader.js'
import { duckMusic } from './music.js'

/**
 * How many cells to the side a noise has to be to sit fully in one ear. Four, because
 * that is the width of a cone and the reach of a bat — beyond it the difference stops
 * being a direction and becomes "over there".
 */
export const PAN_SPREAD = 4

/** How many sounds a single beat may make. See the module header. */
export const SOUNDS_PER_BEAT = 3

/**
 * Which event wins when a beat holds several. The order is what a player needs to
 * hear, not what happened first: the room ending, then a warning, then the noises
 * Randy made himself, then the world answering, and a plain step last of all — it is
 * the most frequent sound in the game and the one that muddies every other.
 */
export const EVENT_PRIORITY: Readonly<Record<BeatEvent['type'], number>> = {
  caught: 100,
  bitten: 100,
  won: 95,
  suspicious: 90,
  lampOut: 80,
  lever: 75,
  creak: 70,
  batHeard: 65,
  heard: 60,
  wade: 55,
  pickup: 50,
  eat: 45,
  calm: 40,
  throw: 30,
  ears: 20,
  step: 10,
  wait: 0,
}

/** Events that pull the hum down out of the way (`music.ts`). */
const DUCKS: ReadonlySet<BeatEvent['type']> = new Set(['suspicious', 'caught', 'bitten', 'won'])

/** `wait` is a beat with nothing to say; it must not spend one of the three slots. */
const SILENT: ReadonlySet<BeatEvent['type']> = new Set(['wait'])

/**
 * A noise's place in the stereo field, −1 left to +1 right, measured from Randy —
 * "where is it from here", not "where is it on the screen". Straight ahead or
 * straight behind is centre, which is the honest answer: the ear cannot tell those
 * apart either, and neither can Randy.
 *
 * Pure, so the arithmetic can be checked without an audio context.
 */
export function panFor(randy: Cell, at: Cell): number {
  const dx = (at.x - randy.x) / PAN_SPREAD
  return Math.max(-1, Math.min(1, dx))
}

/**
 * The events a beat actually plays: the loudest {@link SOUNDS_PER_BEAT}, in the order
 * they should be heard. Pure — the tests hold the priority without making a sound.
 */
export function orderEvents(events: readonly BeatEvent[]): BeatEvent[] {
  return events
    .filter((e) => !SILENT.has(e.type))
    .map((e, i) => ({ e, i })) // a stable sort by hand: equal priorities keep beat order
    .sort((a, b) => EVENT_PRIORITY[b.e.type] - EVENT_PRIORITY[a.e.type] || a.i - b.i)
    .slice(0, SOUNDS_PER_BEAT)
    .map(({ e }) => e)
}

/** Where an event happened, or `null` when it has no place in the room (a step, a win). */
export function eventCell(e: BeatEvent, world: World | null): Cell | null {
  switch (e.type) {
    case 'throw': return e.to
    case 'pickup':
    case 'creak':
    case 'wade':
    case 'lever':
    case 'lampOut':
      return e.at
    case 'eat': return e.at
    case 'heard':
    case 'suspicious':
    case 'calm':
    case 'caught':
      return world?.foxes[e.fox]?.cell ?? null
    case 'batHeard':
    case 'bitten':
      return world?.bats[e.bat]?.cell ?? null
    default:
      return null
  }
}

function blip(freq: number, ms: number, delayMs = 0, volume = 0.5, pan = 0): void {
  const ctx = getAudioContext()
  if (!ctx) return
  resumeAudio()
  beep(freq, ms, ctx.currentTime + delayMs / 1000, pan, volume)
}

/**
 * Plays a beat's sounds. `world` is the world *after* the beat — it is what turns a
 * `fox: 2` into a cell, and so into a direction; without one (the bench) everything
 * is centred.
 */
export function playEvents(events: readonly BeatEvent[], world: World | null = null): void {
  if (events.some((e) => DUCKS.has(e.type))) duckMusic()
  for (const e of orderEvents(events)) {
    const at = eventCell(e, world)
    const pan = at && world ? panFor(world.randy.cell, at) : 0
    switch (e.type) {
      case 'step':
        blip(95, 12, 0, 0.15, pan)
        break
      case 'ears':
        if (e.down) { blip(660, 25, 0, 0.3, pan); blip(440, 35, 25, 0.3, pan) }
        else { blip(440, 25, 0, 0.3, pan); blip(660, 35, 25, 0.3, pan) }
        break
      case 'throw':
        // The arc, panned to where it is going: the ear follows the carrot.
        blip(1200, 20, 0, 0.3, pan); blip(900, 20, 30, 0.3, pan); blip(600, 30, 60, 0.3, pan)
        break
      case 'heard':
        blip(260, 35, 110, 0.4, pan) // the carrot landing, just after the throw
        break
      case 'lampOut':
        // Glass, then the room going quiet: three quick high shards and a low thud,
        // timed to land after the throw's own arc.
        blip(2600, 14, 95, 0.5, pan); blip(1900, 14, 113, 0.45, pan); blip(2300, 12, 131, 0.4, pan)
        blip(150, 110, 155, 0.45, pan)
        break
      case 'wade':
        // A foot going in and the water closing over it: low, wet, and not a warning.
        // Heard by the player only — no fox in the cellar hears water (RULES.md §R2).
        blip(240, 40, 0, 0.3, pan); blip(180, 60, 40, 0.25, pan); blip(150, 50, 100, 0.2, pan)
        break
      case 'creak':
        // Old wood bending: two low tones that slide the wrong way, and loud enough to worry.
        blip(190, 55, 0, 0.4, pan); blip(150, 70, 50, 0.4, pan)
        break
      case 'lever':
        // Iron: the handle clunks, then the grate grinds — up when it opens, down when it shuts.
        blip(120, 70, 0, 0.5, pan)
        if (e.open) { blip(300, 40, 80, 0.4, pan); blip(380, 40, 125, 0.4, pan); blip(460, 60, 170, 0.4, pan) }
        else { blip(460, 40, 80, 0.4, pan); blip(380, 40, 125, 0.4, pan); blip(300, 60, 170, 0.4, pan) }
        break
      case 'pickup':
        blip(880, 40, 0, 0.4, pan); blip(1320, 60, 45, 0.4, pan)
        break
      case 'eat':
        blip(200, 30, 0, 0.3, pan); blip(170, 30, 70, 0.3, pan)
        break
      case 'suspicious':
        // The warning, and the one sound the whole game is judged on. Two identical
        // ticks read as a clock, not as an alarm \u2014 so it is a rising minor third
        // struck twice, loud, and it arrives over a ducked hum. Panned to the fox
        // that did the noticing: on a beat with two of them, the ear says which.
        blip(1170, 30, 0, 0.5, pan); blip(1400, 45, 34, 0.5, pan)
        blip(1170, 30, 150, 0.4, pan); blip(1400, 55, 184, 0.4, pan)
        break
      case 'calm':
        blip(700, 40, 0, 0.2, pan)
        break
      case 'caught':
      case 'bitten':
        blip(1800, 60, 0, 0.6, pan); blip(900, 140, 70, 0.6, pan)
        break
      case 'batHeard':
        // A squeak, from the bat rather than from the middle of the screen.
        blip(3200, 12, 0, 0.25, pan); blip(3600, 12, 40, 0.25, pan); blip(3200, 12, 80, 0.25, pan)
        break
      case 'won':
        blip(660, 70, 0, 0.5); blip(880, 70, 80, 0.5); blip(1320, 140, 160, 0.5)
        break
      case 'wait':
        break
    }
  }
}

/**
 * The sounds, one key each, for the screen that plays them back to back (`title.ts`,
 * mode `sound`). Tuning a beeper means hearing two of them next to each other, which
 * is hard to do while playing — so this is the tuning bench: every number that makes
 * a sound is in `playEvents` above, and this list is how you audition a change.
 */
export const SOUND_BENCH: ReadonlyArray<{ readonly key: string; readonly play: () => void }> = [
  { key: '1', play: () => playEvents([{ type: 'step' }]) },
  { key: '2', play: () => playEvents([{ type: 'ears', down: true }]) },
  { key: '3', play: () => playEvents([{ type: 'throw', from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }]) },
  { key: '4', play: () => playEvents([{ type: 'heard', fox: 0 }]) },
  { key: '5', play: () => playEvents([{ type: 'lampOut', lamp: 0, at: { x: 0, y: 0 } }]) },
  { key: '6', play: () => playEvents([{ type: 'creak', at: { x: 0, y: 0 } }]) },
  { key: '7', play: () => playEvents([{ type: 'lever', at: { x: 0, y: 0 }, open: true }]) },
  { key: '8', play: () => playEvents([{ type: 'pickup', at: { x: 0, y: 0 } }]) },
  { key: '9', play: () => playEvents([{ type: 'suspicious', fox: 0 }]) },
  { key: '0', play: () => playEvents([{ type: 'caught', fox: 0, why: 'seen' }]) },
  { key: 'A', play: () => playEvents([{ type: 'batHeard', bat: 0 }]) },
  { key: 'B', play: () => playEvents([{ type: 'won' }]) },
  { key: 'C', play: () => playEvents([{ type: 'wade', at: { x: 0, y: 0 } }]) },
]

/** A step into a wall, or a throw with nowhere to go: a dull knock, and no beat. */
export function playBlocked(): void {
  blip(110, 40, 0, 0.3)
}

/** A beat taken back: the step blip played backwards — quiet, and rising. */
export function playUndo(): void {
  blip(300, 18, 0, 0.25)
  blip(450, 18, 22, 0.25)
  blip(620, 22, 44, 0.2)
}

/**
 * A tape loading: the 808 Hz pilot tone, then data — a stream of short pulses at
 * the two bit frequencies, drawn from a fixed seed so every load sounds the same.
 * Quiet on purpose: it is atmosphere, and a key cuts it short ({@link stopTape}).
 */
export function playTape(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  resumeAudio()
  const t0 = ctx.currentTime
  beep(808, PILOT_MS - 20, t0, 0, 0.1)
  let seed = 0x2f6b
  for (let t = 0; t < PIXELS_MS + ATTRS_MS; t += 9) {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff
    beep(seed & 0x10000 ? 2000 : 1000, 6, t0 + (PILOT_MS + t) / 1000, 0, 0.06)
  }
}

export function stopTape(): void {
  stopBeep()
}

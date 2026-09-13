/**
 * The three rules that turned the beeper from a pile of blips into something a
 * player can act on. All of them are pure arithmetic on the beat's events, so they
 * can be checked without an audio context — which is the only reason they *can* be
 * checked: `beep()` is a no-op with no context, so a test that called it would pass
 * no matter what it played.
 */
import { describe, expect, it } from 'vitest'
import type { BeatEvent } from '../../src/stealth/beat.js'
import {
  EVENT_PRIORITY, PAN_SPREAD, SOUNDS_PER_BEAT, eventCell, orderEvents, panFor, SOUND_BENCH,
} from '../../src/stealth/sound.js'
import { beat, startWorld } from '../../src/stealth/beat.js'
import { move, testRoom, WAIT } from './helpers.js'

const at = { x: 0, y: 0 }

describe('a beat says at most three things, loudest first', () => {
  it('drops the quiet ones when a beat is busy — the step is the first to go', () => {
    // The beat that used to fire five blips at once: a step onto a plank that picked
    // up a carrot, was heard, and got Randy noticed.
    const busy: BeatEvent[] = [
      { type: 'step' },
      { type: 'creak', at },
      { type: 'pickup', at },
      { type: 'heard', fox: 0 },
      { type: 'suspicious', fox: 0 },
    ]
    const played = orderEvents(busy).map((e) => e.type)
    expect(played).toHaveLength(SOUNDS_PER_BEAT)
    expect(played[0]).toBe('suspicious')
    expect(played).not.toContain('step')
  })

  it('leaves a quiet beat alone — one step still makes its one sound', () => {
    expect(orderEvents([{ type: 'step' }]).map((e) => e.type)).toEqual(['step'])
  })

  it('never spends a slot on `wait`, which makes no sound at all', () => {
    const played = orderEvents([
      { type: 'wait' }, { type: 'step' }, { type: 'creak', at }, { type: 'heard', fox: 0 },
    ])
    expect(played.map((e) => e.type)).toEqual(['creak', 'heard', 'step'])
  })

  it('keeps the beat order when two events matter equally', () => {
    const played = orderEvents([{ type: 'caught', fox: 1, why: 'seen' }, { type: 'bitten', bat: 0 }])
    expect(played.map((e) => e.type)).toEqual(['caught', 'bitten'])
  })

  it('ranks the room ending and the warning above everything Randy does himself', () => {
    const loudest = ['caught', 'bitten', 'won', 'suspicious'] as const
    const quietest = ['throw', 'ears', 'step', 'wait'] as const
    for (const loud of loudest) {
      for (const quiet of quietest) {
        expect(EVENT_PRIORITY[loud], `${loud} must outrank ${quiet}`).toBeGreaterThan(EVENT_PRIORITY[quiet])
      }
    }
  })

  it('gives every event a rank, so a new one cannot silently sort last', () => {
    // `wait` is the only zero, and it is zero because it is silent.
    for (const [type, rank] of Object.entries(EVENT_PRIORITY)) {
      if (type !== 'wait') expect(rank, type).toBeGreaterThan(0)
    }
  })
})

describe('a noise comes from where it happened', () => {
  const randy = { x: 8, y: 5 }

  it('is centred when it is on Randy, straight ahead or straight behind', () => {
    expect(panFor(randy, randy)).toBe(0)
    expect(panFor(randy, { x: 8, y: 0 })).toBe(0)
    expect(panFor(randy, { x: 8, y: 10 })).toBe(0)
  })

  it('leans the way the noise is, and is hard over at the spread', () => {
    expect(panFor(randy, { x: 6, y: 5 })).toBeLessThan(0)
    expect(panFor(randy, { x: 10, y: 5 })).toBeGreaterThan(0)
    expect(panFor(randy, { x: randy.x - PAN_SPREAD, y: 5 })).toBe(-1)
    expect(panFor(randy, { x: randy.x + PAN_SPREAD, y: 5 })).toBe(1)
  })

  it('never goes past the ears, however wide the room', () => {
    expect(panFor(randy, { x: -50, y: 5 })).toBe(-1)
    expect(panFor(randy, { x: 50, y: 5 })).toBe(1)
  })

  it('finds the fox that did the noticing, so two foxes are told apart', () => {
    const room = testRoom(
      ['################', '#R.....D', '#.......'],
      [{ route: [[3, 1]], facing: 'left' }, { route: [[6, 2]], facing: 'left' }],
    )
    const r = beat(room, startWorld(room), WAIT)
    const spotted = r.events.find((e) => e.type === 'suspicious')!
    expect(eventCell(spotted, r.world)).toEqual({ x: 3, y: 1 })
  })

  it('has no place for a step or a win — those are Randy, and Randy is the centre', () => {
    expect(eventCell({ type: 'step' }, null)).toBeNull()
    expect(eventCell({ type: 'won' }, null)).toBeNull()
    expect(eventCell({ type: 'ears', down: true }, null)).toBeNull()
  })

  it('reads the cell straight off the events that carry one', () => {
    const cell = { x: 4, y: 7 }
    expect(eventCell({ type: 'creak', at: cell }, null)).toEqual(cell)
    expect(eventCell({ type: 'lampOut', lamp: 0, at: cell }, null)).toEqual(cell)
    expect(eventCell({ type: 'wade', at: cell }, null)).toEqual(cell)
    expect(eventCell({ type: 'throw', from: { x: 0, y: 0 }, to: cell }, null)).toEqual(cell)
  })

  it('survives a world it was not given — the bench plays everything centred', () => {
    expect(eventCell({ type: 'suspicious', fox: 3 }, null)).toBeNull()
    expect(eventCell({ type: 'batHeard', bat: 9 }, null)).toBeNull()
  })
})

describe('the bench', () => {
  it('plays without a world, and without an audio context, without throwing', () => {
    for (const sound of SOUND_BENCH) expect(() => sound.play()).not.toThrow()
  })

  it('has a key for every sound it names', () => {
    expect(new Set(SOUND_BENCH.map((s) => s.key)).size).toBe(SOUND_BENCH.length)
  })
})

describe('the wade is still the player\'s sound and nobody else\'s', () => {
  it('is ranked below a warning but above a plain step', () => {
    expect(EVENT_PRIORITY.wade).toBeGreaterThan(EVENT_PRIORITY.step)
    expect(EVENT_PRIORITY.wade).toBeLessThan(EVENT_PRIORITY.suspicious)
  })

  it('is played from the cell the foot went into', () => {
    const room = testRoom(['################', '#R.w...D', '#.......'], [])
    const dry = beat(room, startWorld(room), move('right')).world
    const wet = beat(room, dry, move('right'))
    const wade = wet.events.find((e) => e.type === 'wade')!
    expect(eventCell(wade, wet.world)).toEqual({ x: 3, y: 1 })
  })
})

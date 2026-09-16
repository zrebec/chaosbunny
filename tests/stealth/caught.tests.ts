import { describe, it, expect } from 'vitest'
import { beat, startWorld, type Action, type BeatEvent, type World } from '../../src/stealth/beat.js'
import { CAUGHT_REASONS, caughtReason } from '../../src/stealth/caught.js'
import type { Cell } from '../../src/stealth/grid.js'
import { parseRoom } from '../../src/stealth/room.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { actionsFor } from '../../src/stealth/solver.js'
import { LOCALES } from '../../src/stealth/strings.js'
import { testRoom } from './helpers.js'

/** A fox at (1,1) looking right along an open row, with a shadow and floor in its cone. */
const room = testRoom([
  '#R.............#',
  '#...s..........#',
  '#.............D#',
], [{ route: [[1, 1]], facing: 'right' }])

const SEEN: BeatEvent[] = [{ type: 'caught', fox: 0, why: 'seen' }]

function at(cell: Cell, earsDown: boolean, base: World = startWorld(room)): World {
  return { ...base, randy: { ...base.randy, cell, earsDown } }
}

describe('caughtReason — why the room ended, checked rather than guessed', () => {
  it('says nothing when nothing caught him', () => {
    expect(caughtReason(room, at({ x: 3, y: 1 }, false), [{ type: 'step' }])).toBeNull()
  })

  it('right in front of a fox, nothing hides him', () => {
    expect(caughtReason(room, at({ x: 2, y: 1 }, true), SEEN)).toBe('front')
  })

  it('ears down out in the open: they hide only in shadow', () => {
    expect(caughtReason(room, at({ x: 3, y: 1 }, true), SEEN)).toBe('earsDownOpen')
  })

  it('ears up in a shadow that would have hidden him with them down', () => {
    expect(caughtReason(room, at({ x: 4, y: 1 }, false), SEEN)).toBe('earsUpShadow')
  })

  it('ears up behind a crate that would have hidden him with them down', () => {
    // The fox looks right along row 1; (4,2) is three ahead and one aside, and the
    // sightline to it crosses the crate at (3,2).
    const crated = testRoom([
      '#R.............#',
      '#..............#',
      '#..=...........#',
      '#.............D#',
    ], [{ route: [[1, 1]], facing: 'right' }])
    expect(caughtReason(crated, at({ x: 4, y: 2 }, false, startWorld(crated)), SEEN)).toBe('earsUpCover')
  })

  it('ears up on open floor, with nothing that would have hidden him: seen again after the ?', () => {
    expect(caughtReason(room, at({ x: 3, y: 1 }, false), SEEN)).toBe('seenAgain')
  })

  it('names a lamp lighting the shadow he is hiding in', () => {
    const lamplit = testRoom([
      '#R.............#',
      '#...s..........#',
      '#...L.........D#',
    ], [{ route: [[1, 1]], facing: 'right' }])
    expect(caughtReason(lamplit, at({ x: 4, y: 1 }, true, startWorld(lamplit)), SEEN)).toBe('litShadow')
    // …and with the lamp out that fox cannot see him at all: no reason beats a wrong one.
    const dark = { ...at({ x: 4, y: 1 }, true, startWorld(lamplit)), lamps: 0 }
    expect(caughtReason(lamplit, dark, SEEN)).toBeNull()
  })

  it('tells meeting a fox apart from being seen by one', () => {
    expect(caughtReason(room, at({ x: 3, y: 1 }, false), [{ type: 'caught', fox: 0, why: 'bumped' }])).toBe('bumped')
  })

  it('tells a bat in flight apart from walking into a roosting one', () => {
    const batty = { ...testRoom(['#R.............#', '#.............D#']), bats: [{ x: 5, y: 0 }] }
    const w = startWorld(batty)
    expect(caughtReason(batty, w, [{ type: 'bitten', bat: 0 }])).toBe('batBumped')
    const flying = { ...w, bats: [{ ...w.bats[0]!, mode: 'fly' as const }] }
    expect(caughtReason(batty, flying, [{ type: 'bitten', bat: 0 }])).toBe('batFlight')
  })
})

describe('caughtReason in the real cellar', () => {
  it('has a reason for every catch that random play runs into, in every room', () => {
    // Wandering players get caught in every way the rules allow; each of those catches
    // must be explainable from the world the beat hands back, or the line would be blank.
    const actions: Action[] = actionsFor(true, true)
    let seed = 0x5eed
    const next = (n: number): number => {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff
      return seed % n
    }
    let catches = 0
    for (const src of ROOM_SOURCES) {
      const r = parseRoom(src)
      for (let run = 0; run < 150; run++) {
        let w = startWorld(r)
        for (let i = 0; i < 60; i++) {
          const result = beat(r, w, actions[next(actions.length)]!)
          if (result.outcome === 'blocked') continue
          if (result.outcome === 'caught') {
            catches++
            expect(caughtReason(r, result.world, result.events), `${r.name}, run ${run}`).not.toBeNull()
          }
          if (result.outcome !== 'ok') break
          w = result.world
        }
      }
    }
    expect(catches).toBeGreaterThan(100) // the test must actually meet foxes and bats
  })
})

describe('the words for it', () => {
  it('has a line for every reason, in both tongues, that fits the screen in ROM glyphs', () => {
    for (const [code, str] of Object.entries(LOCALES)) {
      for (const why of CAUGHT_REASONS) {
        const line = str.caughtWhy[why]
        expect(line, `${code}.${why}`).toBeTruthy()
        expect(line.length, `${code}.${why}: "${line}"`).toBeLessThanOrEqual(32)
        expect(/^[\x20-\x7e]*$/.test(line), `${code}.${why}`).toBe(true)
      }
      expect(new Set(CAUGHT_REASONS.map((w) => str.caughtWhy[w])).size, code).toBe(CAUGHT_REASONS.length)
    }
  })
})

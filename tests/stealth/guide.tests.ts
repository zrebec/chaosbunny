/**
 * The taught rooms' advice. Two things have to be true of it, and the second is the
 * one that would be a disaster to get wrong:
 *
 * 1. It has to keep working after the player wanders off the shortest way — that is
 *    the whole reason it asks the solver from where he is rather than following a script.
 * 2. **It must never point at a move that loses the room.** A guide that walks a
 *    beginner into a fox is worse than no guide: he learns that the game lies.
 *
 * The second is checked by walking the advice, beat by beat, in every taught room and
 * in a room deliberately played into a mess first.
 *
 * This file names no cell of any shipped room. It asks whether following the advice
 * wins and how long that takes, never what the advice was.
 */
import { describe, expect, it } from 'vitest'
import { beat, startWorld } from '../../src/stealth/beat.js'
import { GUIDED_ROOMS, forgetPlans, guide, isGuided, targetOf } from '../../src/stealth/guide.js'
import { parseRoom } from '../../src/stealth/room.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { move, testRoom } from './helpers.js'

const taught = ROOM_SOURCES.slice(0, GUIDED_ROOMS).map(parseRoom)

describe('only the first rooms are taught', () => {
  it('holds the hand for exactly two rooms, then lets go', () => {
    expect(isGuided(0)).toBe(true)
    expect(isGuided(GUIDED_ROOMS - 1)).toBe(true)
    expect(isGuided(GUIDED_ROOMS)).toBe(false)
    expect(isGuided(ROOM_SOURCES.length - 1)).toBe(false)
  })
})

describe('following the advice wins the room', () => {
  it.each(taught.map((r) => [r.name, r] as const))('%s', (_name, room) => {
    forgetPlans(room)
    let world = startWorld(room)
    let steps = 0
    let won = 0
    for (;;) {
      const g = guide(room, world)
      expect(g, 'the advice must not run out before the door').not.toBeNull()
      const r = beat(room, world, g!.action)
      expect(r.outcome, 'the advice must never be a move that loses the room').not.toBe('caught')
      expect(r.outcome, 'the advice must never be a move that cannot be made').not.toBe('blocked')
      world = r.world
      if (r.outcome === 'won') {
        won = r.world.beats
        break
      }
      expect(++steps, 'the advice must reach the door, not walk in circles').toBeLessThan(200)
    }
    // Following it is not merely a way out, it is *the* way out: the room's own par.
    expect(won).toBe(room.par)
  })
})

describe('it still works from a mess', () => {
  it.each(taught.map((r) => [r.name, r] as const))('%s, after wandering off', (_name, room) => {
    forgetPlans(room)
    // Walk about for a few beats without asking, in whichever directions are legal,
    // and only then start listening. The point is a world the plan never visited.
    let world = startWorld(room)
    for (const dir of ['down', 'right', 'up', 'left', 'right'] as const) {
      const r = beat(room, world, move(dir))
      if (r.outcome === 'ok') world = r.world
    }
    let steps = 0
    for (;;) {
      const g = guide(room, world)
      expect(g, 'a room already played into must still have advice').not.toBeNull()
      const r = beat(room, world, g!.action)
      expect(r.outcome).not.toBe('caught')
      expect(r.outcome).not.toBe('blocked')
      if (r.outcome === 'won') break
      world = r.world
      expect(++steps).toBeLessThan(200)
    }
  })
})

describe('the mark points where the move goes', () => {
  it('marks the cell a step lands on', () => {
    const room = testRoom(['################', '#R.....D'], [])
    const world = startWorld(room)
    expect(targetOf(room, world, move('right'))).toEqual({ x: 2, y: 1 })
  })

  it('marks where a carrot would land, not where it was thrown from', () => {
    const room = testRoom(['################', '#R.....D'], [], 1)
    const world = startWorld(room)
    const at = targetOf(room, world, { kind: 'throw', dir: 'right' })
    expect(at).not.toBeNull()
    expect(at!.x).toBeGreaterThan(world.randy.cell.x)
  })

  it('marks nothing for the ears or for waiting — those happen where he stands', () => {
    const room = testRoom(['################', '#R.....D'], [])
    const world = startWorld(room)
    expect(targetOf(room, world, { kind: 'ears' })).toBeNull()
    expect(targetOf(room, world, { kind: 'wait' })).toBeNull()
  })
})

describe('a room with no way out is told so, rather than guessed at', () => {
  it('gives no advice instead of a wrong one', () => {
    // A door walled off from the start: nothing to advise, and it must not invent one.
    const room = testRoom(['################', '#R.....#', '#######D'], [])
    forgetPlans(room)
    expect(guide(room, startWorld(room))).toBeNull()
  })
})

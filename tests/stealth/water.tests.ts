import { describe, it, expect } from 'vitest'
import { beat, startWorld, WADE_BEATS } from '../../src/stealth/beat.js'
import { foxCanEnter, passesLight, randyCanEnter, tileAt } from '../../src/stealth/room.js'
import { solve } from '../../src/stealth/solver.js'
import { move, testRoom, WAIT } from './helpers.js'

describe('water', () => {
  it('is Randy\'s to wade and no fox\'s to follow', () => {
    expect(randyCanEnter('water')).toBe(true)
    expect(foxCanEnter('water')).toBe(false)
    expect(passesLight('water')).toBe(true)
    const room = testRoom(['#Rww..D#########'])
    expect(tileAt(room, { x: 2, y: 0 })).toBe('water')
    expect(beat(room, startWorld(room), move('right')).outcome).toBe('ok')
  })

  it('costs the clock two beats a step, and dry ground one', () => {
    const wet = testRoom(['#Rww..D#########'])
    const dry = testRoom(['#R....D#########'])
    expect(beat(wet, startWorld(wet), move('right')).world.beats).toBe(WADE_BEATS)
    expect(beat(dry, startWorld(dry), move('right')).world.beats).toBe(1)
  })

  it('costs the world two turns as well: a guard walks twice while he wades', () => {
    // A guard pacing a corridor of its own, out of sight and earshot of the water.
    const rows = ['#Rww..D#########', '################', '#........#######']
    const wet = testRoom(rows, [{ route: [[1, 2], [8, 2]] }])
    const dry = testRoom(['#R....D#########', '################', '#........#######'], [{ route: [[1, 2], [8, 2]] }])
    const wetFox = beat(wet, startWorld(wet), move('right')).world.foxes[0]!.cell
    const dryFox = beat(dry, startWorld(dry), move('right')).world.foxes[0]!.cell
    expect(dryFox).toEqual({ x: 2, y: 2 }) // one step of its round
    expect(wetFox).toEqual({ x: 3, y: 2 }) // two, for the same step of Randy's
  })

  it('leaves waiting and the other verbs at one beat each', () => {
    const room = testRoom(['#Rww..D#########'])
    const w = beat(room, startWorld(room), move('right')).world
    expect(beat(room, w, WAIT).world.beats).toBe(WADE_BEATS + 1)
  })

  it('is a route the solver counts, not a wall', () => {
    // The dry way round is longer in cells and cheaper in beats: the room has to choose.
    const room = testRoom([
      '#Rww..D#########',
      '#.############',
      '#....########',
      '#....#######',
    ])
    const best = solve(room)
    expect(best).not.toBeNull()
    expect(best!.length).toBeGreaterThan(0)
  })
})

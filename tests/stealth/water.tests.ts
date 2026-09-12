import { describe, it, expect } from 'vitest'
import { beat, startWorld, WADE_BEATS } from '../../src/stealth/beat.js'
import { foxCanEnter, parseRoom, passesLight, randyCanEnter, tileAt } from '../../src/stealth/room.js'
import { solve } from '../../src/stealth/solver.js'
import { move, testRoom, EARS, WAIT } from './helpers.js'

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

describe('the world while he wades', () => {
  /** A bat roosting far enough away to hear an ears-up step and come. */
  const withBat = (line: string) =>
    parseRoom({
      name: 'wet hall',
      rows: [line, '#..............#', '#.............D#'].concat(
        Array.from({ length: 8 }, () => '#'.repeat(16)),
      ),
      patrols: [],
      bats: [[5, 1]],
    })

  it('gives a bat two flights for one wade — which is a bite, and always will be', () => {
    // A bat hears an ears-up step from four cells and covers two a flight, so a wade
    // inside its earshot hands it exactly the four it needs. The answer is the ears:
    // it hears nothing when they are down. The `~` over a roosting bat is the warning.
    const wet = withBat('#Rww...........#')
    const dry = withBat('#R.............#')
    const wetStep = beat(wet, startWorld(wet), move('right'))
    const dryStep = beat(dry, startWorld(dry), move('right'))
    expect(dryStep.outcome).toBe('ok')
    expect(wetStep.outcome).toBe('caught')
    expect(wetStep.events.some((e) => e.type === 'bitten')).toBe(true)
  })

  it('hears nothing at all when he wades with his ears down', () => {
    const wet = withBat('#Rww...........#')
    const quiet = beat(wet, beat(wet, startWorld(wet), EARS).world, move('right'))
    expect(quiet.outcome).toBe('ok')
    expect(quiet.events.some((e) => e.type === 'batHeard')).toBe(false)
  })

  it('never lets a fox into the water, however long he stands in it', () => {
    const room = parseRoom({
      name: 'pool',
      rows: ['#Rww......D####', '#..............#'.slice(0, 16)].concat(
        Array.from({ length: 9 }, () => '#'.repeat(16)),
      ).map((r) => r.padEnd(16, '#')),
      patrols: [{ route: [[6, 1], [9, 1]] }],
    })
    let world = startWorld(room)
    for (let i = 0; i < 8; i++) world = beat(room, world, i === 0 ? move('right') : WAIT).world
    for (const fox of world.foxes) expect(tileAt(room, fox.cell)).not.toBe('water')
  })
})

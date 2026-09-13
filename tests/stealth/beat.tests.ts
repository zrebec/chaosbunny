import { describe, it, expect } from 'vitest'
import { beat, SNEAK_STEPS, startWorld, throwTarget, THROW_RANGE, type World } from '../../src/stealth/beat.js'
import { ROOM_01 } from '../../src/stealth/rooms/room01.js'
import { parseRoom } from '../../src/stealth/room.js'
import { solve } from '../../src/stealth/solver.js'
import { EARS, move, play, testRoom, toss, WAIT } from './helpers.js'

const kinds = (r: { events: readonly { type: string }[] }) => r.events.map((e) => e.type)

describe('Randy acts', () => {
  it('a step into a wall costs nothing — no beat, nothing moves', () => {
    const room = testRoom(['#R..D'], [{ route: [[3, 0]], facing: 'left' }])
    const world = startWorld(room)
    const r = beat(room, world, move('left'))
    expect(r.outcome).toBe('blocked')
    expect(r.world).toBe(world)
  })

  it('a step onto the door wins at once, whoever is watching it', () => {
    const room = testRoom(['#RD..'], [{ route: [[4, 0]], facing: 'left' }])
    const r = beat(room, startWorld(room), move('right'))
    expect(r.outcome).toBe('won')
    expect(kinds(r)).toContain('won')
  })

  it('a step into a fox is being caught', () => {
    const room = testRoom(['#R...D'], [{ route: [[2, 0]], facing: 'right' }])
    const r = beat(room, startWorld(room), move('right'))
    expect(r.outcome).toBe('caught')
    expect(r.events).toContainEqual({ type: 'caught', fox: 0, why: 'bumped' })
  })

  it('ears up or down takes a beat: the foxes move', () => {
    const room = testRoom(['#R....D', '#......'], [{ route: [[5, 1], [3, 1]] }])
    const r = beat(room, startWorld(room), EARS)
    expect(r.world.randy.earsDown).toBe(true)
    expect(r.world.beats).toBe(1)
    expect(r.world.foxes[0]!.cell).toEqual({ x: 4, y: 1 })
  })
})

describe(`ears down: ${SNEAK_STEPS} steps, then the ears must come up`, () => {
  const room = testRoom(['#R.......D'])

  it('allows exactly that many steps, and blocks the next without costing a beat', () => {
    const results = play(room, [EARS, ...Array.from({ length: SNEAK_STEPS }, () => move('right'))])
    expect(results.every((r) => r.outcome === 'ok')).toBe(true)
    const tired = results.at(-1)!.world
    expect(tired.randy.sneakLeft).toBe(0)
    const blocked = beat(room, tired, move('right'))
    expect(blocked.outcome).toBe('blocked')
    expect(blocked.world).toBe(tired)
  })

  it('costs nothing to stay hidden in place, however long', () => {
    const results = play(room, [EARS, WAIT, WAIT, WAIT, WAIT, move('right')])
    expect(results.at(-1)!.outcome).toBe('ok')
    expect(results.at(-1)!.world.randy.sneakLeft).toBe(SNEAK_STEPS - 1)
  })

  it('refills when the ears go up — and again when they go back down', () => {
    const steps = Array.from({ length: SNEAK_STEPS }, () => move('right'))
    const results = play(room, [EARS, ...steps, EARS, EARS, move('right')])
    expect(results.at(-1)!.outcome).toBe('ok')
    expect(results.at(-1)!.world.randy).toMatchObject({ earsDown: true, sneakLeft: SNEAK_STEPS - 1 })
  })

  it('never limits walking with the ears up', () => {
    const results = play(room, Array.from({ length: 7 }, () => move('right')))
    expect(results.map((r) => r.outcome)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'])
  })
})

describe('contact and sight', () => {
  it('a fox that walks onto Randy catches him', () => {
    const room = testRoom(['#.D', '#R.'], [{ route: [[1, 0], [1, 1]] }])
    const [r] = play(room, [WAIT])
    expect(r!.outcome).toBe('caught')
    expect(r!.events).toContainEqual({ type: 'caught', fox: 0, why: 'bumped' })
  })

  it('seen from further away: first ? and the fox stops, then ! if he is still there', () => {
    const room = testRoom(['#R...D'], [{ route: [[4, 0]], facing: 'left' }])
    const [first, second] = play(room, [WAIT, WAIT])
    expect(kinds(first!)).toContain('suspicious')
    expect(first!.world.foxes[0]!.mode).toBe('suspicious')
    expect(second!.outcome).toBe('caught')
    expect(second!.events).toContainEqual({ type: 'caught', fox: 0, why: 'seen' })
  })

  it('seen right in front: caught at once', () => {
    const room = testRoom(['#R..D'], [{ route: [[3, 0]], facing: 'left' }])
    const [r] = play(room, [move('right')])
    expect(r!.outcome).toBe('caught')
    expect(r!.events).toContainEqual({ type: 'caught', fox: 0, why: 'seen' })
  })

  it('out of sight while ?: the fox calms down and walks on', () => {
    // The fox walks left along row 1. (2,2) is a wall that hides the cell below Randy.
    const room = testRoom(['#.......D', '#R.......', '#.#......'], [{ route: [[5, 1], [3, 1]] }])
    const [seen, hidden, after] = play(room, [WAIT, move('down'), WAIT])
    expect(kinds(seen!)).toContain('suspicious')
    expect(seen!.world.foxes[0]!.cell).toEqual({ x: 4, y: 1 })
    expect(kinds(hidden!)).toContain('calm')
    expect(hidden!.world.foxes[0]).toMatchObject({ cell: { x: 4, y: 1 }, mode: 'patrol' }) // stood still that beat
    expect(after!.world.foxes[0]!.cell).toEqual({ x: 3, y: 1 })
    expect(after!.outcome).toBe('ok')
  })

  it('sight is judged after the foxes move, not before', () => {
    // The fox starts five away — out of range — and its step makes it four.
    const room = testRoom(['#R......D'], [{ route: [[6, 0], [4, 0]] }])
    const [r] = play(room, [WAIT])
    expect(r!.world.foxes[0]!.cell).toEqual({ x: 5, y: 0 })
    expect(kinds(r!)).toContain('suspicious')
  })

  it('a sentry sees only the way it faces: slip by while it looks away', () => {
    // The sentry at (4,0) looks right, then left, two beats each. Randy at (1,0), three to its left.
    const room = testRoom(['#R.....D'], [{ route: [[4, 0]], turns: ['right', 'left'], hold: 2 }])
    const [a, b] = play(room, [WAIT, WAIT]) // beat 1: still right; beat 2: turns left and sees him
    expect(kinds(a!)).not.toContain('suspicious')
    expect(kinds(b!)).toContain('suspicious')
  })

  it('an eating fox sees nothing, and looks again when it is done', () => {
    const room = testRoom(['#R..D'], [{ route: [[3, 0]], facing: 'left' }])
    const start = startWorld(room)
    const eating: World = { ...start, foxes: [{ ...start.foxes[0]!, mode: 'eat', timer: 1 }] }
    const [blind, done] = play(room, [WAIT, WAIT], eating)
    expect(kinds(blind!)).not.toContain('suspicious')
    expect(blind!.world.foxes[0]!.mode).toBe('eat')
    expect(kinds(done!)).toContain('suspicious')
  })
})

describe('carrots', () => {
  const room = testRoom(['#R...=..D', '#c.......'], [], 1)

  it(`fly up to ${THROW_RANGE} cells and stop short of walls and cover`, () => {
    expect(THROW_RANGE).toBe(3)
    expect(throwTarget(room, { x: 1, y: 0 }, 'right')).toEqual({ x: 4, y: 0 })
    expect(throwTarget(room, { x: 3, y: 0 }, 'right')).toEqual({ x: 4, y: 0 }) // cover at (5,0)
    expect(throwTarget(room, { x: 1, y: 0 }, 'left')).toBeNull()
  })

  it('throwing uses one up and leaves it on the floor, where it can be picked up again', () => {
    const [thrown, , back] = play(room, [toss('right'), move('right'), move('right')])
    expect(thrown!.world.randy.carrots).toBe(0)
    expect(thrown!.world.items).toContainEqual({ x: 4, y: 0 })
    expect(back!.world.randy.cell).toEqual({ x: 3, y: 0 })
    const [, , , picked] = play(room, [toss('right'), move('right'), move('right'), move('right')])
    expect(picked!.world.randy.carrots).toBe(1)
    expect(kinds(picked!)).toContain('pickup')
  })

  it('cannot be thrown with none left, or with nowhere to land', () => {
    const empty: World = { ...startWorld(room), randy: { ...startWorld(room).randy, carrots: 0 } }
    expect(beat(room, empty, toss('right')).outcome).toBe('blocked')
    expect(beat(room, startWorld(room), toss('left')).outcome).toBe('blocked')
  })

  it('a carrot lying in the room is picked up by walking over it', () => {
    const [r] = play(room, [move('down')])
    expect(r!.world.randy.carrots).toBe(2)
    expect(r!.world.items).toEqual([])
  })

  it('a fox that hears one turns toward it on the same beat', () => {
    const fox = testRoom(['#R......D', '#........', '#........'], [{ route: [[4, 2], [7, 2]] }], 1)
    const [r] = play(fox, [toss('down')]) // lands on (1,2): 3 from the fox, which was walking away
    expect(kinds(r!)).toContain('heard')
    expect(r!.world.foxes[0]).toMatchObject({ cell: { x: 3, y: 2 }, facing: 'left', mode: 'divert' })
  })
})

describe('determinism', () => {
  it('the same actions from the same start give the same world, every time', () => {
    const room = parseRoom(ROOM_01)
    const actions = solve(room)!
    const a = play(room, actions)
    const b = play(room, actions)
    expect(a.map((r) => r.world)).toEqual(b.map((r) => r.world))
    expect(a.at(-1)!.outcome).toBe('won')
  })
})

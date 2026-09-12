import { describe, it, expect } from 'vitest'
import type { Cell } from '../../src/stealth/grid.js'
import {
  advanceFox, divert, EAT_BEATS, hears, HEARING, initialFoxes, nextStepToward, type Fox,
} from '../../src/stealth/patrol.js'
import type { Room } from '../../src/stealth/room.js'
import { testRoom } from './helpers.js'

/** Advances one fox `n` beats with the given carrots on the floor, collecting every state. */
function run(room: Room, fox: Fox, n: number, items: Cell[] = []): Fox[] {
  const states: Fox[] = []
  let f = fox
  for (let i = 0; i < n; i++) {
    const r = advanceFox(room, f, items)
    if (r.ate) items.splice(items.findIndex((c) => c.x === r.ate!.x && c.y === r.ate!.y), 1)
    f = r.fox
    states.push(f)
  }
  return states
}

const OPEN = ['#R.....D', '#.......', '#.......', '#.......']
const at = (f: Fox) => `${f.cell.x},${f.cell.y}`

describe('patrolling', () => {
  it('walks its loop one cell a beat, facing the way it steps, and wraps', () => {
    const room = testRoom(OPEN, [{ route: [[2, 1], [5, 1]] }])
    const [fox] = initialFoxes(room)
    expect(fox).toMatchObject({ cell: { x: 2, y: 1 }, facing: 'right', mode: 'patrol', routeIndex: 0 })
    const steps = run(room, fox!, 7)
    expect(steps.map(at)).toEqual(['3,1', '4,1', '5,1', '4,1', '3,1', '2,1', '3,1'])
    expect(steps.map((f) => f.facing)).toEqual(['right', 'right', 'right', 'left', 'left', 'left', 'right'])
  })

  it('a standing guard stays put and keeps its facing', () => {
    const room = testRoom(OPEN, [{ route: [[4, 2]], facing: 'up' }])
    const steps = run(room, initialFoxes(room)[0]!, 3)
    expect(steps.every((f) => at(f) === '4,2' && f.facing === 'up')).toBe(true)
  })

  it('a sentry turns on the spot, holding each facing, round and round', () => {
    const room = testRoom(OPEN, [{ route: [[4, 2]], turns: ['left', 'right'], hold: 2 }])
    const [fox] = initialFoxes(room)
    expect(fox!.facing).toBe('left')
    const steps = run(room, fox!, 6)
    expect(steps.every((f) => at(f) === '4,2')).toBe(true)
    expect(steps.map((f) => f.facing)).toEqual(['left', 'right', 'right', 'left', 'left', 'right'])
  })

  it('a suspicious sentry stops turning, and picks up where it stopped', () => {
    const room = testRoom(OPEN, [{ route: [[4, 2]], turns: ['left', 'up', 'right'], hold: 1 }])
    const fox = { ...initialFoxes(room)[0]!, mode: 'suspicious' as const, resume: 'patrol' as const }
    expect(advanceFox(room, fox, []).fox).toEqual(fox)
    expect(advanceFox(room, { ...fox, mode: 'patrol' }, []).fox.facing).toBe('up')
  })

  it('a suspicious fox stands still', () => {
    const room = testRoom(OPEN, [{ route: [[2, 1], [5, 1]] }])
    const fox = { ...initialFoxes(room)[0]!, mode: 'suspicious' as const }
    expect(advanceFox(room, fox, []).fox).toEqual(fox)
  })
})

describe('nextStepToward', () => {
  it('steps straight at a target in line', () => {
    const room = testRoom(OPEN)
    expect(nextStepToward(room, { x: 2, y: 2 }, { x: 5, y: 2 })).toEqual({ x: 3, y: 2 })
  })

  it('goes round a wall the only way there is', () => {
    const room = testRoom(['#R#.D', '#.#..', '#....'])
    expect(nextStepToward(room, { x: 1, y: 1 }, { x: 3, y: 1 })).toEqual({ x: 1, y: 2 })
  })

  it('breaks a tie between equally short ways in up, right, down, left order', () => {
    const room = testRoom(['#R...D', '#.#..', '#....'])
    expect(nextStepToward(room, { x: 1, y: 1 }, { x: 3, y: 1 })).toEqual({ x: 1, y: 0 })
  })

  it('returns null for a target it cannot reach, cannot stand on, or is already at', () => {
    const room = testRoom(['#R.#.D', '#..#..'])
    expect(nextStepToward(room, { x: 1, y: 1 }, { x: 4, y: 1 })).toBeNull() // walled off
    expect(nextStepToward(room, { x: 4, y: 0 }, { x: 5, y: 0 })).toBeNull() // the door
    expect(nextStepToward(room, { x: 2, y: 1 }, { x: 2, y: 1 })).toBeNull()
  })
})

describe('hearing a carrot', () => {
  // Row 0 has a pocket at (5,0) no fox can reach: wall to its left, door to its right.
  const room = testRoom(['#R..#.D', '#.#####', '#......'], [{ route: [[1, 2], [3, 2]] }])
  const fox = initialFoxes(room)[0]!

  it(`hears within ${HEARING}, counted straight through walls`, () => {
    expect(hears(room, fox, { x: 3, y: 0 })).toBe(true) // 2 across + 2 up, through the wall row
    expect(hears(room, fox, { x: 6, y: 2 })).toBe(true) // exactly 5
    expect(hears(room, fox, { x: 5, y: 0 })).toBe(false) // 6
  })

  it('does not hear while already walking to a carrot or eating one', () => {
    expect(hears(room, divert(fox, { x: 3, y: 2 }), { x: 2, y: 2 })).toBe(false)
    expect(hears(room, { ...fox, mode: 'eat' }, { x: 2, y: 2 })).toBe(false)
  })

  it('does not hear a carrot it could not get to', () => {
    expect(hears(room, { ...fox, cell: { x: 3, y: 2 } }, { x: 5, y: 0 })).toBe(false) // 4 away, walled in
  })
})

describe('a carrot, start to finish', () => {
  const room = testRoom(OPEN, [{ route: [[2, 1], [5, 1]] }])
  const fox = divert(initialFoxes(room)[0]!, { x: 2, y: 3 })

  it(`walks to it, eats for ${EAT_BEATS} beats, walks back and patrols on`, () => {
    const states = run(room, fox, 6, [{ x: 2, y: 3 }])
    expect(states.map((f) => [at(f), f.mode])).toEqual([
      ['2,2', 'divert'],
      ['2,3', 'eat'], // arrives and starts eating: blind from this beat
      ['2,3', 'eat'],
      ['2,2', 'return'], // done: heads for the route cell it left
      ['2,1', 'patrol'],
      ['3,1', 'patrol'], // and carries on from there
    ])
    expect(states.filter((f) => f.mode === 'eat')).toHaveLength(EAT_BEATS)
  })

  it('goes back if the carrot is gone when it gets there — one cell a beat, as always', () => {
    const states = run(room, fox, 4, [])
    expect(states.map((f) => [at(f), f.mode])).toEqual([
      ['2,2', 'divert'],
      ['2,3', 'return'], // reached the spot and found nothing
      ['2,2', 'return'],
      ['2,1', 'patrol'],
    ])
  })

  it('eats at once when the carrot lands on it', () => {
    const r = advanceFox(room, divert(initialFoxes(room)[0]!, { x: 2, y: 1 }), [{ x: 2, y: 1 }])
    expect(r.ate).toEqual({ x: 2, y: 1 })
    expect(r.fox).toMatchObject({ cell: { x: 2, y: 1 }, mode: 'eat' })
  })
})

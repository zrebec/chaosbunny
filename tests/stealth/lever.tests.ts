import { describe, it, expect } from 'vitest'
import { beat, startWorld, type World } from '../../src/stealth/beat.js'
import { HEARING } from '../../src/stealth/patrol.js'
import {
  foxCanEnter, parseRoom, randyCanEnter, randyCanStep, ROOM_COLS, ROOM_ROWS,
} from '../../src/stealth/room.js'
import { spots } from '../../src/stealth/rules.js'
import { solve } from '../../src/stealth/solver.js'
import { move, play, testRoom, WAIT } from './helpers.js'

type Events = readonly { readonly type: string }[]
const heard = (e: Events): boolean => e.some((x) => x.type === 'heard')

/** A hall with a grate at (6,0) between Randy and the door, and the lever off to one side at (5,1). */
const hall = (foxAt?: readonly [number, number]) =>
  testRoom(
    [
      '#R....+..D######',
      '#..../.........#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
      '#..............#',
    ],
    foxAt ? [{ route: [[foxAt[0], foxAt[1]]], facing: 'down' }] : [],
  )

/** Randy put where the test needs him, everything else as the room starts. */
const at = (room: ReturnType<typeof hall>, x: number, y: number): World => {
  const w = startWorld(room)
  return { ...w, randy: { ...w.randy, cell: { x, y } } }
}

describe('the grate', () => {
  const room = hall()

  it('is a wall until the lever is pulled, and floor after', () => {
    expect(randyCanStep('grate', false)).toBe(false)
    expect(randyCanStep('grate', true)).toBe(true)
    expect(beat(room, at(room, 5, 0), move('right')).outcome).toBe('blocked')
    const pulled: World = { ...at(room, 5, 0), pulled: true }
    expect(beat(room, pulled, move('right')).outcome).toBe('ok')
  })

  it("is never a way for a fox, open or shut — it is a rabbit's hatch", () => {
    expect(foxCanEnter('grate')).toBe(false)
    const rows = Array.from({ length: ROOM_ROWS }, () => '#'.repeat(ROOM_COLS))
    rows[1] = '#R./.+.D########'
    expect(() => parseRoom({ name: 'bad', rows, patrols: [{ route: [[4, 1], [6, 1]] }] })).toThrow(/\(5,1\), a grate/)
  })

  it('hides nobody: a fox sees straight through the bars', () => {
    expect(randyCanEnter('grate')).toBe(true)
    const seen = testRoom(['#..+..D#########', '#R.../..........'], [{ route: [[1, 0]], facing: 'right' }])
    expect(spots(seen, { x: 1, y: 0 }, 'right', { x: 3, y: 0 }, false)).not.toBeNull()
  })
})

describe('the lever', () => {
  it('is worked by stepping on it, and works the other way the next time', () => {
    const room = hall()
    const first = beat(room, at(room, 4, 1), move('right'))
    expect(first.world.pulled).toBe(true)
    expect(first.events.some((e) => e.type === 'lever' && e.open)).toBe(true)
    const back = beat(room, beat(room, first.world, move('left')).world, move('right'))
    expect(back.world.pulled).toBe(false)
    expect(back.events.some((e) => e.type === 'lever' && !e.open)).toBe(true)
  })

  it('is the loudest thing Randy can do: heard as far as a carrot, and no further', () => {
    const near = hall([5, 1 + HEARING])
    expect(heard(beat(near, at(near, 4, 1), move('right')).events)).toBe(true)
    const far = hall([5, 1 + HEARING + 1])
    expect(heard(beat(far, at(far, 4, 1), move('right')).events)).toBe(false)
  })

  it("makes the fox listen for a beat first — the noise is under Randy's own foot", () => {
    const room = hall([5, 4])
    const fox0 = startWorld(room).foxes[0]!
    const r = beat(room, at(room, 4, 1), move('right'))
    expect(r.world.foxes[0]!.mode).toBe('divert')
    expect(r.world.foxes[0]!.cell).toEqual(fox0.cell)
    expect(beat(room, r.world, WAIT).world.foxes[0]!.cell).not.toEqual(fox0.cell)
  })

  it('is the only way past a grate: the way out works it', () => {
    const room = hall()
    const best = solve(room)
    expect(best).not.toBeNull()
    const results = play(room, best!)
    expect(results.at(-1)!.outcome).toBe('won')
    expect(results.some((r) => r.events.some((e) => e.type === 'lever'))).toBe(true)
  })
})

describe('a room with a lever', () => {
  it('refuses a lever with nothing to open, and a grate with nothing to open it', () => {
    const rows = (line: string) =>
      Array.from({ length: ROOM_ROWS }, (_, y) => (y === 1 ? line : '#'.repeat(ROOM_COLS)))
    expect(() => parseRoom({ name: 'bad', rows: rows('#R./..D#########'), patrols: [] })).toThrow(/lever with no grate/)
    expect(() => parseRoom({ name: 'bad', rows: rows('#R.+..D#########'), patrols: [] })).toThrow(/grate with no lever/)
    expect(() => parseRoom({ name: 'bad', rows: rows('#R//.+D#########'), patrols: [] })).toThrow(/at most one/)
  })

  it('starts with every grate shut', () => {
    expect(startWorld(hall()).pulled).toBe(false)
  })
})

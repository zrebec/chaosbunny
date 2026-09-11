import { describe, it, expect } from 'vitest'
import { advanceBat, BAT_CIRCLE_BEATS, BAT_HEARING, BAT_SPEED, flightPath, flyTo, initialBats } from '../../src/stealth/bat.js'
import { beat, startWorld } from '../../src/stealth/beat.js'
import { parseRoom, ROOM_COLS, ROOM_ROWS, type RoomSource } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { EARS, move, play, toss, WAIT } from './helpers.js'

/** Like testRoom, with bats. */
function batRoom(map: readonly string[], bats: [number, number][], extra: Partial<RoomSource> = {}) {
  const rows = Array.from({ length: ROOM_ROWS }, (_, y) => (map[y] ?? '').padEnd(ROOM_COLS, '#'))
  return parseRoom({ name: 'bats', rows, patrols: [], bats, ...extra })
}

const kinds = (r: { events: readonly { type: string }[] }) => r.events.map((e) => e.type)

describe('roosts', () => {
  it('hang over floor or shadow, never a wall or a crate', () => {
    expect(() => batRoom(['#R..D', '#.=..'], [[2, 1]])).toThrow(/roosts over \(2,1\), a cover/)
    expect(() => batRoom(['#R..D'], [[0, 0]])).toThrow(/a wall/)
    expect(() => batRoom(['#R..D'], [[1, 0]])).toThrow(/on Randy/)
    expect(() => batRoom(['#R..D', '#s...'], [[1, 1]]).bats).not.toThrow()
  })
})

describe('what a bat hears', () => {
  const room = batRoom(['#R......D', '#........'], [[5, 1]])

  it(`an ears-up step within ${BAT_HEARING}, and it takes off at once`, () => {
    const [r] = play(room, [move('right')]) // (2,0) is 3 + 1 from (5,1)
    expect(kinds(r!)).toContain('batHeard')
    expect(r!.world.bats[0]!.mode).toBe('fly')
    expect(r!.world.bats[0]!.cell).not.toEqual({ x: 5, y: 1 })
  })

  it('not a step with the ears down, nor waiting, nor moving the ears', () => {
    const results = play(room, [EARS, move('right'), move('right'), WAIT, EARS])
    expect(results.flatMap(kinds)).not.toContain('batHeard')
    expect(results.at(-1)!.world.bats[0]).toMatchObject({ cell: { x: 5, y: 1 }, mode: 'roost' })
  })

  it(`not a step ${BAT_HEARING + 1} away`, () => {
    const far = batRoom(['#R......D', '#........'], [[6, 1]])
    const [r] = play(far, [move('right')]) // (2,0) is 4 + 1 from (6,1)
    expect(kinds(r!)).not.toContain('batHeard')
  })

  it('a carrot landing, like a fox does', () => {
    const [r] = play(batRoom(['#R......D', '#........'], [[7, 1]], { carrots: 1 }), [toss('right')])
    expect(kinds(r!)).toContain('batHeard')
    expect(r!.world.bats[0]!.target).toEqual({ x: 4, y: 0 })
  })

  it('straight through walls — but cannot fly through them, and goes back to its roost', () => {
    const walled = batRoom(['#R..D', '#####', '#....'], [[2, 2]])
    const [r] = play(walled, [move('right')])
    expect(kinds(r!)).toContain('batHeard')
    expect(r!.world.bats[0]).toMatchObject({ cell: { x: 2, y: 2 }, mode: 'roost' })
  })
})

describe('how a bat flies', () => {
  it(`${BAT_SPEED} cells a beat, over crates, not through walls`, () => {
    expect(BAT_SPEED).toBe(2)
    expect(flightPath(batRoom(['#R=.D'], []), { x: 3, y: 0 }, { x: 1, y: 0 }, BAT_SPEED)).toEqual([{ x: 2, y: 0 }, { x: 1, y: 0 }])
    expect(flightPath(batRoom(['#R#.D'], []), { x: 3, y: 0 }, { x: 1, y: 0 }, BAT_SPEED)).toEqual([])
  })

  it(`circles the sound for ${BAT_CIRCLE_BEATS} beats, then flies home and roosts`, () => {
    const room = batRoom(['#R......D', '#........'], [[5, 1]])
    let bat = flyTo(initialBats(room)[0]!, { x: 3, y: 1 })
    const states: [string, string][] = []
    for (let i = 0; i < 4; i++) {
      bat = advanceBat(room, bat).bat
      states.push([`${bat.cell.x},${bat.cell.y}`, bat.mode])
    }
    expect(states).toEqual([['3,1', 'circle'], ['3,1', 'circle'], ['5,1', 'roost'], ['5,1', 'roost']])
  })

  it('chases the newest sound', () => {
    const room = batRoom(['#R......D', '#........', '#........'], [[4, 2]], { carrots: 1 })
    // The carrot lands at (1,2), 3 from the roost; the bat is on its way when Randy steps to (2,0).
    const [thrown, stepped] = play(room, [toss('down'), move('right')])
    expect(thrown!.world.bats[0]!.target).toEqual({ x: 1, y: 2 })
    expect(stepped!.world.bats[0]!.target).toEqual({ x: 2, y: 0 })
  })
})

describe('what a bat does to Randy', () => {
  const room = batRoom(['#R......D', '#........'], [[5, 1]])

  it('bites when its flight passes through his cell', () => {
    const results = play(room, [move('right'), WAIT])
    expect(results.at(-1)!.outcome).toBe('caught')
    expect(results.at(-1)!.events).toContainEqual({ type: 'bitten', bat: 0 })
  })

  it('bites when he walks into it', () => {
    const quiet = play(room, [EARS, move('down'), move('right'), EARS, EARS, move('right'), move('right'), EARS, EARS, move('right')])
    expect(quiet.at(-1)!.outcome).toBe('caught')
    expect(quiet.at(-1)!.events).toContainEqual({ type: 'bitten', bat: 0 })
  })

  it('never sees him: a bat has no cone', () => {
    const w = startWorld(room)
    const next = beat(room, w, WAIT)
    expect(kinds(next)).not.toContain('suspicious')
  })
})

describe('a room a bat guards', () => {
  // A corridor with the bat in an alcove just below it: walking out loud brings it
  // down on Randy; creeping — two silent steps at a time — gets him through.
  const room = batRoom(['#R.....D', '####.###'], [[4, 1]])

  it('can be left only by creeping', () => {
    expect(solve(room)).not.toBeNull()
    expect(solve(room, { ears: false })).toBeNull()
  })

  it('costs no sighting — there is nothing to see with', () => {
    expect(fewestSightings(room)).toBe(0)
  })

  it('pruning throws changes no answer with bats in the room either', () => {
    const lure = batRoom(['#R.....D', '####.###'], [[4, 1]], { carrots: 1 })
    expect(solve(lure, { prune: true })?.length).toBe(solve(lure, { prune: false })?.length)
    expect(solve(lure, { ears: false, prune: true })?.length ?? null).toBe(solve(lure, { ears: false, prune: false })?.length ?? null)
  })
})

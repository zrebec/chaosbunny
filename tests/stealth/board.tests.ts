import { describe, it, expect } from 'vitest'
import { beat, startWorld, CREAK_HEARING } from '../../src/stealth/beat.js'
import { foxCanEnter, parseRoom, randyCanEnter, tileAt, ROOM_COLS, ROOM_ROWS } from '../../src/stealth/room.js'
import { HEARING } from '../../src/stealth/patrol.js'
import { move, testRoom, EARS, WAIT } from './helpers.js'

type Events = readonly { readonly type: string }[]
const heard = (e: Events): boolean => e.some((x) => x.type === 'heard')
const creaked = (e: Events): boolean => e.some((x) => x.type === 'creak')

/** Four open rows with Randy at (1,0) and the cell at (2,0) given by `tile`. */
const hall = (tile: string, foxAt?: readonly [number, number]) =>
  testRoom(
    [`#R${tile}....########`, '#......#########', '#......#########', '#......#########', '#.....D#########'],
    foxAt ? [{ route: [[foxAt[0], foxAt[1]]], facing: 'down' }] : [],
  )

describe('the creaky board', () => {
  it('is floor everyone can walk on, Randy and fox alike', () => {
    expect(randyCanEnter('board')).toBe(true)
    expect(foxCanEnter('board')).toBe(true)
    const room = hall('~')
    expect(tileAt(room, { x: 2, y: 0 })).toBe('board')
    expect(beat(room, startWorld(room), move('right')).outcome).toBe('ok')
  })

  it('creaks when Randy steps on it, and stays quiet while he stands there', () => {
    const room = hall('~')
    const on = beat(room, startWorld(room), move('right'))
    expect(creaked(on.events)).toBe(true)
    expect(creaked(beat(room, on.world, WAIT).events)).toBe(false)
    expect(creaked(beat(room, on.world, EARS).events)).toBe(false)
  })

  it('gives Randy away with his ears down, which no other step does', () => {
    const board = hall('~', [2, 2])
    const plain = hall('.', [2, 2])
    const creep = (room: ReturnType<typeof hall>) =>
      beat(room, beat(room, startWorld(room), EARS).world, move('right')).events
    expect(heard(creep(board))).toBe(true)
    expect(heard(creep(plain))).toBe(false)
  })

  it('carries less far than a carrot: heard at its range, and not one cell beyond', () => {
    expect(CREAK_HEARING).toBeLessThan(HEARING)
    const at = (dy: number) => beat(hall('~', [2, dy]), startWorld(hall('~', [2, dy])), move('right')).events
    expect(heard(at(CREAK_HEARING))).toBe(true)
    expect(heard(at(CREAK_HEARING + 1))).toBe(false)
  })

  it('makes the fox stop and listen for a beat before it comes — the promised warning', () => {
    const room = hall('~', [2, 2])
    const w0 = startWorld(room)
    const fox0 = w0.foxes[0]!
    const first = beat(room, w0, move('right'))
    const listening = first.world.foxes[0]!
    expect(listening.mode).toBe('divert')
    expect(listening.target).toEqual({ x: 2, y: 0 })
    expect(listening.cell).toEqual(fox0.cell) // it has not moved yet
    // It walks the next beat, and the one after that it is on the board.
    const second = beat(room, first.world, move('down'))
    expect(second.world.foxes[0]!.cell).toEqual({ x: 2, y: 1 })
    const third = beat(room, second.world, move('down'))
    expect(third.world.foxes[0]!.cell).toEqual({ x: 2, y: 0 })
    // Nothing to eat there: it turns for home instead.
    expect(third.world.foxes[0]!.mode).toBe('return')
  })

  it('wakes a bat as any noise does, even with the ears down', () => {
    const rows = Array.from({ length: ROOM_ROWS }, (_, y) =>
      (y === 0 ? '#R~....#########' : y === 1 ? '#......#########' : y === 2 ? '#.....D#########' : '#'.repeat(ROOM_COLS)))
    const room = parseRoom({ name: 'bat hall', rows, patrols: [], bats: [[5, 1]] })
    const down = beat(room, startWorld(room), EARS).world
    const r = beat(room, down, move('right'))
    expect(r.events.some((e) => e.type === 'batHeard')).toBe(true)
  })
})

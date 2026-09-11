import { describe, it, expect } from 'vitest'
import {
  foxCanEnter, parseRoom, randyCanEnter, ROOM_COLS, ROOM_ROWS, tileAt, type RoomSource, type TileKind,
} from '../../src/stealth/room.js'
import { ROOM_01 } from '../../src/stealth/rooms/room01.js'
import { testRoom } from './helpers.js'

const blank = (): string[] => Array.from({ length: ROOM_ROWS }, () => '#'.repeat(ROOM_COLS))
const withRows = (edit: (rows: string[]) => void, extra: Partial<RoomSource> = {}): RoomSource => {
  const rows = blank()
  rows[1] = '#R....D#########'
  edit(rows)
  return { name: 'bad', rows, patrols: [], ...extra }
}

describe('parseRoom', () => {
  it('reads room01: start, door and the pacing guard', () => {
    const room = parseRoom(ROOM_01)
    expect(room.spawn).toEqual({ x: 6, y: 9 })
    expect(room.exits).toEqual([{ x: 7, y: 0 }])
    expect(room.carrots).toBe(1)
    expect(room.patrols).toHaveLength(1)
    expect(room.patrols[0]!.route).toEqual([
      { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 3 }, { x: 7, y: 2 },
    ])
    expect(room.patrols[0]!.facing).toBe('down')
  })

  it('maps every legend character to its tile, and treats outside as wall', () => {
    const room = testRoom(['#Rs=Dc.#'])
    expect([1, 2, 3, 4, 5, 6].map((x) => tileAt(room, { x, y: 0 }))).toEqual([
      'floor', 'shadow', 'cover', 'door', 'floor', 'floor',
    ])
    expect(room.pickups).toEqual([{ x: 5, y: 0 }])
    expect(tileAt(room, { x: -1, y: 0 })).toBe('wall')
    expect(tileAt(room, { x: 0, y: ROOM_ROWS })).toBe('wall')
  })

  it('expands a rectangle of waypoints into a closed loop of neighbours', () => {
    const room = testRoom(['#R.D', '#...', '#...'], [{ route: [[1, 1], [3, 1], [3, 2], [1, 2]] }])
    const route = room.patrols[0]!.route
    expect(route).toHaveLength(6)
    route.forEach((c, i) => {
      const n = route[(i + 1) % route.length]!
      expect(Math.abs(c.x - n.x) + Math.abs(c.y - n.y)).toBe(1)
    })
  })

  it('keeps a standing guard where it is, facing the way it was told', () => {
    const room = testRoom(['#R..D'], [{ route: [[3, 0]], facing: 'left' }])
    expect(room.patrols[0]).toEqual({ route: [{ x: 3, y: 0 }], facing: 'left' })
  })

  it.each<[string, RoomSource, RegExp]>([
    ['too few rows', { name: 'bad', rows: ['#R.D'], patrols: [] }, /expected 11 rows/],
    ['a ragged row', withRows((r) => { r[3] = '###' }), /row 3 must be 16/],
    ['an unknown tile', withRows((r) => { r[2] = '#?##############' }), /unknown tile '\?'/],
    ['no start', withRows((r) => { r[1] = '#.....D#########' }), /no start/],
    ['two starts', withRows((r) => { r[2] = '#R##############' }), /more than one start/],
    ['no door', withRows((r) => { r[1] = '#R.....#########' }), /no door/],
    ['a route through a wall', withRows(() => {}, { patrols: [{ route: [[2, 1], [2, 3]] }] }), /crosses \(2,2\), a wall/],
    ['a route on the door', withRows(() => {}, { patrols: [{ route: [[2, 1], [6, 1]] }] }), /crosses \(6,1\), a door/],
    ['diagonal waypoints', withRows((r) => { r[2] = '#.....##########' }, { patrols: [{ route: [[2, 1], [3, 2]] }] }), /exactly one of x or y/],
    ['a standing guard without facing', withRows(() => {}, { patrols: [{ route: [[3, 1]] }] }), /needs a facing/],
    ['a guard on the start', withRows(() => {}, { patrols: [{ route: [[1, 1], [3, 1]] }] }), /starts on Randy/],
    ['two guards on one cell', withRows(() => {}, { patrols: [{ route: [[3, 1]], facing: 'up' }, { route: [[3, 1]], facing: 'down' }] }), /same cell/],
  ])('refuses %s', (_label, src, message) => {
    expect(() => parseRoom(src)).toThrow(message)
  })
})

describe('who can walk where', () => {
  it('Randy walks floor, shadow and the door; a fox only floor and shadow', () => {
    const kinds: TileKind[] = ['wall', 'floor', 'shadow', 'cover', 'door']
    expect(kinds.map(randyCanEnter)).toEqual([false, true, true, false, true])
    expect(kinds.map(foxCanEnter)).toEqual([false, true, true, false, false])
  })
})

import { describe, it, expect } from 'vitest'
import { beat, startWorld, throwAt, type World } from '../../src/stealth/beat.js'
import { allLampsOn, cellIndex, lampOn, litCells, LAMP_REACH } from '../../src/stealth/light.js'
import { foxCanEnter, parseRoom, randyCanEnter, tileAt, ROOM_COLS, ROOM_ROWS, type Room } from '../../src/stealth/room.js'
import { spots } from '../../src/stealth/rules.js'
import { move, testRoom, toss, WAIT } from './helpers.js'

const shines = (room: Room, mask: number, x: number, y: number): boolean =>
  litCells(room, mask).has(cellIndex(room, { x, y }))

describe('what a lamp lights', () => {
  // A lamp at (5,1) with open floor all round it.
  const open = testRoom([
    '#R.............#',
    '#....L.........#',
    '#..............#',
    '#.............D#',
  ])
  const on = allLampsOn(open)

  it('reaches exactly as far as it says, counted in steps', () => {
    expect(shines(open, on, 5 + LAMP_REACH, 1)).toBe(true)
    expect(shines(open, on, 5 + LAMP_REACH + 1, 1)).toBe(false)
    // Steps, not a straight line: two across and one down is three.
    expect(shines(open, on, 7, 2)).toBe(true)
    expect(shines(open, on, 7, 3)).toBe(false)
  })

  it('leaves its own cell dark — nobody stands under the post', () => {
    expect(shines(open, on, 5, 1)).toBe(false)
  })

  it('is stopped by a wall, and stops altogether once it is out', () => {
    const walled = testRoom([
      '#R....#........#',
      '#....L#........#',
      '#.....#........#',
      '#.............D#',
    ])
    const lit = allLampsOn(walled)
    expect(shines(walled, lit, 2, 1)).toBe(true) // the open side, three steps away
    expect(shines(walled, lit, 7, 1)).toBe(false) // straight through the wall, one step away
    expect(litCells(walled, 0).size).toBe(0)
  })

  it("shines over a crate — light goes where a fox's eyes do not", () => {
    const crate = testRoom([
      '#R.............#',
      '#....L=s.......#',
      '#..............#',
      '#.............D#',
    ])
    expect(shines(crate, allLampsOn(crate), 7, 1)).toBe(true)
  })

  it('holds one bit per lamp, and a room without one has no light at all', () => {
    const two = testRoom(['#R...L...L....D#'])
    expect(allLampsOn(two)).toBe(0b11)
    expect(lampOn(0b10, 0)).toBe(false)
    expect(lampOn(0b10, 1)).toBe(true)
    expect(shines(two, 0b10, 5, 0)).toBe(false) // the first lamp is out: its side is dark
    expect(shines(two, 0b10, 9 + LAMP_REACH, 0)).toBe(true)
    const none = testRoom(['#R............D#'])
    expect(allLampsOn(none)).toBe(0)
    expect(litCells(none, 0).size).toBe(0)
  })
})

describe('a lamp standing in the room', () => {
  it('is solid: neither Randy nor a fox walks through it', () => {
    expect(randyCanEnter('lamp')).toBe(false)
    expect(foxCanEnter('lamp')).toBe(false)
    const room = testRoom(['#R....D#########', '#L##############'])
    expect(tileAt(room, { x: 1, y: 1 })).toBe('lamp')
    expect(beat(room, startWorld(room), move('down')).outcome).toBe('blocked')
  })

  it('is refused under a patrol route', () => {
    const rows = Array.from({ length: ROOM_ROWS }, () => '#'.repeat(ROOM_COLS))
    rows[1] = '#R..D###########'
    rows[2] = '#.L.############'
    expect(() => parseRoom({ name: 'bad', rows, patrols: [{ route: [[1, 2], [3, 2]] }] })).toThrow(/\(2,2\), a lamp/)
  })
})

describe('light kills shadow', () => {
  // A fox at (1,1) looking right down a pair of shadows; a lamp at (3,4) reaches the first.
  const room = testRoom(
    [
      '#R.............#',
      '#..ss......D####',
      '#..............#',
      '#..............#',
      '#..L...........#',
    ],
    [{ route: [[1, 1]], facing: 'right' }],
  )
  const fox = { x: 1, y: 1 }
  const burning = litCells(room, allLampsOn(room))

  it('leaves ears-down Randy visible in a shadow the lamp reaches', () => {
    expect(spots(room, fox, 'right', { x: 3, y: 1 }, true, burning)).not.toBeNull()
  })

  it('hides him in that same cell once the lamp is out', () => {
    expect(spots(room, fox, 'right', { x: 3, y: 1 }, true, litCells(room, 0))).toBeNull()
  })

  it('never reached the shadow one step further, which hides him either way', () => {
    expect(spots(room, fox, 'right', { x: 4, y: 1 }, true, burning)).toBeNull()
  })

  it('changes nothing for ears-up Randy — he is seen in light and shadow alike', () => {
    expect(spots(room, fox, 'right', { x: 3, y: 1 }, false, burning)).not.toBeNull()
    expect(spots(room, fox, 'right', { x: 3, y: 1 }, false, litCells(room, 0))).not.toBeNull()
  })
})

describe('throwing a carrot at a lamp', () => {
  const room = () => testRoom(['#R..L..........#', '#D##############'], [], 1)

  it('puts it out, and the carrot is gone — no meal left lying about', () => {
    const r = room()
    const w = startWorld(r)
    expect(w.lamps).toBe(0b1)
    const after = beat(r, w, toss('right'))
    expect(after.outcome).toBe('ok')
    expect(after.world.lamps).toBe(0)
    expect(after.world.items).toHaveLength(0)
    expect(after.world.randy.carrots).toBe(0)
    expect(after.events.some((e) => e.type === 'lampOut')).toBe(true)
  })

  it('is heard from the foot of the lamp, and point blank from where Randy stands', () => {
    const r = room()
    expect(throwAt(r, { x: 1, y: 0 }, 'right', 0b1)).toEqual({ kind: 'lamp', at: { x: 4, y: 0 }, lamp: 0, noise: { x: 3, y: 0 } })
    expect(throwAt(r, { x: 3, y: 0 }, 'right', 0b1)).toEqual({ kind: 'lamp', at: { x: 4, y: 0 }, lamp: 0, noise: { x: 3, y: 0 } })
  })

  it('cannot be done twice: an unlit lamp is just a post the carrot stops at', () => {
    const r = room()
    const start = startWorld(r)
    const out: World = { ...start, lamps: 0 }
    expect(throwAt(r, { x: 1, y: 0 }, 'right', 0)).toEqual({ kind: 'land', at: { x: 3, y: 0 } })
    expect(beat(r, out, toss('right')).world.items).toEqual([{ x: 3, y: 0 }])
    const close: World = { ...out, randy: { ...out.randy, cell: { x: 3, y: 0 } } }
    expect(beat(r, close, toss('right')).outcome).toBe('blocked')
  })

  it('goes dark for the same beat: the fox looking at that shadow no longer sees him', () => {
    // Randy in the shadow at (4,1), ears down; a standing fox at (7,1) looks his way;
    // the lamp at (4,2) is the only reason the shadow is worth nothing.
    const r = testRoom(['#R..s......D####', '#...L..........#'], [{ route: [[7, 0]], facing: 'left' }], 1)
    const w0 = startWorld(r)
    const w: World = { ...w0, randy: { ...w0.randy, cell: { x: 4, y: 0 }, earsDown: true } }
    expect(beat(r, w, WAIT).events.some((e) => e.type === 'suspicious')).toBe(true)
    const dark = beat(r, w, toss('down'))
    expect(dark.world.lamps).toBe(0)
    expect(dark.events.some((e) => e.type === 'suspicious')).toBe(false)
  })
})

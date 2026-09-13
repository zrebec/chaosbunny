import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { parseRoom, tileAt } from '../../src/stealth/room.js'
import { allLampsOn, litCells } from '../../src/stealth/light.js'
import { spots } from '../../src/stealth/rules.js'
import { LOCALES, SPOKEN_RULES } from '../../src/stealth/strings.js'
import type { Cell } from '../../src/stealth/grid.js'

/**
 * Nine of the twelve rules are said out loud at the beat they first bite. Each of those
 * lines waits on a situation, and a situation no room in the cellar can produce is dead
 * code that no other test would notice — the string exists, the branch compiles, and the
 * player never hears it.
 *
 * So each one is asked: is there a cell in some room where this could happen? Not whether
 * a player will reach it — that is what play is for — but whether the cellar contains the
 * shape at all. Two of them are about a guard's own timing (`spotted`, `bat`) and one is
 * about being caught, so the check is by mechanic rather than by line: a room with cover,
 * a room with water, a room with a plank, a room with a lever, a bat somewhere, and a
 * shadow a lamp lights.
 */
const rooms = ROOM_SOURCES.map(parseRoom)
const cells = (room: ReturnType<typeof parseRoom>): Cell[] =>
  room.tiles.map((_, i) => ({ x: i % room.cols, y: Math.floor(i / room.cols) }))

describe('every spoken rule has somewhere it can happen', () => {
  it('lists nine lines, so this test covers what it says it covers', () => {
    expect(SPOKEN_RULES.length).toBe(9)
    for (const key of SPOKEN_RULES) expect(LOCALES.sk[key]).toBeTruthy()
  })

  it('a shadow cell a lamp lights, for the lit-shadow line', () => {
    const found = rooms.some((room) => {
      const on = litCells(room, allLampsOn(room))
      return room.lamps.length > 0 && room.tiles.some((kind, i) => kind === 'shadow' && on.has(i))
    })
    expect(found).toBe(true)
  })

  it('a cell where cover is the whole difference, for the crate line', () => {
    // Exactly the condition `main.ts` tests: a fox sees him, and would not with ears down.
    const found = rooms.some((room) => {
      const on = litCells(room, allLampsOn(room))
      return room.patrols.some((p) => {
        const facings = p.turns ?? [p.facing]
        return p.route.some((eye) => facings.some((f) => cells(room).some((c) =>
          tileAt(room, c) !== 'shadow'
          && spots(room, eye, f, c, false, on) !== null
          && spots(room, eye, f, c, true, on) === null)))
      })
    })
    expect(found, 'no room can teach the crate line').toBe(true)
  })

  it.each([
    ['shadow, for the dark line', (r: typeof rooms[number]) => r.tiles.includes('shadow')],
    ['water, for the wading line', (r: typeof rooms[number]) => r.tiles.includes('water')],
    ['a plank, for the creak line', (r: typeof rooms[number]) => r.tiles.includes('board')],
    ['a lever, for the handle line', (r: typeof rooms[number]) => r.levers.length > 0],
    ['a bat, for the bat line', (r: typeof rooms[number]) => r.bats.length > 0],
    ['a carrot, for the carrying line', (r: typeof rooms[number]) => r.carrots + r.pickups.length > 0],
  ])('the cellar has %s', (_what, has) => {
    expect(rooms.some(has)).toBe(true)
  })
})

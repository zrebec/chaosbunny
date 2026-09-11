import { describe, it, expect } from 'vitest'
import { parseRoom } from '../../src/stealth/room.js'
import { ROOM_01 } from '../../src/stealth/rooms/room01.js'
import { ROOM_02 } from '../../src/stealth/rooms/room02.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { testRoom } from './helpers.js'

describe('pruning throws nobody hears changes no answer', () => {
  // Small rooms where the unpruned search stays cheap: every answer must match exactly.
  const rooms = {
    room01: parseRoom(ROOM_01),
    room02: parseRoom(ROOM_02),
    'carrot, no fox': testRoom(['#R...D'], [], 1),
    'lure a blocker': testRoom(['###D###', '#R.....', '#######'], [{ route: [[2, 1], [4, 1]] }], 1),
    'carrot on the floor': testRoom(['#R.c.#D', '#.....#.', '#.......'], [{ route: [[7, 2], [7, 1]] }]),
  }
  it.each(Object.entries(rooms))('%s', (_name, room) => {
    for (const opts of [{}, { ears: false }, { throws: false }]) {
      const a = solve(room, { ...opts, prune: true })
      const b = solve(room, { ...opts, prune: false })
      expect(a?.length ?? null).toBe(b?.length ?? null)
      expect(fewestSightings(room, { ...opts, prune: true })).toBe(fewestSightings(room, { ...opts, prune: false }))
    }
  })
})

describe('solve and fewestSightings', () => {
  it('answer null for a room with no way out', () => {
    const shut = testRoom(['#R#D'])
    expect(solve(shut)).toBeNull()
    expect(fewestSightings(shut)).toBeNull()
  })

  it('find the walk out of an empty room, unseen', () => {
    const room = testRoom(['#R..D'])
    expect(solve(room)).toHaveLength(3)
    expect(fewestSightings(room)).toBe(0)
  })

  it('count a ? that no way round avoids', () => {
    // A fox below looks straight up at the one cell under the door. Walls hide the approach,
    // nothing hides that cell: one beat in view, one ?, then out through the door.
    const room = testRoom(['###D###', '#R.....', '###.###', '###.###'], [{ route: [[3, 3]], facing: 'up' }])
    expect(solve(room)).toHaveLength(3)
    expect(fewestSightings(room)).toBe(1)
  })
})

import { describe, it, expect } from 'vitest'
import { STEALTH_ROOM_SKIP } from '../../src/config.js'
import { isMirrored, MIRROR_PARS, MIRROR_SUFFIX, mirrorDir, mirrorSource } from '../../src/stealth/mirror.js'
import { parseRoom, ROOM_COLS } from '../../src/stealth/room.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { beat, startWorld, type Action } from '../../src/stealth/beat.js'
import { offersChoice, wantsOf } from '../../src/stealth/wants.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import type { Room } from '../../src/stealth/room.js'

/** The beats a plan spends — not its length, since a wade costs two. */
function beatsOf(room: Room, plan: readonly Action[]): number {
  let world = startWorld(room)
  for (const action of plan) world = beat(room, world, action).world
  return world.beats
}

describe('mirrorDir', () => {
  it('swaps left and right, and leaves up and down alone', () => {
    expect(mirrorDir('left')).toBe('right')
    expect(mirrorDir('right')).toBe('left')
    expect(mirrorDir('up')).toBe('up')
    expect(mirrorDir('down')).toBe('down')
  })
})

describe('mirrorSource', () => {
  const src = ROOM_SOURCES[0]!
  const m = mirrorSource(src)

  it('gives the mirrored room its own id, so its records are its own', () => {
    expect(m.name).toBe(`${src.name}${MIRROR_SUFFIX}`)
    expect(isMirrored(m.name)).toBe(true)
    expect(isMirrored(src.name)).toBe(false)
  })

  it('turns every row round and every column with it', () => {
    src.rows.forEach((row, y) => expect(m.rows[y]).toBe([...row].reverse().join('')))
    src.patrols.forEach((p, i) => {
      p.route.forEach(([x, y], j) => expect(m.patrols[i]!.route[j]).toEqual([ROOM_COLS - 1 - x, y]))
      if (p.facing) expect(m.patrols[i]!.facing).toBe(mirrorDir(p.facing))
      if (p.turns) expect(m.patrols[i]!.turns).toEqual(p.turns.map(mirrorDir))
    })
  })

  it('is its own inverse, and keeps everything that is not a place', () => {
    const back = mirrorSource(m)
    expect(back.rows).toEqual(src.rows)
    expect(back.patrols).toEqual(src.patrols)
    expect(m.wants).toEqual(src.wants)
    expect(m.carrots).toBe(src.carrots)
  })

  it('makes a room the parser accepts, in every room of the cellar', () => {
    for (const s of ROOM_SOURCES) expect(() => parseRoom(mirrorSource(s))).not.toThrow()
  })
})

describe('what the mirrored cellar costs', () => {
  it('declares the par the solver actually finds, room by room', () => {
    for (const src of ROOM_SOURCES) {
      const room = parseRoom(mirrorSource(src))
      const way = solve(room)
      expect(way, `${src.name} mirrored has no way out`).not.toBeNull()
      expect(beatsOf(room, way!), `${src.name} mirrored`).toBe(room.par)
    }
  })

  it('is the same price as the real cellar except where MIRROR_PARS says otherwise', () => {
    // A fox picks between two equally short ways to a noise in DIRS order, and that
    // tie-break is not symmetric — which is why three rooms move at all.
    for (const src of ROOM_SOURCES) {
      const mirroredPar = parseRoom(mirrorSource(src)).par
      if (src.name in MIRROR_PARS) expect(mirroredPar, src.name).not.toBe(src.par)
      else expect(mirroredPar, src.name).toBe(src.par)
    }
    expect(Object.keys(MIRROR_PARS).sort()).toEqual(['room02', 'room03', 'room05'])
  })

  it('leaves the fairness number and the verbs alone, so the nudge stays true', () => {
    for (const src of ROOM_SOURCES) {
      const plain = parseRoom(src)
      const m = parseRoom(mirrorSource(src))
      expect(fewestSightings(m), `${src.name}: sightings`).toBe(fewestSightings(plain))
      expect(wantsOf(m), `${src.name}: wants`).toEqual([...(src.wants ?? [])])
      if ((src.wants ?? []).length === 0) expect(offersChoice(m), `${src.name}: choice`).toBe(src.choice ?? false)
    }
  })
})

describe('the door for testers', () => {
  it('is shut unless the address says otherwise', () => {
    // No `location` in a test run, and none in a build that nobody added `?dev` to:
    // the locks a player meets are the locks this suite runs against.
    expect(STEALTH_ROOM_SKIP).toBe(false)
  })
})

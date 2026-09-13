import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { parseRoom, type RoomSource } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { beatsOf } from './helpers.js'

/**
 * Every carrot in the cellar has to be worth picking up.
 *
 * The generator hands out a carrot with most candidates whether the room needs one or
 * not, and one survived into the shipped rooms: room09 had one lying in a corner that
 * changed nothing — same par, same fairness number, with it and without. That is the
 * same lie as a guard a room does not need, and worse in one way: a carrot is the tool
 * every other room's answer is made of, so one that cannot help is a room telling a
 * stuck player to look in the wrong place. The roomgen README has said to take such
 * pieces out since the first room; nothing checked.
 *
 * "Worth picking up" is deliberately weak — a carrot need not be *required*. Room13's
 * is not: the room can be left without it. But it turns a forced sighting into an
 * avoidable one, and a player who wants a clean run needs it. Changing any number is
 * enough; changing none is not.
 */
const drop = (src: RoomSource): RoomSource =>
  ({ ...src, carrots: 0, rows: src.rows.map((r) => r.split('c').join('.')) })

const withCarrot = ROOM_SOURCES.filter((s) => (s.carrots ?? 0) > 0 || s.rows.join('').includes('c'))

describe('the carrots in the cellar', () => {
  it('are in most rooms, so this test is worth having', () => {
    expect(withCarrot.length).toBeGreaterThan(ROOM_SOURCES.length / 2)
  })

  it.each(withCarrot.map((s) => [s.name, s] as const))('%s: taking its carrot away changes a number', (_name, src) => {
    const room = parseRoom(src)
    const bare = parseRoom(drop(src))
    const without = solve(bare)
    if (without === null) return // the strongest answer: the room cannot be left at all
    const same = beatsOf(bare, without) === room.par && fewestSightings(bare) === fewestSightings(room)
    expect(same, 'same par and the same fairness number without it — the carrot is scenery').toBe(false)
  }, 30_000)
})

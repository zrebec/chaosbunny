import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { parseRoom, type RoomSource } from '../../src/stealth/room.js'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { beatsOf } from './helpers.js'

/**
 * Every fox and every bat has to change a number.
 *
 * The rule is the generator's, and it is the oldest one here: a guard the player must
 * respect while the room does not need it is a lie. It was applied by hand — room07 lost
 * a second fox that way — and never checked, so asking all twenty-five at once was worth
 * doing. Twenty-four earn their place: take one out and the room either shuts, gets
 * cheaper, or stops forcing a sighting.
 *
 * The twenty-fifth is room16's, and it is on the list below rather than deleted. Its own
 * header says why: the room was drawn by hand, it is the only fox in it, and a stealth
 * room with nothing to hide from is a different thing. That is a design decision and the
 * owner's to make; what this test does is make sure a *second* one cannot appear without
 * somebody deciding.
 */
const IDLE_BY_DESIGN: Readonly<Record<string, string>> = {
  'room16 fox 0': 'prices neither way through the wade — see the room header',
}

/** Every number a piece could be responsible for, including a fork's other price. */
function numbers(src: RoomSource): string {
  const room = parseRoom(src)
  const best = solve(room)
  if (!best) return 'shut'
  const dry = src.rows.join('').includes('w') ? solve(room, { wade: false }) : null
  return [
    beatsOf(room, best),
    fewestSightings(room),
    dry ? beatsOf(room, dry) : '-',
  ].join('/')
}

interface Piece { readonly room: string; readonly what: string; readonly without: RoomSource }

const pieces: Piece[] = ROOM_SOURCES.flatMap((src) => [
  ...src.patrols.map((_, i) => ({
    room: src.name,
    what: `fox ${i}`,
    without: { ...src, patrols: src.patrols.filter((_, k) => k !== i) },
  })),
  ...(src.bats ?? []).map((_, i) => ({
    room: src.name,
    what: `bat ${i}`,
    without: { ...src, bats: src.bats!.filter((_, k) => k !== i) },
  })),
])

describe('every guard in the cellar', () => {
  it('is worth checking — there are more than twenty of them', () => {
    expect(pieces.length).toBeGreaterThan(20)
  })

  it.each(pieces.map((p) => [`${p.room} ${p.what}`, p] as const))('%s changes a number', (key, piece) => {
    const src = ROOM_SOURCES.find((s) => s.name === piece.room)!
    const before = numbers(src)
    const after = numbers(piece.without)
    if (IDLE_BY_DESIGN[key]) {
      expect(after, `${key} is listed as idle by design (${IDLE_BY_DESIGN[key]}) but now changes something`).toBe(before)
      return
    }
    expect(after, `${key} changes nothing: par, fairness and the dry price are all ${before} without it`).not.toBe(before)
  }, 60_000)

  it('lists nothing as idle by design that is no longer in the cellar', () => {
    for (const key of Object.keys(IDLE_BY_DESIGN)) {
      expect(pieces.some((p) => `${p.room} ${p.what}` === key), `${key} is gone — drop the row`).toBe(true)
    }
  })
})

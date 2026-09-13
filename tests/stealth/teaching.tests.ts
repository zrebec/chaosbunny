import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import type { RoomSource } from '../../src/stealth/room.js'

/**
 * The cellar is a ladder of verbs, and the whole of that claim is an **order**: nothing
 * appears in a room before the room that teaches it. It has held so far by care alone,
 * and care is exactly what fails when a room is slid into the middle — which has now
 * happened four times (`room1b`, `room2b`, `room3b`, `room13`), each time by hand, each
 * time with the order re-checked by eye.
 *
 * So the order is written down. Each mechanic names the room it may first appear in;
 * if a new room puts a lamp on screen before "the lit corner", or a second guard before
 * the room built to prepare one, this test says so and names both rooms. Moving an
 * introduction is allowed — that is a design decision — but it has to be made here,
 * on purpose, and not discovered by a player.
 *
 * A mechanic may of course *appear* a room or two before it is *needed*: `room1b` has
 * shadow in it that nothing forces you to use, and that is deliberate — a player who
 * has walked over a thing once recognises it when it starts to matter. What is
 * forbidden is the other way round.
 */
const has: Readonly<Record<string, (src: RoomSource) => boolean>> = {
  'cover (=)': (s) => s.rows.join('').includes('='),
  'a carrot in hand': (s) => (s.carrots ?? 0) > 0,
  'shadow (s)': (s) => s.rows.join('').includes('s'),
  'two guards at once': (s) => s.patrols.length > 1,
  'a carrot on the floor (c)': (s) => s.rows.join('').includes('c'),
  'a bat': (s) => (s.bats?.length ?? 0) > 0,
  'a sentry that turns': (s) => s.patrols.some((p) => p.turns !== undefined),
  'a lamp (L)': (s) => s.rows.join('').includes('L'),
  'a creaky board (~)': (s) => s.rows.join('').includes('~'),
  'a lever (/)': (s) => s.rows.join('').includes('/'),
  'a grate (+)': (s) => s.rows.join('').includes('+'),
  'water (w)': (s) => s.rows.join('').includes('w'),
}

/** Where each mechanic is allowed to be met for the first time. */
const FIRST: Readonly<Record<keyof typeof has, string>> = {
  'cover (=)': 'room01',
  'a carrot in hand': 'room01',
  'shadow (s)': 'room1b',
  'two guards at once': 'room3b',
  'a carrot on the floor (c)': 'room02',
  'a bat': 'room04',
  'a sentry that turns': 'room06',
  'a lamp (L)': 'room07',
  'a creaky board (~)': 'room08',
  'a lever (/)': 'room09',
  'a grate (+)': 'room09',
  'water (w)': 'room16',
}

describe('the order the cellar teaches things in', () => {
  const place = (name: string): number => ROOM_SOURCES.findIndex((s) => s.name === name) + 1

  it.each(Object.keys(has))('meets %s for the first time in the room that teaches it', (what) => {
    const key = what as keyof typeof has
    const first = ROOM_SOURCES.find(has[key]!)
    expect(first, `nothing in the cellar has ${what} any more — delete the row or add the room`).toBeDefined()
    expect(
      first!.name,
      `${what} is now met in ${first!.name} (#${place(first!.name)}), before ${FIRST[key]} (#${place(FIRST[key]!)})`
        + ' teaches it. Either move the new room later, or move the introduction here on purpose.',
    ).toBe(FIRST[key])
  })

  it('has a row for every mechanic a room can hold', () => {
    // A tile added to `room.ts` and not to this table would slip in untaught.
    const legend = '=sc~/+wL'
    for (const ch of legend) {
      expect(
        Object.keys(has).some((k) => k.includes(`(${ch})`)),
        `the legend has \`${ch}\` and this table does not — add it, or it can appear anywhere`,
      ).toBe(true)
    }
  })
})

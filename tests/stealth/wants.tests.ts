import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { parseRoom } from '../../src/stealth/room.js'
import { wantsOf, WANTS } from '../../src/stealth/wants.js'
import { LOCALES } from '../../src/stealth/strings.js'

/**
 * Every room declares the verbs it cannot be left without, and the game shows one of
 * them to a player who has been caught three times. A wrong declaration is worse than
 * none — it sends a stuck player looking for a carrot that would not have helped — so
 * the solver checks each one, both ways round: nothing claimed that is not true, and
 * nothing true left unclaimed.
 *
 * This is the only test that runs the whole cellar through five ablations apiece. It
 * costs a few seconds, and it is what lets the game hand out advice it cannot get wrong.
 */
describe('what each room says it wants', () => {
  it.each(ROOM_SOURCES.map((src) => [src.name, src] as const))('%s wants exactly what the solver says', (_name, src) => {
    expect(src.wants, 'every room declares its wants, even the empty list').toBeDefined()
    expect([...(src.wants ?? [])]).toEqual(wantsOf(parseRoom(src)))
  }, 30_000)

  it('leaves at least one room asking for nothing but timing', () => {
    // The nudge has a line for the room that needs no tool; a cellar where every room
    // wants something would leave that line untested, and the first room to need it
    // would be the first to find out whether it reads right.
    expect(ROOM_SOURCES.some((src) => (src.wants ?? []).length === 0)).toBe(true)
  })

  it('has a sentence for every want, in both tongues, inside the 32 columns', () => {
    for (const locale of Object.values(LOCALES)) {
      for (const want of [...WANTS, 'none' as const]) {
        const line = locale.wants[want]
        expect(line, `${want} has no line`).toBeTruthy()
        expect(line.length, `${line} is ${line.length} columns`).toBeLessThanOrEqual(32)
      }
    }
  })
})

/**
 * Room 04 — "the bat's larder". Randy walks in with no carrot.
 *
 * The only carrot lies in the little room Randy starts in, under a roosting bat.
 * A dark corridor leads down to a hall; a fox stands in the hall looking along it,
 * towards the door.
 *
 * What `tests/stealth/room04.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best, not without the carrot;
 * - not with the ears kept up — and it is the bat that makes it so: take the bat
 *   away and the same room can be walked with the ears up;
 * - a clean sneak exists: a careful player need not be noticed at all.
 *
 * Found with the room generator (layouts and metrics only) and kept as it came.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_04: RoomSource = {
  name: 'room04',
  carrots: 0,
  par: 28,
  wants: ['dark', 'carrot'],
  bats: [[10, 1]],
  patrols: [{ route: [[5, 7]], facing: 'right' }],
  rows: [
    '################',
    '#######=.c.#####',
    '#######R...#####',
    '#######s########',
    '#######s########',
    '#######s########',
    '####......####D#',
    '####......##.=.#',
    '#######ss.ss...#',
    '################',
    '################',
  ],
}

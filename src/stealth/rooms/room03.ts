/**
 * Room 03 — "the junction". Randy carries one carrot.
 *
 * Two foxes stand where the passages meet: one looks down the dark corridor that
 * leads to the door, the other along the passage Randy arrives by. Neither moves
 * unless something makes it.
 *
 * What `tests/stealth/room03.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - not without throwing the carrot, and not with the ears kept up;
 * - even the most careful player is noticed twice.
 *
 * Found by the room generator used for design (layouts and metrics only) and kept
 * as it came: it read as a place — a burrow, a pantry, a dark way down to the door.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_03: RoomSource = {
  name: 'room03',
  carrots: 1,
  par: 26,
  wants: ['dark', 'carrot'],
  patrols: [
    { route: [[10, 1]], facing: 'down' },
    { route: [[11, 2]], facing: 'left' },
  ],
  rows: [
    '################',
    '#######..=...###',
    '##=..ss......###',
    '##...#####.#####',
    '##..R#####s#####',
    '##...#####s#####',
    '##########s#####',
    '##########.#D###',
    '#######......###',
    '#######=.....###',
    '################',
  ],
}

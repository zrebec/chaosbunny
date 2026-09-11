/**
 * Room 02 — "the dark corridor". Randy walks in with no carrot.
 *
 * Two foxes: one stands at the foot of a long dark corridor and never stops looking
 * up it; one paces back and forth in front of the door. One carrot lies in the room.
 *
 * What the tests in `tests/stealth/room02.tests.ts` prove, without saying how:
 * - the room can be left, and `par` is the fewest beats it takes;
 * - it cannot be left without throwing the carrot, nor with the ears kept up;
 * - the most careful player is noticed once and no more — the dribble in the dark
 *   corridor; a faster player is noticed more often.
 *
 * Do not write the way through here, in the tests, or in a commit message: finding
 * it is the room.
 */
import type { RoomSource } from '../room.js'

export const ROOM_02: RoomSource = {
  name: 'room02',
  carrots: 0,
  par: 30,
  patrols: [
    { route: [[9, 1], [11, 1]] },
    { route: [[7, 9]], facing: 'up' },
  ],
  rows: [
    '##########D#####',
    '###c..s......###',
    '###..=s....=.###',
    '#######s########',
    '#######s########',
    '#######s########',
    '#######s########',
    '#......s########',
    '#R....#.########',
    '#######.########',
    '################',
  ],
}

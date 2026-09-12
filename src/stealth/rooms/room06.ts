/**
 * Room 06 — "the sentry". No carrot anywhere: this one is timing and ears.
 *
 * One guard stands and looks along the low passage. The other is a sentry: it
 * holds a facing for two beats, then turns to the next — up, left, up, left — and
 * the moment it looks away is the only way through.
 *
 * What `tests/stealth/room06.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best, with no carrot in it at all;
 * - not with the ears kept up;
 * - **freeze the sentry** — take its turning away and leave it looking one way —
 *   and the room cannot be left at all;
 * - even the most careful player is noticed twice.
 *
 * Found with the room generator (layouts and metrics only) and kept as it came.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_06: RoomSource = {
  name: 'room06',
  carrots: 0,
  par: 28,
  patrols: [
    { route: [[9, 7]], turns: ['up', 'left'], hold: 2 },
    { route: [[5, 8]], facing: 'right' },
  ],
  rows: [
    '################',
    '##......###....#',
    '##...R...s.....#',
    '#############.##',
    '#########D###.##',
    '#######.=.###s##',
    '###.......###s##',
    '##..=##...###.##',
    '##..=ss.s.....##',
    '################',
    '################',
  ],
}

/**
 * Room 1b — "the crossing". Played second; its id is `room1b` because it was written
 * after the rest and slid in between, and an id has to stay put or it would take
 * somebody's record with it (`rooms/index.ts` is the order; the name is only a key).
 *
 * It exists because of a real player getting stuck. The jump from the first room to
 * the second asked for three new things at once — a dribble, a fetch, and the nerve to
 * be seen — and the last of those is the one the game never taught: **a `?` is a
 * warning, not a capture.** This room teaches only that. One guard pacing a corridor
 * that has to be crossed, no carrot to find, and the ears buy nothing: you will be
 * noticed exactly once, and then you walk on.
 *
 * What `tests/stealth/room1b.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **it cannot be left unseen** — one sighting is forced, however carefully it is played;
 * - the ears change nothing here, and there is no carrot in it at all;
 * - it is shorter than the room it prepares.
 *
 * Found with the room generator (`tools/roomgen`, KIND=gentle) and kept as it came.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_1B: RoomSource = {
  name: 'room1b',
  carrots: 0,
  par: 15,
  patrols: [{ route: [[10, 5], [8, 5]] }],
  rows: [
    '################',
    '###...##########',
    '###R..##########',
    '###...##########',
    '###.=.###=..####',
    '####.s.ss...####',
    '#######.########',
    '#####D#s########',
    '#####....#######',
    '#####.=..#######',
    '################',
  ],
}

/**
 * Room 2b — "the dark step". Played third; the id is `room2b` for the same reason
 * `room1b` is: it was written last and slid into the middle, and an id has to stay put
 * or it takes somebody's record with it (`rooms/index.ts` holds the order).
 *
 * The ladder used to go from a fifteen-beat room straight into the dark corridor, which
 * wants the dribble, a carrot fetched from across the room and two guards at once. This
 * one wants **only the dribble**: one shadow cell on the way into a hall a guard paces,
 * no carrot in the room at all, and no way past with the ears up.
 *
 * What `tests/stealth/room2b.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **not with the ears kept up** — that is the whole lesson;
 * - there is no carrot in it and only one guard, so nothing else can be the lesson;
 * - the most careful player is noticed once;
 * - it is shorter than the corridor it prepares.
 *
 * Found with the room generator (`tools/roomgen`, KIND=dribble) and kept as it came.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_2B: RoomSource = {
  name: 'room2b',
  carrots: 0,
  par: 21,
  wants: ['dark'],
  patrols: [{ route: [[13, 2], [10, 2]] }],
  rows: [
    '################',
    '#########.....##',
    '###.....s.....##',
    '###.#####.....##',
    '##...######.####',
    '##.R.####D#.####',
    '##.=.####.....##',
    '##...####.....##',
    '#########.....##',
    '################',
    '################',
  ],
}

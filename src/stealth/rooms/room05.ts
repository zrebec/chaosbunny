/**
 * Room 05 — "the bat's hall". Randy walks in with no carrot; one lies near the start.
 *
 * A dark corridor leads down from Randy's burrow to a low hall, where a fox stands
 * looking along the floor. A second fox walks the passage from the hall to the far
 * room — and in the far room, below the door, a bat roosts.
 *
 * What `tests/stealth/room05.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best, not without the carrot;
 * - not with the ears kept up, and the bat is why — without it the room is a
 *   short walk with the ears up and a clean sneak;
 * - with it, even the most careful player is noticed once.
 *
 * Found with the room generator (layouts and metrics only) and kept as it came.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_05: RoomSource = {
  name: 'room05',
  carrots: 0,
  par: 35,
  bats: [[11, 5]],
  patrols: [
    { route: [[12, 8], [8, 8]] },
    { route: [[3, 9]], facing: 'right' },
  ],
  rows: [
    '################',
    '################',
    '####...#########',
    '####.c.###D#####',
    '####..R###.....#',
    '#####s####.....#',
    '#####.####.....#',
    '###.....####.###',
    '###........s.###',
    '###...=.########',
    '################',
  ],
}

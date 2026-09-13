/**
 * Room 12 — "the roost". The lamp room again, with something hanging in the way out.
 *
 * A guard walled into the corner behind its lamp watches the shadow stair, exactly as
 * in room11 — but the passage it leads to has a bat asleep over it, and a bat does not
 * care how dark it is. It hears an ears-up step from four cells away. So the stair
 * wants the ears down and the light out, and the passage wants them down and quiet,
 * and the carrot has to serve whichever the player leaves undone.
 *
 * What `tests/stealth/room12.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **leave the lamp burning and there is no way out**, nor with the ears kept up,
 *   nor without the carrot;
 * - the bat is worth nine beats: without it the same room is par 24;
 * - and even the most careful player is noticed once.
 *
 * Built by the route-first generator (`tools/roomgen`, KIND=route GATES=dark,bat) and
 * kept as it came. Do not write the way through here, in the tests, or in a commit.
 */
import type { RoomSource } from '../room.js'

export const ROOM_12: RoomSource = {
  name: 'room12',
  carrots: 1,
  par: 33,
  wants: ['dark', 'carrot', 'lampOut'],
  patrols: [{ route: [[1, 9]], facing: 'up' }],
  bats: [[6, 6]],
  rows: [
    '################',
    '#..R############',
    '#...#########D##',
    '##s########...##',
    '##s##.........##',
    '##s##.##########',
    '##s....#########',
    '#.L....#########',
    '#..#############',
    '#.##############',
    '################',
  ],
}

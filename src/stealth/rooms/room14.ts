/**
 * Room 14 — "the fork". Two ways to the same door, and one carrot.
 *
 * East along the top and down past a loose board, with a guard near enough to hear it;
 * or down the shadow stair, which a guard watches through its lamp. Both want the
 * carrot — one to pull the listener off the plank, the other to put the light out —
 * and there is only one. Nineteen beats the lit way, twenty-one the dark: near enough
 * that the room asks which price you would rather pay, not which answer is right.
 *
 * It is the room `docs/stealth-design.md` said did not exist. What made it possible was
 * not a better search but a better shape: the route planner learned to dig the last
 * corridor **twice**, once round each corner, so neither way is a bridge and both have
 * to be paid for.
 *
 * What `tests/stealth/room14.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **both ways are real**: keeping the lamp lit and putting it out are each a way out,
 *   two beats apart, so neither is the answer;
 * - the carrot is needed whichever way is taken, and one carrot is all there is;
 * - it can be walked without ever being seen.
 *
 * Built by the route-first generator (`tools/roomgen`, KIND=fork GATES=open
 * FORK=dark,board) and kept as it came. Do not write the way through here.
 */
import type { RoomSource } from '../room.js'

export const ROOM_14: RoomSource = {
  name: 'room14',
  carrots: 1,
  par: 19,
  wants: ['carrot'],
  patrols: [
    { route: [[9, 9]], facing: 'up' },
    { route: [[11, 2]], facing: 'up' },
  ],
  rows: [
    '################',
    '########....####',
    '###...........##',
    '#....#####s##~##',
    '#....#####s##.##',
    '#.R..#####s#D.##',
    '##########s....#',
    '#########.L....#',
    '#########..#####',
    '#########.######',
    '################',
  ],
}

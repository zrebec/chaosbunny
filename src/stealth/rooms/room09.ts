/**
 * Room 09 — "the handle". The grate across the middle of the cellar is the only way
 * east, and the lever that works it is in the corner where the guard is standing.
 *
 * Every other room asks where Randy should be. This one asks *when*: the handle is
 * iron and the guard is close enough to hear it, so the pull is not a step, it is a
 * decision about where that guard should be standing a beat later.
 *
 * What `tests/stealth/room09.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **wall the grate up and there is no way out** — it is the way, not a shortcut;
 * - with the grate already open the room is a stroll (par 13), so the handle is what
 *   the room costs;
 * - not with the ears kept up;
 * - the guard hears the handle from where it stands;
 * - even the most careful player is noticed twice.
 *
 * Found with the room generator (`tools/roomgen`, KIND=lever) and kept as it came.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_09: RoomSource = {
  name: 'room09',
  carrots: 0,
  par: 27,
  patrols: [{ route: [[3, 9]], facing: 'up' }],
  rows: [
    '################',
    '#...############',
    '#...############',
    '#...############',
    '#R..####...c####',
    '##s.+s.s....####',
    '##s#######s#####',
    '#...######.D####',
    '#...######....##',
    '#/..######....##',
    '################',
  ],
}

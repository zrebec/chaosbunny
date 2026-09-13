/**
 * Room 07 — "the lit corner". The first room with a lamp.
 *
 * One guard stands in a corner Randy can never walk into and looks up the shaft
 * he has to come down. The lamp burns beside it, out of reach of every paw — the
 * only thing that can touch it is a thrown carrot.
 *
 * What `tests/stealth/room07.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **leave the lamp burning and there is no way out at all** — the room is the lamp;
 * - not without the carrot, and not with the ears kept up;
 * - every shadow on the way is lit while the lamp burns, and dark once it is out;
 * - even the most careful player is noticed twice.
 *
 * Found with the room generator (layouts and metrics only) and kept as it came,
 * but for one thing: it came with a second guard pacing the far corner, and the
 * solver said that guard changed nothing — same par, same sightings, same
 * ablations. A guard the player must respect and the room does not need is a lie,
 * so it was taken out.
 *
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_07: RoomSource = {
  name: 'room07',
  carrots: 1,
  par: 22,
  wants: ['dark', 'carrot', 'lampOut'],
  patrols: [{ route: [[2, 8]], facing: 'up' }],
  rows: [
    '################',
    '#####...R#######',
    '###ss....#######',
    '###.#######D####',
    '###.#######....#',
    '###sss.........#',
    '##.L=######....#',
    '##...###########',
    '##.==###########',
    '################',
    '################',
  ],
}

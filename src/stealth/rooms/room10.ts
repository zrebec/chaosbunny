/**
 * Room 10 — "the long way round". The first room built the other way about: the way
 * through was planned first and the room grown around it (`tools/roomgen`, KIND=route),
 * so every corridor on it is a bridge and every gate on it has to be paid for.
 *
 * Two of them. A grate across the middle with its handle back the way Randy came, and
 * a plank in the last corridor — laid within earshot of the guard that is standing on
 * the doorstep, which is the only cell the door can be reached from.
 *
 * What `tests/stealth/room10.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **wall the grate up and there is no way out** — the handle is not optional;
 * - the plank costs the room seven beats: with silent floor in its place, par 21;
 * - the carrot is needed;
 * - and even the most careful player is noticed once.
 *
 * Kept exactly as the generator produced it. Do not write the way through here, in
 * the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_10: RoomSource = {
  name: 'room10',
  carrots: 1,
  par: 28,
  wants: ['carrot', 'lever'],
  patrols: [{ route: [[13, 4]], facing: 'up' }],
  rows: [
    '################',
    '################',
    '################',
    '#############D##',
    '##..R########..#',
    '##...####..~...#',
    '##/..###..######',
    '###..+....######',
    '########..######',
    '################',
    '################',
  ],
}

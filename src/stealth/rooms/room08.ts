/**
 * Room 08 — "the plank". One board, laid across the only way out of the cellar's
 * west end, three cells from a guard who is looking the other way.
 *
 * There is no creeping past this one: the ears buy nothing against wood. The room
 * asks what the earlier ones never did — not *how do I get across unseen*, but
 * *what do I want the guard to be doing when it hears me*.
 *
 * What `tests/stealth/room08.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **the plank is the only way through** — wall it off and there is no way out;
 * - the same room with plain floor instead of the plank is far shorter, so the
 *   plank is what the room costs;
 * - not without the carrot;
 * - and it can be done without ever being seen.
 *
 * Found with the room generator (`tools/roomgen`, layouts and metrics only) and kept
 * as it came. Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_08: RoomSource = {
  name: 'room08',
  carrots: 1,
  par: 35,
  patrols: [{ route: [[5, 8]], facing: 'right' }],
  rows: [
    '################',
    '#...############',
    '#...############',
    '#...########D###',
    '#R..#######....#',
    '##.########=.=.#',
    '##s###...s.....#',
    '##.###...##....#',
    '##~s.s...#######',
    '######...#######',
    '################',
  ],
}

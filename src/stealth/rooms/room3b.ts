/**
 * Room 3b — "the shadow shelf". Played fourth, and it exists because of one number:
 * the room after it is par 30.
 *
 * The ladder taught the carrot in thirteen beats and the ears in twenty-one, and then
 * asked for both at once in a thirty-beat room with a forced sighting in it. That was
 * the step a real player fell off — not because the room was unfair (it is provably
 * not) but because it was the first room to want two ideas and the biggest room so far
 * at the same time. This one wants exactly the same two ideas in eighteen beats, and it
 * can be walked without ever being seen.
 *
 * A shelf of shadow runs along the top with a guard's eyes down it, and the way out of
 * the chamber beyond is watched by a second guard who never turns and never walks off.
 * Nothing else: no lamp, no plank, no grate, no water. Both keys are ones the player
 * already has.
 *
 * What `tests/stealth/room3b.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **not with the ears up**, and **not without throwing the carrot** — the two lessons
 *   before it, together, and neither of them optional;
 * - it holds nothing a player has not met: no lamp, no plank, no grate, no water;
 * - it can be walked without ever being seen — the last room in the ladder that can,
 *   until the water rooms;
 * - it is shorter than the room it prepares, which is the whole reason it is here.
 *
 * Found with the route-first generator (`tools/roomgen`, KIND=route GATES=shadow,lure
 * MIN_PAR=15 MAX_PAR=24, seed 2055) and kept exactly as it came. Both of those gates
 * were written for this room: the planner could build a dark corridor only by spending
 * a lamp pocket on it, and could ask for a carrot only by laying a creaky plank — two
 * mechanics the fourth room of a cellar has no business teaching.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_3B: RoomSource = {
  name: 'room3b',
  carrots: 1,
  par: 18,
  wants: ['dark', 'carrot'],
  patrols: [
    { route: [[12, 1]], facing: 'left' },
    { route: [[10, 1]], facing: 'down' },
  ],
  rows: [
    '################',
    '##########....##',
    '#....sssss....##',
    '#....#####.#####',
    '#R...#####.#####',
    '#########D.#####',
    '#########...####',
    '#########...####',
    '################',
    '################',
    '################',
  ],
}

/**
 * Room 01 — "the pantry corridor". The first room, and the whole prototype's test:
 *
 * 1. With ears up, read the fox pacing the corridor — it looks down into the hall
 *    on its way down and away on its way up.
 * 2. Get seen from far off (`?`) and drop your ears behind the crate: it calms down.
 * 3. Throw the carrot across the hall. The fox leaves the corridor to eat it.
 * 4. Slip up the corridor while it eats, out through the door.
 *
 * The corridor is one tile wide and the fox never leaves it on its own, so the room
 * cannot be done without the carrot; and the crate is a true hiding place — ears
 * down behind it, the fox never sees you. Both are proved in
 * `tests/stealth/room01.tests.ts`.
 */
import type { RoomSource } from '../room.js'

export const ROOM_01: RoomSource = {
  name: 'room01',
  carrots: 1,
  par: 13,
  patrols: [{ route: [[7, 1], [7, 4]] }],
  rows: [
    '#######D########',
    '#######.########',
    '#######.########',
    '#######.########',
    '######...#######',
    '######.=.#######',
    '######...#######',
    '######...#######',
    '######...#######',
    '######R..#######',
    '################',
  ],
}

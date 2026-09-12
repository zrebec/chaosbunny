/**
 * Room 16 — "the wade". The first room built on water, and the first whose two ways are
 * priced in different currencies.
 *
 * A pool sits in the straight corridor to the door. Wading it costs two beats a cell and
 * the world takes both of them — but nothing watches it and nothing hears it. The way
 * round is dry and quicker on the feet, and it passes a guard sitting in an alcove with
 * its eyes on the corridor, so it costs waiting instead. Fifteen beats wet, eighteen dry.
 *
 * There is no carrot in the room. Neither way needs one: this is a room about what a
 * route is worth, which is a question none of the fifteen before it asks.
 *
 * What `tests/stealth/room16.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best — counted in **beats**, which is not
 *   the same as steps here;
 * - **the water is paid for**: drain the pool and the same room is three beats cheaper;
 * - **keeping his feet dry is a real way out**, three beats dearer, so neither is right;
 * - nothing else in it could be the lesson — no carrot, one guard;
 * - and it can be walked without ever being seen.
 *
 * Drawn by hand after the generator could not make one: two ways round a rectangle are
 * the same length, and water only pays where the wet way is genuinely shorter. Written
 * up in `docs/stealth-design.md`.
 */
import type { RoomSource } from '../room.js'

export const ROOM_16: RoomSource = {
  name: 'room16',
  carrots: 0,
  par: 15,
  patrols: [{ route: [[7, 5]], facing: 'up' }],
  rows: [
    '################',
    '#R..www......D.#',
    '#.############.#',
    '#..............#',
    '#######.########',
    '#######.########',
    '################',
    '################',
    '################',
    '################',
    '################',
  ],
}

/**
 * Room 16 — "the wade". The first room built on water, and the first whose two ways are
 * priced in different currencies.
 *
 * A pool sits in the straight corridor to the door. Wading it costs two beats a cell and
 * the world takes both of them — but nothing watches it and nothing hears it. The way
 * round is dry and three beats longer on the feet: fifteen beats wet, eighteen dry.
 *
 * **The guard in the alcove costs nothing, and that is not what this comment used to
 * say.** It claimed the dry way was dearer because of the waiting the guard forces.
 * Asked properly — solve the room with that guard taken out — par is fifteen either
 * way, the fairness number is zero either way, and the dry way is eighteen either way.
 * The three beats are distance. The guard punishes carelessness and prices nothing,
 * which by this project's own rule (`tools/roomgen/README.md`: a piece the room does
 * not need comes out) makes it a candidate for deletion. It is left in and written down
 * instead, because the alternative reading is real — a stealth room with no fox in it
 * is not a stealth room — and because this one was drawn by hand, so removing its only
 * guard is a design decision and not a tidy-up. `tests/stealth/guards.tests.ts` holds
 * it as the one known exception, so a second one cannot appear quietly.
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
  wants: [],
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

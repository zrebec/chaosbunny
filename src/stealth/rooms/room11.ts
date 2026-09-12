/**
 * Room 11 — "the window". Everything the cellar has learned, on one route.
 *
 * A grate on the way out of Randy's corner with its handle behind him; then the long
 * way round to a shadow shaft that a guard is watching **through a lamp** — walled
 * into a pocket whose only window is the lamp itself, which is solid to a fox and
 * transparent to its eyes. That guard cannot be lured, so the light cannot be lived
 * with: it has to go out.
 *
 * What `tests/stealth/room11.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best;
 * - **wall the grate up and there is no way out**;
 * - **leave the lamp burning and there is no way out**;
 * - not without the carrot, and not with the ears kept up — every verb the game has
 *   is needed here, which no earlier room can say;
 * - and even the most careful player is noticed once.
 *
 * Built by the route-first generator (`tools/roomgen`, KIND=route GATES=grate,dark),
 * which lays the guard's pocket on purpose — the shape room07 stumbled into. Kept
 * exactly as it came. Do not write the way through here, in the tests, or in a
 * commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_11: RoomSource = {
  name: 'room11',
  carrots: 1,
  par: 32,
  patrols: [{ route: [[13, 9]], facing: 'up' }],
  rows: [
    '################',
    '###########..###',
    '###...+......###',
    '###.########s###',
    '#...R#######s###',
    '#....###D###s###',
    '#/...###....s###',
    '########....L.##',
    '############..##',
    '#############.##',
    '################',
  ],
}

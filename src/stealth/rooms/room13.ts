/**
 * Room 13 — "the flood". Played straight after the wade, and it asks the other half of
 * that room's question.
 *
 * Room 16 offers water: a pool that is quicker than the dry way round, so wading is a
 * price you may choose to pay. This one takes the choice away. The only way out of the
 * first chamber is a flooded stair, three cells of it, and there is no way round —
 * `wants` says `water` and the solver agrees: keep his feet dry and the room has no
 * answer at all. It is the first room in the cellar that cannot be left dry.
 *
 * What that costs is not the three extra beats. It is that a wade moves the world
 * twice while Randy moves once: three cells of it and everything downstream — a sentry that turns
 * on a count of two — is standing somewhere else by the time he is out. The room is
 * short, and the shaft is not watched (the planner refuses water inside a cone; two
 * beats a player cannot react in are not a fair place to be seen), so the flood is
 * only ever a clock, never a trap.
 *
 * What `tests/stealth/room13.tests.ts` proves, without saying how:
 * - the room can be left, in `par` beats at best — counted in beats, which here is three
 *   more than the steps, and four more than the same room with the stair drained;
 * - **it cannot be left dry**, which no other room in the cellar can say;
 * - the sentry earns its place: freeze it on its first facing and the room shuts;
 * - nothing else in it is load-bearing — the ears may stay up the whole way and the
 *   carrot is never needed to get out;
 * - but the carrot is not scenery either: without it, the most careful player is still
 *   noticed once, and with it he need not be seen at all.
 *
 * Found with the route-first generator (`tools/roomgen`, KIND=route GATES=water,sentry
 * GAIN=3 MIN_PAR=14 MAX_PAR=22, seed 1218) and kept exactly as it came.
 * Do not write the way through here, in the tests, or in a commit message.
 */
import type { RoomSource } from '../room.js'

export const ROOM_13: RoomSource = {
  name: 'room13',
  carrots: 1,
  par: 20,
  wants: ['water'],
  patrols: [{ route: [[12, 5]], turns: ['left', 'up'], hold: 2 }],
  rows: [
    '################',
    '##....##########',
    '##R...##########',
    '##....##########',
    '####w######D####',
    '####w#####...###',
    '####w........###',
    '####...#########',
    '####...#########',
    '####...#########',
    '################',
  ],
}

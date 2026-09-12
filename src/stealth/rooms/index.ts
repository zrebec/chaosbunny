/**
 * Every room, in the order they are played — the one list a new room is added to.
 *
 * **The order is here; a room's `name` is only its id.** Records are keyed by that id
 * (`records.ts`), so a room slipped into the middle of the ladder must keep the name it
 * was born with — `room1b` sits second and is called `room1b`. Renumbering the files to
 * match the order would quietly move everybody's records to the wrong rooms.
 *
 * The ladder: each room brings one new thing and leans on the one before it
 * (`docs/stealth-design.md`). `tests/stealth/rooms.tests.ts` holds the list to what
 * a room must be before it ships: a name that matches its place, and a `par` pinned
 * to the solver's own answer by that room's test.
 */
import type { RoomSource } from '../room.js'
import { ROOM_01 } from './room01.js'
import { ROOM_1B } from './room1b.js'
import { ROOM_2B } from './room2b.js'
import { ROOM_02 } from './room02.js'
import { ROOM_03 } from './room03.js'
import { ROOM_04 } from './room04.js'
import { ROOM_05 } from './room05.js'
import { ROOM_06 } from './room06.js'
import { ROOM_07 } from './room07.js'
import { ROOM_08 } from './room08.js'
import { ROOM_09 } from './room09.js'
import { ROOM_10 } from './room10.js'
import { ROOM_11 } from './room11.js'
import { ROOM_12 } from './room12.js'
import { ROOM_14 } from './room14.js'
import { ROOM_13 } from './room13.js'
import { ROOM_16 } from './room16.js'

export const ROOM_SOURCES: readonly RoomSource[] = [
  ROOM_01, ROOM_1B, ROOM_2B, ROOM_02, ROOM_03, ROOM_04, ROOM_05, ROOM_06, ROOM_07, ROOM_08, ROOM_09, ROOM_10,
  // A breather with a decision in it, then the two that ask for everything at once.
  ROOM_16, ROOM_13, ROOM_14, ROOM_12, ROOM_11,
]

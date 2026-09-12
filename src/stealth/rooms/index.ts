/**
 * Every room, in the order they are played — the one list a new room is added to.
 *
 * The ladder: each room brings one new thing and leans on the one before it
 * (`docs/stealth-design.md`). `tests/stealth/rooms.tests.ts` holds the list to what
 * a room must be before it ships: a name that matches its place, and a `par` pinned
 * to the solver's own answer by that room's test.
 */
import type { RoomSource } from '../room.js'
import { ROOM_01 } from './room01.js'
import { ROOM_02 } from './room02.js'
import { ROOM_03 } from './room03.js'
import { ROOM_04 } from './room04.js'
import { ROOM_05 } from './room05.js'
import { ROOM_06 } from './room06.js'
import { ROOM_07 } from './room07.js'
import { ROOM_08 } from './room08.js'

export const ROOM_SOURCES: readonly RoomSource[] = [
  ROOM_01, ROOM_02, ROOM_03, ROOM_04, ROOM_05, ROOM_06, ROOM_07, ROOM_08,
]

/**
 * Points, medals and which rooms are open — all of it read off the records that are
 * already saved (`records.ts`). Nothing here is stored: a score is what a record is
 * worth, a medal is how close it came to par, and a room is open when the one before
 * it has been escaped.
 *
 * **A ratio, not a countdown.** A room on par is worth {@link ROOM_POINTS}; every beat
 * over costs a share of that rather than a fixed fifty. A countdown hits zero twenty
 * beats over par — a beginner's pace in room one — and a game whose whole promise is
 * that nobody dies should not pay a finished room nothing. With a ratio the score never
 * reaches zero, and a wasted beat hurts more in a thirteen-beat room than in a
 * thirty-five-beat one, which is the right way round.
 *
 * Pure: no storage, no clock, no screen. The tests hold the arithmetic.
 */
import type { Records } from './records.js'
import type { Room } from './room.js'

/** What a room escaped on par is worth. */
export const ROOM_POINTS = 1000

/**
 * How far over par still earns the middle medal, as a fraction: five quarters of par.
 * Kept as a fraction so the check stays in whole numbers (`beats × 4 ≤ par × 5`).
 */
export const NEAR_PAR_NUM = 5
export const NEAR_PAR_DEN = 4

/**
 * The three medals, best first: on par, within a quarter of it, escaped at all. A number
 * is what nobody remembers; a medal is what a player goes back for.
 */
export type Medal = 'par' | 'near' | 'done'

/**
 * What escaping a room in `beats` is worth. A run faster than par cannot happen — par is
 * the solver's shortest way out — but a stale par must not pay more than a perfect run,
 * so the score is capped at {@link ROOM_POINTS}. And a finished room is worth at least a
 * point however long it took, or the promise above would round away at the far end.
 */
export function roomScore(par: number, beats: number): number {
  if (par <= 0 || beats <= 0) return 0
  return Math.max(1, Math.min(ROOM_POINTS, Math.round((ROOM_POINTS * par) / beats)))
}

export function medalFor(par: number, beats: number): Medal {
  if (beats <= par) return 'par'
  if (beats * NEAR_PAR_DEN <= par * NEAR_PAR_NUM) return 'near'
  return 'done'
}

/** A room's medal from the records, or `null` while it has none (or no par to measure by). */
export function roomMedal(room: Pick<Room, 'name' | 'par'>, records: Records): Medal | null {
  const beats = records[room.name]
  if (beats === undefined || room.par === null) return null
  return medalFor(room.par, beats)
}

/** A room's points from the records: its best run, scored. Zero until it has one. */
export function recordScore(room: Pick<Room, 'name' | 'par'>, records: Records): number {
  const beats = records[room.name]
  if (beats === undefined || room.par === null) return 0
  return roomScore(room.par, beats)
}

/** The whole cellar's points: every record, scored and added up. */
export function cellarScore(rooms: readonly Pick<Room, 'name' | 'par'>[], records: Records): number {
  return rooms.reduce((sum, room) => sum + recordScore(room, records), 0)
}

/** What a cellar escaped entirely on par would be worth. */
export function maxCellarScore(rooms: readonly Pick<Room, 'par'>[]): number {
  return rooms.filter((r) => r.par !== null).length * ROOM_POINTS
}

/**
 * Whether room `i` may be entered: the first always, any other once the room before it
 * has a record. The same fact the map already draws — rooms behind you are lit — so
 * the lock is a restriction on what the game knows, not new state to save.
 */
export function isUnlocked(rooms: readonly Pick<Room, 'name'>[], records: Records, i: number): boolean {
  if (i <= 0) return true
  const before = rooms[i - 1]
  return before !== undefined && records[before.name] !== undefined
}

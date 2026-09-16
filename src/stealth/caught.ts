/**
 * Why the room just ended — one line under CAUGHT!, every time.
 *
 * The hints (`main.ts` `hint`) say a rule once a session, the first time it bites.
 * That is not enough for the rule a player keeps tripping over without noticing:
 * lowered ears hide Randy only in the dark (or behind a crate), and on open floor a
 * fox sees him just the same. A player caught like that twice, three times, starts to
 * think the game changed. So the capture itself says what happened.
 *
 * Every reason is **checked, not guessed**: it asks the same `spots` the beat asked,
 * with one thing changed — the ears the other way — and only names a reason that
 * change would actually have made true. It says what went wrong, never what to do
 * next, and never a step of the way through (RULES.md R6).
 *
 * Pure — presentation only; `beat.ts` never hears of it.
 */
import type { BeatEvent, World } from './beat.js'
import { cellIndex, litCells } from './light.js'
import { tileAt, type Room } from './room.js'
import { spots } from './rules.js'

export type CaughtReason =
  /** A fox was right in front of him: nothing hides that. */
  | 'front'
  /** Ears down in a shadow, but a lamp is lighting it. */
  | 'litShadow'
  /** Ears down out in the open — no shadow and no crate between them. */
  | 'earsDownOpen'
  /** Ears up in a shadow that would have hidden him with them down. */
  | 'earsUpShadow'
  /** Ears up behind a crate that would have hidden him with them down. */
  | 'earsUpCover'
  /** Seen again the beat after a `?`, with nothing that would have hidden him. */
  | 'seenAgain'
  /** He and a fox ended up on the same cell. */
  | 'bumped'
  /** A bat in flight went through his cell. */
  | 'batFlight'
  /** He walked into a roosting bat. */
  | 'batBumped'

export const CAUGHT_REASONS: readonly CaughtReason[] = [
  'front', 'litShadow', 'earsDownOpen', 'earsUpShadow', 'earsUpCover', 'seenAgain', 'bumped', 'batFlight', 'batBumped',
]

/**
 * The reason a beat ended the room, read from the world *after* that beat (where the
 * fox stood and looked when it saw him), or `null` if nothing caught him.
 */
export function caughtReason(room: Room, world: World, events: readonly BeatEvent[]): CaughtReason | null {
  const end = events.find((e) => e.type === 'caught' || e.type === 'bitten')
  if (!end) return null
  const randy = world.randy
  if (end.type === 'bitten') return world.bats[end.bat]?.mode === 'roost' ? 'batBumped' : 'batFlight'
  if (end.type !== 'caught') return null
  if (end.why === 'bumped') return 'bumped'

  const fox = world.foxes[end.fox]
  if (!fox) return null
  const lit = litCells(room, world.lamps)
  const seen = spots(room, fox.cell, fox.facing, randy.cell, randy.earsDown, lit)
  // A world in which that fox cannot see him is not the world he was caught in: say
  // nothing rather than something wrong.
  if (!seen) return null
  if (seen.forward === 1 && seen.lateral === 0) return 'front'

  const inShadow = tileAt(room, randy.cell) === 'shadow'
  const litHere = lit.has(cellIndex(room, randy.cell))
  if (randy.earsDown) return inShadow && litHere ? 'litShadow' : 'earsDownOpen'
  // Ears up: would the other way have hidden him? Only then is it the ears' fault.
  if (spots(room, fox.cell, fox.facing, randy.cell, true, lit) === null) return inShadow ? 'earsUpShadow' : 'earsUpCover'
  return 'seenAgain'
}

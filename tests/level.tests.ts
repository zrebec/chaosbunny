import { describe, it, expect } from 'vitest'
import { LEVEL } from '../src/world/level.js'
import { RABBIT_BOX, CROUCH_BOX } from '../src/rabbit.js'
import { JUMP_APEX_PX, JUMP_REACH_PX } from '../src/config.js'
import { CELL } from 'zx-kit'

// The reachability rules our procedural work distilled — now reused as a LINTER for
// the hand-authored level. Tune LEVEL freely; if a platform becomes unclimbable
// (head-bonk, too far, no ladder) or a crouch-gate becomes a trap, these fail and
// tell you which one. Crouch-gates: you can crawl under an overhang, but you can't
// JUMP from a crouch — so a jump must take off from a column that is clear (full
// standing height), not from under an overhang.

type Plat = { x: number; y: number; w: number }
type Over = { x: number; y: number; w: number; h?: number }

const REACH_COLS = Math.max(2, Math.ceil(JUMP_REACH_PX / CELL)) // horizontal jump reach
const APEX_PX = JUMP_APEX_PX * 0.9                              // usable rise (margin)
const STANDUP_MIN = 2 // clear columns an overhang must leave on its platform to stand + take off

/** Bottom (lip) row of an overhang block. */
const lipRow = (o: Over): number => o.y + (o.h ?? 1) - 1

/** Does overhang `o` block STANDING on platform `L` at column `col`? (It sits above
 *  L, spans `col`, and its clearance over L is below standing height.) */
function blocksStanding(o: Over, L: Plat, col: number): boolean {
  if (col < o.x || col > o.x + o.w - 1) return false
  if (col < L.x || col > L.x + L.w - 1) return false
  const lip = lipRow(o)
  if (lip >= L.y) return false // not above this platform
  return (L.y - lip - 1) * CELL < RABBIT_BOX.h // standing blocked here (crouch-only or lower)
}

/** Can the rabbit stand — and therefore take off for a jump — on `L` at `col`? */
function clearOnL(L: Plat, col: number): boolean {
  if (col < L.x || col > L.x + L.w - 1) return false
  return !LEVEL.overhangs.some((o) => blocksStanding(o, L, col))
}

/** Jump UP from L onto U, taking off from a CLEAR (standable) column of L beside U. */
function jumpReachable(L: Plat, U: Plat): boolean {
  if (U.y >= L.y) return false
  const rowsUp = L.y - U.y
  if ((rowsUp - 1) * CELL < RABBIT_BOX.h) return false // head would bonk U's underside
  if (rowsUp * CELL > APEX_PX) return false            // too high to jump
  const uLeft = U.x, uRight = U.x + U.w - 1
  // A standable takeoff column on L just beside U (left or right), within reach.
  for (let c = Math.max(L.x, uLeft - REACH_COLS); c <= Math.min(L.x + L.w - 1, uLeft - 1); c++)
    if (clearOnL(L, c)) return true
  for (let c = Math.max(L.x, uRight + 1); c <= Math.min(L.x + L.w - 1, uRight + REACH_COLS); c++)
    if (clearOnL(L, c)) return true
  return false
}

/** Can the rabbit climb a ladder that joins L and U? */
function ladderReachable(L: Plat, U: Plat): boolean {
  for (const lad of LEVEL.ladders) {
    const inL = lad.x >= L.x && lad.x <= L.x + L.w - 1
    const inU = lad.x >= U.x && lad.x <= U.x + U.w - 1
    const spans = lad.y <= U.y && lad.y + lad.h >= L.y
    if (inL && inU && spans) return true
  }
  return false
}

/** The platform a crouch-gate sits over — directly below the lip, columns overlapping. */
function supportingPlatform(o: Over): Plat | undefined {
  const lip = lipRow(o)
  return [...LEVEL.platforms]
    .filter((p) => p.y > lip && p.x <= o.x + o.w - 1 && p.x + p.w - 1 >= o.x)
    .sort((a, b) => a.y - b.y)[0]
}

describe('LEVEL — climbable by construction', () => {
  const floor: Plat = { x: 1, y: LEVEL.rows - 1, w: LEVEL.cols - 2 }
  const nodes: Plat[] = [floor, ...LEVEL.platforms]

  it('every platform is reachable from the floor, taking off from a standable column', () => {
    const reached = new Set<Plat>([floor])
    for (let grew = true; grew; ) {
      grew = false
      for (const U of nodes) {
        if (reached.has(U)) continue
        for (const L of reached) {
          if (jumpReachable(L, U) || ladderReachable(L, U)) { reached.add(U); grew = true; break }
        }
      }
    }
    const unreachable = LEVEL.platforms.filter((p) => !reached.has(p))
    expect(unreachable, `unreachable: ${JSON.stringify(unreachable)}`).toEqual([])
  })

  it('the top platform sits under the exit hole (you climb out there)', () => {
    const top = [...LEVEL.platforms].sort((a, b) => a.y - b.y)[0]!
    const holeL = LEVEL.exit.x, holeR = LEVEL.exit.x + LEVEL.exit.w - 1
    expect(holeL <= top.x + top.w - 1 && holeR >= top.x).toBe(true)
  })

  it('spawn stands on the floor row', () => {
    expect(LEVEL.spawn.y).toBe(LEVEL.rows - 1)
  })
})

describe('LEVEL — crouch-gates are fair (not traps)', () => {
  it('every overhang sits over a platform with crouch-only clearance', () => {
    for (const o of LEVEL.overhangs) {
      const P = supportingPlatform(o)
      expect(P, `overhang ${JSON.stringify(o)} has no platform beneath it`).toBeDefined()
      const clearance = (P!.y - lipRow(o) - 1) * CELL
      // Crouched fits, standing does not — otherwise it's impossible (too low) or
      // pointless (walkable standing).
      expect(clearance, `overhang ${JSON.stringify(o)} clearance ${clearance}px`).toBeGreaterThanOrEqual(CROUCH_BOX.h)
      expect(clearance, `overhang ${JSON.stringify(o)} clearance ${clearance}px`).toBeLessThan(RABBIT_BOX.h)
    }
  })

  it('every overhang leaves a stand-up zone on its platform (narrower than it)', () => {
    for (const o of LEVEL.overhangs) {
      const P = supportingPlatform(o)!
      const clearLeft = o.x - P.x
      const clearRight = (P.x + P.w) - (o.x + o.w)
      expect(
        Math.max(clearLeft, clearRight),
        `overhang ${JSON.stringify(o)} leaves no stand-up zone on platform ${JSON.stringify(P)} — you can't jump from a crouch, so this is a trap`,
      ).toBeGreaterThanOrEqual(STANDUP_MIN)
    }
  })
})

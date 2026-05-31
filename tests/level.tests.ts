import { describe, it, expect } from 'vitest'
import { LEVEL } from '../src/world/level.js'
import { RABBIT_BOX } from '../src/rabbit.js'
import { JUMP_APEX_PX, JUMP_REACH_PX } from '../src/config.js'
import { CELL } from 'zx-kit'

// The reachability rules our procedural work distilled — now reused as a LINTER
// for the hand-authored level. Tune LEVEL freely; if a platform becomes
// unclimbable (head-bonk, too far, no ladder), these tests fail and tell you.

type Plat = { x: number; y: number; w: number }

const REACH_COLS = Math.max(2, Math.ceil(JUMP_REACH_PX / CELL)) // horizontal jump reach
const APEX_PX = JUMP_APEX_PX * 0.9                              // usable rise (margin)

/** Can the rabbit jump UP from L onto U? Needs head clearance under U, a rise
 *  within the apex, and a takeoff column on L beside U (not under it) in reach. */
function jumpReachable(L: Plat, U: Plat): boolean {
  if (U.y >= L.y) return false
  const rowsUp = L.y - U.y
  if ((rowsUp - 1) * CELL < RABBIT_BOX.h) return false // head would bonk U's underside
  if (rowsUp * CELL > APEX_PX) return false            // too high to jump
  const lLeft = L.x, lRight = L.x + L.w - 1
  const uLeft = U.x, uRight = U.x + U.w - 1
  const leftReach = lLeft <= uLeft - 1 && lRight >= uLeft - REACH_COLS
  const rightReach = lRight >= uRight + 1 && lLeft <= uRight + REACH_COLS
  return leftReach || rightReach
}

/** Can the rabbit climb a ladder that joins L and U? (Mechanic lands next step.) */
function ladderReachable(L: Plat, U: Plat): boolean {
  for (const lad of LEVEL.ladders) {
    const inL = lad.x >= L.x && lad.x <= L.x + L.w - 1
    const inU = lad.x >= U.x && lad.x <= U.x + U.w - 1
    const spans = lad.y <= U.y && lad.y + lad.h >= L.y
    if (inL && inU && spans) return true
  }
  return false
}

describe('LEVEL — climbable by construction', () => {
  const floor: Plat = { x: 1, y: LEVEL.rows - 1, w: LEVEL.cols - 2 }
  const nodes: Plat[] = [floor, ...LEVEL.platforms]

  it('every platform is reachable from the floor (jump or ladder)', () => {
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

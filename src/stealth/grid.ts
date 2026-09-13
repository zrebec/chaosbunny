/**
 * Grid primitives for the tile-stealth prototype: cells, the four directions and
 * the step between them. Pure — no DOM, no audio, no time.
 */
import type { Direction } from 'zx-kit'

export type Dir = Direction

export interface Cell {
  readonly x: number
  readonly y: number
}

/** One fixed order, so every tie in the prototype (BFS, solver) breaks the same way. */
export const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left']

const DELTA: Readonly<Record<Dir, Cell>> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

/** The unit vector of a direction (`y` grows downward). */
export function delta(d: Dir): Cell {
  return DELTA[d]
}

/** The cell `n` steps from `c` in direction `d`. */
export function step(c: Cell, d: Dir, n = 1): Cell {
  return { x: c.x + DELTA[d].x * n, y: c.y + DELTA[d].y * n }
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y
}

export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/** The direction of the single orthogonal step from `a` to `b`, or `null` if they are not neighbours. */
export function dirBetween(a: Cell, b: Cell): Dir | null {
  return DIRS.find((d) => sameCell(step(a, d), b)) ?? null
}

/** A stable string key for maps and sets. */
export function cellKey(c: Cell): string {
  return `${c.x},${c.y}`
}

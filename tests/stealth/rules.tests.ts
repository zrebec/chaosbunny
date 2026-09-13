import { describe, it, expect } from 'vitest'
import type { Cell, Dir } from '../../src/stealth/grid.js'
import { tileAt } from '../../src/stealth/room.js'
import { spots, visibleCells, SIGHT_RANGE } from '../../src/stealth/rules.js'
import { testRoom } from './helpers.js'

/** An open 14×9 floor with a fox's-eye view from (5,5); `edits` puts tiles at cells. */
function open(edits: Record<string, string> = {}) {
  const rows = Array.from({ length: 11 }, (_, y) =>
    y === 0 || y === 10 ? '#'.repeat(16) : '#' + '.'.repeat(14) + '#')
  const put = (x: number, y: number, ch: string) => {
    rows[y] = rows[y]!.slice(0, x) + ch + rows[y]!.slice(x + 1)
  }
  put(1, 1, 'R')
  put(14, 9, 'D')
  for (const [at, ch] of Object.entries(edits)) {
    const [x, y] = at.split(',').map(Number)
    put(x!, y!, ch)
  }
  return testRoom(rows)
}

const FOX: Cell = { x: 5, y: 5 }
const cells = (list: readonly { cell: Cell }[]) => list.map((s) => `${s.cell.x},${s.cell.y}`).sort()

describe('the cone', () => {
  it('is one cell ahead, then three wide out to four', () => {
    expect(SIGHT_RANGE).toBe(4)
    expect(cells(visibleCells(open(), FOX, 'right', false))).toEqual(
      ['6,5', '7,4', '7,5', '7,6', '8,4', '8,5', '8,6', '9,4', '9,5', '9,6'].sort())
  })

  it.each<[Dir, string[]]>([
    ['left', ['4,5', '3,4', '3,5', '3,6', '2,4', '2,5', '2,6', '1,4', '1,5', '1,6']],
    ['up', ['5,4', '4,3', '5,3', '6,3', '4,2', '5,2', '6,2', '4,1', '5,1', '6,1']],
    ['down', ['5,6', '4,7', '5,7', '6,7', '4,8', '5,8', '6,8', '4,9', '5,9', '6,9']],
  ])('turns with the fox — facing %s', (facing, expected) => {
    expect(cells(visibleCells(open(), FOX, facing, false))).toEqual(expected.sort())
  })

  it('reports how far ahead and how far aside each cell is', () => {
    const s = visibleCells(open(), FOX, 'right', false).find((v) => v.cell.x === 8 && v.cell.y === 4)
    expect(s).toMatchObject({ forward: 3, lateral: -1 })
  })
})

describe('what blocks a sightline', () => {
  it('a wall right ahead hides everything behind it', () => {
    expect(visibleCells(open({ '6,5': '#' }), FOX, 'right', false)).toEqual([])
  })

  it('a wall touching the line only at a corner still blocks', () => {
    const seen = cells(visibleCells(open({ '6,6': '#' }), FOX, 'right', false))
    expect(seen).not.toContain('7,6') // the line to (7,6) runs through (6,6)
    expect(seen).not.toContain('8,6') // the line to (8,6) passes exactly through a corner of (6,6)
    expect(seen).toContain('9,6') // the line to (9,6) stays in row 5 until it is past (6,6)
  })

  it('never draws the cone on walls or cover', () => {
    const seen = cells(visibleCells(open({ '7,4': '#', '7,6': '=' }), FOX, 'right', false))
    expect(seen).not.toContain('7,4')
    expect(seen).not.toContain('7,6')
  })

  it('low cover blocks only while Randy has his ears down', () => {
    const room = open({ '7,5': '=' })
    expect(spots(room, FOX, 'right', { x: 8, y: 5 }, false)).not.toBeNull()
    expect(spots(room, FOX, 'right', { x: 8, y: 5 }, true)).toBeNull()
  })
})

describe('shadow', () => {
  it('hides Randy with his ears down', () => {
    const room = open({ '8,5': 's' })
    expect(spots(room, FOX, 'right', { x: 8, y: 5 }, false)).not.toBeNull()
    expect(spots(room, FOX, 'right', { x: 8, y: 5 }, true)).toBeNull()
  })

  it('does not hide him right in front of the fox', () => {
    const room = open({ '6,5': 's' })
    expect(spots(room, FOX, 'right', { x: 6, y: 5 }, true)).toMatchObject({ forward: 1, lateral: 0 })
  })
})

describe('spots agrees with the drawn cone', () => {
  // spots() is a direct lookup the solver can afford; visibleCells() is what gets drawn.
  // The player must never be caught by a cell that was not dotted, or missed on one that was.
  const room = open({ '6,4': '#', '7,5': '=', '8,6': 's', '4,5': 's', '5,7': '=', '3,3': '#' })
  it.each<Dir>(['up', 'right', 'down', 'left'])('cell for cell, facing %s, ears up and down', (facing) => {
    for (const earsDown of [false, true]) {
      const drawn = new Map(visibleCells(room, FOX, facing, earsDown).map((s) => [`${s.cell.x},${s.cell.y}`, s]))
      for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 16; x++) {
          const d = drawn.get(`${x},${y}`)
          const shadowHides = earsDown && tileAt(room, { x, y }) === 'shadow' && !(d?.forward === 1 && d.lateral === 0)
          const expected = d && !shadowHides ? { forward: d.forward, lateral: d.lateral } : null
          const seen = spots(room, FOX, facing, { x, y }, earsDown)
          expect(seen && { forward: seen.forward, lateral: seen.lateral }, `${x},${y} ears ${earsDown ? 'down' : 'up'}`).toEqual(expected)
        }
      }
    }
  })
})

describe('outside the cone', () => {
  it.each<[string, Cell]>([
    ['beside the fox', { x: 5, y: 4 }],
    ['diagonally in front', { x: 6, y: 4 }],
    ['behind', { x: 4, y: 5 }],
    ['one past the range', { x: 10, y: 5 }],
    ['two to the side', { x: 8, y: 3 }],
  ])('%s is never seen', (_label, randy) => {
    expect(spots(open(), FOX, 'right', randy, false)).toBeNull()
  })
})

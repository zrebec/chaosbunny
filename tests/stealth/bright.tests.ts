import { describe, it, expect } from 'vitest'
import { C } from 'zx-kit'
import { brightened, brightInk, TILES } from '../../src/stealth/art.js'
import { allLampsOn, litCells } from '../../src/stealth/light.js'
import { parseRoom, tileAt } from '../../src/stealth/room.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { AMBIENCE_ORDER, currentAmbience, looksLit } from '../../src/stealth/view.js'
import { LOCALES } from '../../src/stealth/strings.js'
import { testRoom } from './helpers.js'

const PALETTE = new Set<string>(Object.values(C))

describe('brightInk — the BRIGHT bit, and nothing else', () => {
  it('lifts every normal colour to its bright twin', () => {
    expect(brightInk(C.BLUE)).toBe(C.B_BLUE)
    expect(brightInk(C.RED)).toBe(C.B_RED)
    expect(brightInk(C.MAGENTA)).toBe(C.B_MAGENTA)
    expect(brightInk(C.GREEN)).toBe(C.B_GREEN)
    expect(brightInk(C.CYAN)).toBe(C.B_CYAN)
    expect(brightInk(C.YELLOW)).toBe(C.B_YELLOW)
    expect(brightInk(C.WHITE)).toBe(C.B_WHITE)
  })

  it('leaves black black and a bright colour bright — the palette never grows', () => {
    expect(brightInk(C.BLACK)).toBe(C.BLACK)
    for (const ink of Object.values(C)) {
      expect(PALETTE.has(brightInk(ink))).toBe(true)
      expect(brightInk(brightInk(ink))).toBe(brightInk(ink))
    }
  })
})

describe('brightened — the same tile, lit', () => {
  it('keeps every bitmap and changes only the inks', () => {
    const lit = brightened(TILES.floor)
    expect(lit.layers.map((l) => l.bitmap)).toEqual(TILES.floor.layers.map((l) => l.bitmap))
    expect(lit.layers.map((l) => l.ink)).toEqual(TILES.floor.layers.map((l) => brightInk(l.ink)))
    expect(lit.layers.some((l) => l.ink === C.B_BLUE)).toBe(true)
  })

  it('is made once per tile, not once per cell per redraw', () => {
    expect(brightened(TILES.floor)).toBe(brightened(TILES.floor))
  })
})

describe('looksLit — what the bright look lifts', () => {
  // A lamp at (5,1) in open floor; everything from row 4 down is rock.
  const room = testRoom([
    '#R.............#',
    '#....L.........#',
    '#..............#',
    '#.............D#',
  ])
  const on = allLampsOn(room)
  const lit = litCells(room, on)
  const at = (x: number, y: number, mask = on): boolean => looksLit(room, { x, y }, mask, litCells(room, mask))

  it('lifts the floor the lamp reaches, and the lamp itself', () => {
    expect(at(5, 2)).toBe(true)
    expect(at(5, 1)).toBe(true)
    expect(at(12, 1)).toBe(false) // out of reach
  })

  it('lifts the face of a wall the light lands on, never a wall the light cannot reach', () => {
    expect(tileAt(room, { x: 5, y: 4 })).toBe('wall')
    expect(at(5, 4)).toBe(true) // the wall under the lit floor below the lamp
    expect(at(12, 4)).toBe(false) // under floor the light does not reach
    expect(at(0, 1)).toBe(false) // the side wall, four steps away
    expect(at(5, 10)).toBe(false) // deep in rock
  })

  it('lifts nothing but the way out once every lamp is out', () => {
    for (let y = 0; y < room.rows; y++) {
      for (let x = 0; x < room.cols; x++) {
        expect(looksLit(room, { x, y }, 0, litCells(room, 0)), `(${x},${y})`).toBe(tileAt(room, { x, y }) === 'door')
      }
    }
    expect(lit.size).toBeGreaterThan(0)
  })

  it('leaves every room without a lamp exactly as it was', () => {
    // The door is always drawn bright, but its tile has no normal ink to lift.
    expect(brightened(TILES.door).layers.map((l) => l.ink)).toEqual(TILES.door.layers.map((l) => l.ink))
    for (const src of ROOM_SOURCES) {
      const r = parseRoom(src)
      if (r.lamps.length > 0) continue
      for (let y = 0; y < r.rows; y++) {
        for (let x = 0; x < r.cols; x++) {
          const kind = tileAt(r, { x, y })
          if (kind !== 'door') expect(looksLit(r, { x, y }, 0, litCells(r, 0)), `${r.name} (${x},${y})`).toBe(false)
        }
      }
    }
  })
})

describe('the bright look in the L cycle', () => {
  it('is the look a room opens with, and every look has a line in both tongues', () => {
    expect(currentAmbience()).toBe('bright')
    expect(AMBIENCE_ORDER[0]).toBe('bright')
    for (const str of Object.values(LOCALES)) {
      for (const level of AMBIENCE_ORDER) expect(str.ambience[level]).toBeTruthy()
    }
  })
})

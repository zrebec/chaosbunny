import { describe, it, expect } from 'vitest'
import { createAttrScreen, clearAttrScreen, createBitmapFromRows, C, type AttrScreen } from 'zx-kit'
import { nextViewMode, attrPainter, type ViewMode } from '../src/world/playfield.js'
import { createPlayer, renderPlayer } from '../src/entities/player.js'

describe('nextViewMode — the C playfield cycle', () => {
  it('cycles bricks → black → mono → clash → bricks', () => {
    expect(nextViewMode('bricks')).toBe('black')
    expect(nextViewMode('black')).toBe('mono')
    expect(nextViewMode('mono')).toBe('clash')
    expect(nextViewMode('clash')).toBe('bricks')
  })

  it('one full lap (4 presses) returns to the start', () => {
    let m: ViewMode = 'bricks'
    for (let i = 0; i < 4; i++) m = nextViewMode(m)
    expect(m).toBe('bricks')
  })
})

describe('attrPainter — authentic clash glue', () => {
  const SOLID = createBitmapFromRows([
    'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX',
    'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX',
  ])

  it('stamping a bitmap lights pixels and re-inks the touched cell', () => {
    const scr = createAttrScreen(2, 2) // 16×16, headless-safe
    clearAttrScreen(scr, C.BLACK)
    const inkBefore = scr.cellInk[0]
    attrPainter(scr, C.BLACK).bitmap(SOLID, 0, 0, C.B_CYAN)
    expect(scr.pixels[0]).toBe(1)              // top-left pixel lit
    expect(scr.cellInk[0]).not.toBe(inkBefore) // cell 0 re-inked (cyan)
  })

  it('rect (the spider thread) lights a thin column only', () => {
    const scr = createAttrScreen(2, 2)
    clearAttrScreen(scr, C.BLACK)
    attrPainter(scr, C.BLACK).rect(3, 0, 1, 8, C.WHITE)
    expect(scr.pixels[3]).toBe(1)             // (3,0) lit
    expect(scr.pixels[3 + scr.width]).toBe(1) // (3,1) lit — column continues down
    expect(scr.pixels[4]).toBe(0)             // (4,0) untouched (only 1px wide)
  })
})

describe('clash rabbit — single ink (no self-clash)', () => {
  /** Distinct inks across every cell that received a lit pixel. */
  function litCellInks(scr: AttrScreen): Set<number> {
    const inks = new Set<number>()
    for (let cy = 0; cy < scr.rows; cy++) {
      for (let cx = 0; cx < scr.cols; cx++) {
        let lit = false
        for (let yy = 0; yy < 8 && !lit; yy++)
          for (let xx = 0; xx < 8; xx++)
            if (scr.pixels[(cy * 8 + yy) * scr.width + (cx * 8 + xx)]) { lit = true; break }
        if (lit) inks.add(scr.cellInk[cy * scr.cols + cx]!)
      }
    }
    return inks
  }

  it('solo-ink: the whole rabbit is one ink across its cells', () => {
    const scr = createAttrScreen(8, 8) // 64×64, room for the 24×24 rabbit
    clearAttrScreen(scr, C.BLACK)
    renderPlayer(attrPainter(scr, C.BLACK), createPlayer(8, 8), 0, 0, C.B_CYAN)
    expect(litCellInks(scr).size).toBe(1) // no self-clash — one colour everywhere
  })

  it('without solo-ink the 4 colour layers self-clash (≥ 2 inks)', () => {
    const scr = createAttrScreen(8, 8)
    clearAttrScreen(scr, C.BLACK)
    renderPlayer(attrPainter(scr, C.BLACK), createPlayer(8, 8), 0, 0) // full colour layers
    expect(litCellInks(scr).size).toBeGreaterThanOrEqual(2)
  })
})

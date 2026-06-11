import { describe, expect, it } from 'vitest'
import { C } from 'zx-kit'
import {
  THEME_STONE_INK, THEME_MOSS_INK, THEME_CRUMBLE_INK, THEME_OVERHANG_INK, THEME_LADDER_INK,
  THEME_SPIDER_INK, THEME_BAT_INK, THEME_CARROT_INK, THEME_CARROT_SHOT_INK,
  THEME_TORCH_BRACKET_INK, THEME_FLAME_INKS,
  THEME_RABBIT_BODY_INK, THEME_RABBIT_BELLY_INK, THEME_RABBIT_ACCENT_INK, THEME_RABBIT_EYE_INK,
} from '../src/config.js'
import { buildRoomFromLevel } from '../src/world/room.js'
import { LEVEL } from '../src/world/level.js'

const PALETTE = new Set<string>(Object.values(C))

describe('theme', () => {
  it('uses only colours from the ZX palette (C.*, never raw hex)', () => {
    const inks = [
      THEME_STONE_INK, THEME_MOSS_INK, THEME_CRUMBLE_INK, THEME_OVERHANG_INK, THEME_LADDER_INK,
      THEME_SPIDER_INK, THEME_BAT_INK, THEME_CARROT_INK, THEME_CARROT_SHOT_INK,
      THEME_TORCH_BRACKET_INK,
      THEME_RABBIT_BODY_INK, THEME_RABBIT_BELLY_INK, THEME_RABBIT_ACCENT_INK, THEME_RABBIT_EYE_INK,
      ...THEME_FLAME_INKS,
    ]
    for (const ink of inks) expect(PALETTE.has(ink), `${ink} not in palette`).toBe(true)
  })

  it('paints the level tiles with the theme inks (guards against re-hardcoding)', () => {
    const room = buildRoomFromLevel(LEVEL)
    const wantByTileId: Record<string, string> = {
      stone: THEME_STONE_INK,
      moss: THEME_MOSS_INK,
      crumble: THEME_CRUMBLE_INK,
      overhang: THEME_OVERHANG_INK,
      ladder: THEME_LADDER_INK,
    }
    const seen = new Set<string>()
    for (let y = 0; y < room.map.rows; y++) {
      for (let x = 0; x < room.map.cols; x++) {
        const t = room.map.getTile(x, y)
        if (!t) continue
        const id = String(t.id)
        const want = wantByTileId[id]
        if (!want) continue
        expect(t.ink, `tile '${id}' at ${x},${y}`).toBe(want)
        seen.add(id)
      }
    }
    // The hand-built level must actually exercise the core tile kinds.
    for (const id of ['stone', 'moss', 'ladder']) expect(seen.has(id), `level has no '${id}' tile`).toBe(true)
  })
})

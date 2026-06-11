import { describe, expect, it } from 'vitest'
import { C } from 'zx-kit'
import {
  THEME_STONE_INK, THEME_MOSS_INK, THEME_CRUMBLE_INK, THEME_OVERHANG_INK, THEME_LADDER_INK,
  THEME_SPIDER_INK, THEME_BAT_INK, THEME_CARROT_INK, THEME_CARROT_SHOT_INK,
  THEME_TORCH_BRACKET_INK, THEME_FLAME_INKS,
  THEME_RABBIT_BODY_INK, THEME_RABBIT_BELLY_INK, THEME_RABBIT_ACCENT_INK, THEME_RABBIT_EYE_INK,
} from '../src/config.js'
import { buildRoomFromLevel, type LevelStratum } from '../src/world/room.js'
import { LEVEL } from '../src/world/level.js'

const PALETTE = new Set<string>(Object.values(C))

/** Mirrors the build-time stratum lookup in buildRoomFromLevel. */
function stratumAt(row: number): LevelStratum | undefined {
  const sorted = [...(LEVEL.strata ?? [])].sort((a, b) => a.fromRow - b.fromRow)
  let hit: LevelStratum | undefined
  for (const s of sorted) if (row >= s.fromRow) hit = s
  return hit
}

describe('theme', () => {
  it('uses only colours from the ZX palette (C.*, never raw hex)', () => {
    const inks = [
      THEME_STONE_INK, THEME_MOSS_INK, THEME_CRUMBLE_INK, THEME_OVERHANG_INK, THEME_LADDER_INK,
      THEME_SPIDER_INK, THEME_BAT_INK, THEME_CARROT_INK, THEME_CARROT_SHOT_INK,
      THEME_TORCH_BRACKET_INK,
      THEME_RABBIT_BODY_INK, THEME_RABBIT_BELLY_INK, THEME_RABBIT_ACCENT_INK, THEME_RABBIT_EYE_INK,
      ...THEME_FLAME_INKS,
      ...(LEVEL.strata ?? []).flatMap((s) => [s.stoneInk, s.mossInk].filter((i) => i !== undefined)),
    ]
    for (const ink of inks) expect(PALETTE.has(ink), `${ink} not in palette`).toBe(true)
  })

  it('paints ambient tiles per stratum and mechanic tiles with global signal inks', () => {
    const room = buildRoomFromLevel(LEVEL)
    const seen = new Set<string>()
    for (let y = 0; y < room.map.rows; y++) {
      for (let x = 0; x < room.map.cols; x++) {
        const t = room.map.getTile(x, y)
        if (!t) continue
        const id = String(t.id)
        // Ambient tiles follow the stratum of their row (fallback: global theme).
        const want =
          id === 'stone' ? stratumAt(y)?.stoneInk ?? THEME_STONE_INK :
          id === 'moss' ? stratumAt(y)?.mossInk ?? THEME_MOSS_INK :
          // Mechanic tiles must stay readable in every biome — always global.
          id === 'crumble' ? THEME_CRUMBLE_INK :
          id === 'overhang' ? THEME_OVERHANG_INK :
          id === 'ladder' ? THEME_LADDER_INK :
          null
        if (!want) continue
        expect(t.ink, `tile '${id}' at ${x},${y}`).toBe(want)
        seen.add(id)
      }
    }
    // The hand-built level must actually exercise the core tile kinds.
    for (const id of ['stone', 'moss', 'ladder', 'crumble']) {
      expect(seen.has(id), `level has no '${id}' tile`).toBe(true)
    }
  })

  it('strata actually change the look — at least two different moss inks in the level', () => {
    const room = buildRoomFromLevel(LEVEL)
    const mossInks = new Set<string>()
    for (let y = 0; y < room.map.rows; y++) {
      for (let x = 0; x < room.map.cols; x++) {
        const t = room.map.getTile(x, y)
        if (t && String(t.id) === 'moss') mossInks.add(t.ink)
      }
    }
    expect(mossInks.size).toBeGreaterThanOrEqual(2)
  })
})

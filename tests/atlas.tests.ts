import { describe, it, expect } from 'vitest'
import { normalizeRows, rowsToMaskRows, toBitmapRows, toLayerRows } from '../src/art/rowsToMask.js'
import { atlas, buildAsset } from '../src/art/atlas.js'
import { RABBIT_FRONT_IDLE, CARROT_SHOT } from '../src/art/sprites.js'
import { masksOverlap } from 'zx-kit'

// ── normalizeRows ─────────────────────────────────────────────────────────────

describe('normalizeRows', () => {
  it('pads all rows to one width that is a multiple of 8', () => {
    const out = normalizeRows(['XX', 'X.......X'])   // widths 2 and 9 → 16
    expect(out.every(r => r.length === 16)).toBe(true)
  })

  it('fixes the front-facing rabbit (uneven 30/32 rows → uniform 32)', () => {
    const out = normalizeRows(RABBIT_FRONT_IDLE)
    expect(out.every(r => r.length === 32)).toBe(true)
  })

  it('throws on empty input', () => {
    expect(() => normalizeRows([])).toThrow(/must not be empty/)
  })
})

// ── rowsToMaskRows ────────────────────────────────────────────────────────────

describe('rowsToMaskRows', () => {
  it('collapses every non-dot symbol to X, keeps dots', () => {
    expect(rowsToMaskRows(['PB.W', 'C..S'])).toEqual(['XX.X', 'X..X'])
  })
})

// ── toBitmapRows ──────────────────────────────────────────────────────────────

describe('toBitmapRows', () => {
  it('produces equal-width, byte-aligned, X/. only rows', () => {
    const out = toBitmapRows(RABBIT_FRONT_IDLE)
    expect(out.every(r => r.length === 32)).toBe(true)
    expect(out.every(r => /^[X.]+$/.test(r))).toBe(true)
  })
})

// ── toLayerRows ───────────────────────────────────────────────────────────────

describe('toLayerRows', () => {
  it('extracts only the requested symbols into a byte-aligned bitmap layer', () => {
    expect(toLayerRows(['BP.W'], 'BW')).toEqual(['X..X....'])
  })
})

// ── atlas builds ──────────────────────────────────────────────────────────────

describe('atlas', () => {
  it('every asset builds with a byte-aligned bitmap and matching mask', () => {
    for (const [key, asset] of Object.entries(atlas)) {
      expect(asset.width % 8, `${key} width`).toBe(0)
      expect(asset.mask.width, `${key} mask width`).toBe(asset.width)
      expect(asset.mask.height, `${key} mask height`).toBe(asset.height)
    }
  })

  it('the front-facing rabbit normalizes to 32×32', () => {
    expect(atlas.rabbitFrontIdle.width).toBe(32)
    expect(atlas.rabbitFrontIdle.height).toBe(32)
  })

  it('all rabbit side poses share one size (guards ragged composed rows)', () => {
    // No magic numbers — every pose must match the canonical idle pose, whatever
    // size the art currently is, so a redraw can never leave a pose ragged.
    const sidePoses = [
      'rabbitSideIdleA', 'rabbitSideIdleB', 'rabbitWalkA', 'rabbitWalkB',
      'rabbitJump', 'rabbitCrouch', 'rabbitShoot',
    ] as const
    const { width, height } = atlas.rabbitSideIdleA
    for (const key of sidePoses) {
      expect(atlas[key].width, `${key} width`).toBe(width)
      expect(atlas[key].height, `${key} height`).toBe(height)
    }
  })

  it('rabbit side poses carry separate render layers matching the union bitmap size', () => {
    const rabbit = atlas.rabbitSideIdleA
    for (const [name, layer] of Object.entries(rabbit.layers)) {
      expect(layer.width, `${name} width`).toBe(rabbit.width)
      expect(layer.height, `${name} height`).toBe(rabbit.height)
    }
    expect(rabbit.mask.totalPixels).toBeGreaterThan(0)
  })
})

// ── pixel-perfect foundation: the carrot spark ────────────────────────────────

describe('carrot spark — 4 real pixels, not the 8×8 box', () => {
  it('is an 8×1 bitmap whose mask has exactly 4 opaque pixels at columns 0–3', () => {
    const shot = buildAsset(CARROT_SHOT)
    expect(shot.width).toBe(8)
    expect(shot.height).toBe(1)
    expect(shot.mask.totalPixels).toBe(4)
    expect([...shot.mask.rows[0]!]).toEqual([0, 1, 2, 3])
  })

  it('collides with the spider only where real ink overlaps real spider pixels', () => {
    const shot = buildAsset(CARROT_SHOT)
    const spider = atlas.spiderDescend

    // Spider body pixels start a few rows down and around the centre columns.
    // Place the 1px-tall shot on the spider's solid body row → overlap > 0.
    const onBody = masksOverlap(shot.mask, 4, 6, spider.mask, 0, 0)
    expect(onBody).toBeGreaterThan(0)

    // Move the shot far to the right of the spider — boxes may be near but the
    // real pixels do not touch → no collision.
    const farRight = masksOverlap(shot.mask, 100, 6, spider.mask, 0, 0)
    expect(farRight).toBe(0)

    // Park the shot on the spider's empty thread rows beyond its ink → no hit
    // even though the bounding boxes overlap.
    const emptyGap = masksOverlap(shot.mask, 9, 0, spider.mask, 0, 0)
    expect(emptyGap).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { makeBats, updateBats } from '../src/entities/bat.js'
import { atlas } from '../src/art/atlas.js'
import type { Shot } from '../src/entities/projectile.js'

// Regression: a backwards first-frame rAF timestamp made `dt` negative → bat.t < 0
// → frameFor() computed FRAMES[-1] (undefined) → `frame.bitmap` threw in the update
// phase, before any drawing → black screen until a lucky (positive-dt) refresh.
describe('updateBats — robust against a negative dt', () => {
  const mask = atlas.rabbitSideIdleA.mask // any real PixelMask for the overlap checks
  const shots: Shot[] = []

  it('does not throw when the first frame has a negative dt', () => {
    const bats = makeBats([{ baseX: 100, baseY: 100, rangeX: 40 }])
    // player far away (no overlap) so we exercise the patrol + frameFor path cleanly
    expect(() => updateBats(bats, mask, 9999, 9999, shots, -16)).not.toThrow()
  })

  it('keeps working across normal frames after a negative one', () => {
    const bats = makeBats([{ baseX: 100, baseY: 100, rangeX: 40 }])
    expect(() => {
      updateBats(bats, mask, 9999, 9999, shots, -16)
      for (let i = 0; i < 5; i++) updateBats(bats, mask, 9999, 9999, shots, 16)
    }).not.toThrow()
  })
})

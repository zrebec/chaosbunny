import { describe, it, expect } from 'vitest'
import { nextViewMode, type ViewMode } from '../src/world/clash.js'

describe('nextViewMode — the C playfield cycle', () => {
  it('cycles bricks → black → mono → bricks', () => {
    expect(nextViewMode('bricks')).toBe('black')
    expect(nextViewMode('black')).toBe('mono')
    expect(nextViewMode('mono')).toBe('bricks')
  })

  it('one full lap of presses returns to the start', () => {
    let m: ViewMode = 'bricks'
    for (let i = 0; i < 3; i++) m = nextViewMode(m)
    expect(m).toBe('bricks')
  })
})

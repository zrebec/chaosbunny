import { describe, it, expect } from 'vitest'
import { atlas } from '../src/art/atlas.js'
import { makeCarrots, updateCarrots } from '../src/entities/pickup.js'
import { makeSpiders, updateSpiders } from '../src/entities/spider.js'
import { spawnShot, type Shot } from '../src/entities/projectile.js'

const PMASK = atlas.rabbitSideIdleA.mask

describe('carrot pickup — pixel-perfect collection', () => {
  it('collects when the rabbit pixels overlap the carrot pixels', () => {
    const carrots = makeCarrots([{ x: 100, y: 100 }])
    const got = updateCarrots(carrots, PMASK, 98, 96)
    expect(got).toBe(1)
    expect(carrots[0]!.collected).toBe(true)
  })

  it('does not collect when far away (no pixel overlap)', () => {
    const carrots = makeCarrots([{ x: 100, y: 100 }])
    const got = updateCarrots(carrots, PMASK, 0, 0)
    expect(got).toBe(0)
    expect(carrots[0]!.collected).toBe(false)
  })
})

describe('spider — curls only on a real carrot-spark pixel hit', () => {
  it('curls when a shot overlaps its body', () => {
    const spiders = makeSpiders([{ x: 100, anchorY: 0, bottomY: 200 }])
    const shots: Shot[] = []
    spawnShot(shots, 103, 6, 1) // over the spider's body pixels
    const res = updateSpiders(spiders, PMASK, -1000, -1000, shots, 16)
    expect(spiders[0]!.state).toBe('curled')
    expect(res.curled).toBe(true)
    expect(shots[0]!.active).toBe(false)
  })

  it('does not curl when the shot misses', () => {
    const spiders = makeSpiders([{ x: 100, anchorY: 0, bottomY: 200 }])
    const shots: Shot[] = []
    spawnShot(shots, 400, 6, 1)
    const res = updateSpiders(spiders, PMASK, -1000, -1000, shots, 16)
    expect(spiders[0]!.state).not.toBe('curled')
    expect(res.curled).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { mirrorBitmap } from 'zx-kit'
import { SPRITES, type Layered } from '../../src/stealth/art.js'
import { DIRS } from '../../src/stealth/grid.js'
import { faceAfter, hopFrame, hopLift, HOP_PX } from '../../src/stealth/view.js'

const EARS = ['earsUp', 'earsDown'] as const

/** Whether any layer has an inked pixel in row `y` (a bitmap is one byte per 8 pixels). */
function rowInked(art: Layered, y: number): boolean {
  const bytes = art.w / 8
  return art.layers.some((l) => l.bitmap.data.subarray(y * bytes, (y + 1) * bytes).some((b) => b !== 0))
}

describe("Randy's poses", () => {
  it('has two 16x24 frames for every direction, ears up and down', () => {
    for (const dir of DIRS) {
      for (const ears of EARS) {
        const frames = SPRITES.randy[dir][ears]
        expect(frames, `${dir} ${ears}`).toHaveLength(2)
        for (const art of frames) expect([art.w, art.h], `${dir} ${ears}`).toEqual([16, 24])
        // A hop is a different picture, or the animation would be a lie.
        expect(frames[0]).not.toEqual(frames[1])
      }
    }
  })

  it('looks left as the mirror of looking right', () => {
    for (const ears of EARS) {
      SPRITES.randy.left[ears].forEach((art, i) => {
        const right = SPRITES.randy.right[ears][i]!
        expect(art.layers.map((l) => l.ink)).toEqual(right.layers.map((l) => l.ink))
        art.layers.forEach((l, j) => expect(l.bitmap.data).toEqual(mirrorBitmap(right.layers[j]!.bitmap).data))
      })
    }
  })

  it('shows the ears as the verb they are: tall when up, and nothing above the head when down', () => {
    // The top rows are where the ears stand. Down, they are empty in every facing — the
    // silhouette itself says EARS DOWN, before any colour or HUD line does.
    for (const dir of DIRS) {
      for (const art of SPRITES.randy[dir].earsUp) expect(rowInked(art, 0), `${dir} ears up`).toBe(true)
      for (const art of SPRITES.randy[dir].earsDown) {
        for (const y of [0, 1, 2]) expect(rowInked(art, y), `${dir} ears down, row ${y}`).toBe(false)
      }
    }
  })

  it('faces the camera and turns away as different pictures, not one drawn twice', () => {
    expect(SPRITES.randy.down.earsUp[0]).not.toEqual(SPRITES.randy.up.earsUp[0])
    expect(SPRITES.randy.down.earsUp[0]).not.toEqual(SPRITES.randy.right.earsUp[0])
  })
})

describe('faceAfter — which way he looks, kept out of the rules', () => {
  it('turns to a step and to a throw', () => {
    for (const dir of DIRS) {
      expect(faceAfter('down', { kind: 'move', dir })).toBe(dir)
      expect(faceAfter('up', { kind: 'throw', dir })).toBe(dir)
    }
  })

  it('keeps looking the same way for the ears and for a wait', () => {
    for (const dir of DIRS) {
      expect(faceAfter(dir, { kind: 'ears' })).toBe(dir)
      expect(faceAfter(dir, { kind: 'wait' })).toBe(dir)
    }
  })
})

describe('the hop', () => {
  it('stands at both ends of a step and hops through the middle', () => {
    expect(hopFrame(0)).toBe(0)
    expect(hopFrame(0.5)).toBe(1)
    expect(hopFrame(1)).toBe(0)
  })

  it('lifts him along an arc that lands where it took off', () => {
    expect(hopLift(0)).toBe(0)
    expect(hopLift(0.5)).toBe(HOP_PX)
    expect(hopLift(1)).toBe(0)
    for (let t = 0; t <= 1; t += 0.05) {
      expect(hopLift(t)).toBeGreaterThanOrEqual(0)
      expect(hopLift(t)).toBeLessThanOrEqual(HOP_PX)
    }
  })
})

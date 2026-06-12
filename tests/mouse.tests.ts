import { describe, it, expect } from 'vitest'
import { makeMice, updateMice } from '../src/entities/mouse.js'
import { atlas } from '../src/art/atlas.js'
import type { Shot } from '../src/entities/projectile.js'

const RABBIT_MASK = atlas.rabbitSideIdleA.mask // real mask, rules 1–6
const NO_SHOTS: Shot[] = []
const WORLD_W = 176

/** A mouse standing on a floor at y=100 (its top is 92). */
function mouse() {
  return makeMice([{ x: 80, floorY: 100, minX: 40, maxX: 120 }])
}

describe('mouse — stomp, side hit, flee (never dies)', () => {
  it('patrols between its bounds and turns around', () => {
    const mice = mouse()
    for (let i = 0; i < 200; i++) updateMice(mice, RABBIT_MASK, 999, 999, 0, 0, NO_SHOTS, 16, WORLD_W)
    const m = mice[0]!
    expect(m.active).toBe(true)
    expect(m.x).toBeGreaterThanOrEqual(40)
    expect(m.x).toBeLessThanOrEqual(120)
  })

  it('stomp from above: mouse flees, rabbit is NOT hurt, bounce is signalled', () => {
    const mice = mouse()
    const m = mice[0]!
    // Rabbit falling (vy > 0), feet at the mouse's back (top at 92).
    const px = Math.round(m.x) - 4
    const py = 92 - 20 // rabbit sprite overlaps the mouse from above
    const res = updateMice(mice, RABBIT_MASK, px, py, 0.3, 92 + 4, NO_SHOTS, 16, WORLD_W)
    expect(res.stomped).toBe(true)
    expect(res.hitX).toBeNull()
    expect(m.state).toBe('flee')
    expect(m.active).toBe(true) // fleeing, not dead — rule 8
  })

  it('side contact hurts the rabbit (no stomp without falling)', () => {
    const mice = mouse()
    const m = mice[0]!
    // Rabbit standing beside/over it, not falling (vy = 0), feet at floor level.
    const res = updateMice(mice, RABBIT_MASK, Math.round(m.x) - 6, 100 - 24, 0, 100, NO_SHOTS, 16, WORLD_W)
    expect(res.stomped).toBe(false)
    expect(res.hitX).not.toBeNull()
    expect(m.state).toBe('patrol')
  })

  it('a carrot spark scares it into fleeing and consumes the shot', () => {
    const mice = mouse()
    const m = mice[0]!
    const shot = { x: m.x, y: m.y + 2, facing: 1, active: true } as Shot
    updateMice(mice, RABBIT_MASK, 999, 999, 0, 0, [shot], 16, WORLD_W)
    expect(m.state).toBe('flee')
    expect(shot.active).toBe(false)
  })

  it('fleeing carries it past the world edge where it deactivates — it never dies on screen', () => {
    const mice = mouse()
    const m = mice[0]!
    m.state = 'flee'
    m.dir = 1
    let frames = 0
    while (m.active && frames < 500) { updateMice(mice, RABBIT_MASK, 999, 999, 0, 0, NO_SHOTS, 16, WORLD_W); frames++ }
    expect(m.active).toBe(false)
    expect(m.x).toBeGreaterThan(WORLD_W - 1) // it left the world, it didn't die in it
  })
})

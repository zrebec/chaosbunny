import { describe, expect, it } from 'vitest'
import {
  TORCH_LIGHT_INTENSITY, TORCH_LIGHT_RADIUS,
  TORCH_PULSE_INTENSITY, TORCH_PULSE_RADIUS,
} from '../src/config.js'
import { makeTorches, torchLights } from '../src/entities/torch.js'
import { lightFalloff } from '../src/world/lighting.js'

describe('lightFalloff', () => {
  it('is full at the centre, zero at the edge, monotonically fading', () => {
    expect(lightFalloff(0)).toBe(1)
    expect(lightFalloff(1)).toBe(0)
    let prev = 1
    for (let t = 0.1; t < 1; t += 0.1) {
      const v = lightFalloff(t)
      expect(v).toBeLessThanOrEqual(prev)
      expect(v).toBeGreaterThanOrEqual(0)
      prev = v
    }
  })

  it('passes through the falloff control points', () => {
    expect(lightFalloff(0.35)).toBeCloseTo(0.82)
    expect(lightFalloff(0.72)).toBeCloseTo(0.3)
  })
})

describe('torchLights', () => {
  it('converts torch positions from world space to screen space', () => {
    const torches = makeTorches([{ x: 80, y: 120 }])
    const [light] = torchLights(torches, 24, 48, 0)

    expect(light).toMatchObject({ x: 60, y: 74 })
  })

  it('uses deterministic bounded flicker', () => {
    const torches = makeTorches([{ x: 0, y: 0 }])
    const first = torchLights(torches, 0, 0, 1234)[0]!
    const repeat = torchLights(torches, 0, 0, 1234)[0]!

    expect(repeat.intensity).toBe(first.intensity)
    expect(repeat.radius).toBe(first.radius)
    expect(first.intensity).toBeGreaterThanOrEqual(TORCH_LIGHT_INTENSITY * (1 - 2 * TORCH_PULSE_INTENSITY))
    expect(first.intensity).toBeLessThanOrEqual(TORCH_LIGHT_INTENSITY)
  })

  it('pulses the light radius over time — a living flame, not a static lamp', () => {
    const torches = makeTorches([{ x: 0, y: 0 }])
    const radii = [0, 150, 400, 900, 1600].map((t) => torchLights(torches, 0, 0, t)[0]!.radius)

    expect(new Set(radii).size).toBeGreaterThan(1)
    for (const r of radii) {
      expect(r).toBeGreaterThanOrEqual(TORCH_LIGHT_RADIUS * (1 - TORCH_PULSE_RADIUS))
      expect(r).toBeLessThanOrEqual(TORCH_LIGHT_RADIUS * (1 + TORCH_PULSE_RADIUS))
    }
  })

  it('breathes radius and intensity together (one pulse drives both)', () => {
    const torches = makeTorches([{ x: 0, y: 0 }])
    const samples = [0, 100, 250, 333, 777, 1500].map((t) => torchLights(torches, 0, 0, t)[0]!)

    // Brighter moments must also be wider — both derive from the same pulse.
    const sorted = [...samples].sort((a, b) => a.radius - b.radius)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.intensity).toBeGreaterThanOrEqual(sorted[i - 1]!.intensity)
    }
  })

  it('gives separate torch phases different flicker values', () => {
    const torches = makeTorches([
      { x: 0, y: 0 },
      { x: 16, y: 0 },
    ])
    const lights = torchLights(torches, 0, 0, 500)

    expect(lights[0]!.intensity).not.toBe(lights[1]!.intensity)
    expect(lights[0]!.radius).not.toBe(lights[1]!.radius)
  })
})

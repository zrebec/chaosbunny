/**
 * Wall torches — world-space light sources that actually **burn** via the
 * particle system: each frame they spit a little fire (yellow/red/white motes
 * that rise and fade) and contribute a flickering light to the {@link "../world/lighting" | lighting}
 * pass. The bracket sprite is drawn under the darkness; the flame particles are
 * drawn on top of it so they glow.
 */
import {
  createBitmapFromRows, emitParticles, CELL, C,
  type Bitmap, type ParticleSystem,
} from 'zx-kit'
import {
  TORCH_LIGHT_INTENSITY, TORCH_LIGHT_RADIUS,
  TORCH_PULSE_INTENSITY, TORCH_PULSE_RADIUS, TORCH_PULSE_SPEED,
} from '../config.js'
import type { Painter } from '../world/playfield.js'
import type { Light } from '../world/lighting.js'

const BRACKET: Bitmap = createBitmapFromRows([
  '........',
  '........',
  '...XX...',
  '..XXXX..',
  '...XX...',
  '..X..X..',
  '.X....X.',
  '........',
])

const FLAME_COLORS = [C.B_YELLOW, C.B_RED, C.B_WHITE]

export interface Torch {
  x: number
  y: number
  phase: number
}

export function makeTorches(spawns: ReadonlyArray<{ x: number; y: number }>): Torch[] {
  return spawns.map((s, i) => ({ x: s.x, y: s.y, phase: i * 1.7 }))
}

/** Spits fire particles from every torch (call each frame). */
export function emitTorchFire(torches: readonly Torch[], fire: ParticleSystem, _dt: number): void {
  for (const t of torches) {
    emitParticles(fire, {
      x: t.x + CELL / 2,
      y: t.y + 2,
      count: 1,
      color: FLAME_COLORS,
      speed: [0.005, 0.022],
      angle: -Math.PI / 2,
      spread: 0.7,
      life: [180, 430],
      size: 1,
    })
  }
}

/**
 * Flame pulse in [-1, 1] — two incommensurate sine waves (≈480 ms and ≈1340 ms
 * periods at TORCH_PULSE_SPEED = 1) whose sum never exactly repeats, so the
 * flicker reads as living fire while remaining a pure function of (time, phase).
 */
export function torchPulse(time: number, phase: number): number {
  const t = time * TORCH_PULSE_SPEED
  return (Math.sin(t * 0.013 + phase) + Math.sin(t * 0.0047 + phase * 1.7)) / 2
}

/** Pulsing torch lights in screen space (camera already applied). */
export function torchLights(torches: readonly Torch[], camX: number, camY: number, time: number): Light[] {
  return torches.map((t) => {
    const pulse = torchPulse(time, t.phase)
    return {
      x: t.x + CELL / 2 - camX,
      y: t.y + 2 - camY,
      radius: TORCH_LIGHT_RADIUS * (1 + TORCH_PULSE_RADIUS * pulse),
      intensity: TORCH_LIGHT_INTENSITY * (1 - TORCH_PULSE_INTENSITY * (1 - pulse)),
    }
  })
}

export function renderTorches(paint: Painter, torches: readonly Torch[], camX: number, camY: number): void {
  for (const t of torches) {
    paint.bitmap(BRACKET, Math.round(t.x - camX), Math.round(t.y - camY), C.WHITE)
  }
}

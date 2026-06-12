/** Smooth cave darkness with soft radial cut-outs for screen-space lights. */
import type { Light } from 'zx-kit'
import { CAVE_AMBIENT_DARKNESS, PLAYFIELD_H, PLAYFIELD_W, TORCH_LIGHT_BANDS } from '../config.js'

export type { Light } // re-export so torch.ts / main keep importing from here

/** Falloff curve control points: (normalised distance, brightness 1→0). */
const FALLOFF: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.35, 0.82],
  [0.72, 0.3],
  [1, 0],
]

/** Light falloff over normalised distance t∈[0,1] — piecewise-linear through
 *  {@link FALLOFF}. Pure; exported for tests. */
export function lightFalloff(t: number): number {
  if (t <= 0) return 1
  if (t >= 1) return 0
  for (let i = 1; i < FALLOFF.length; i++) {
    const [t1, v1] = FALLOFF[i]!
    if (t <= t1) {
      const [t0, v0] = FALLOFF[i - 1]!
      return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0)
    }
  }
  return 0
}

let darknessCanvas: HTMLCanvasElement | null = null
let darknessCtx: CanvasRenderingContext2D | null = null

/** Creates the reusable offscreen darkness buffer. Call once at startup. */
export function initLighting(): void {
  darknessCanvas = document.createElement('canvas')
  darknessCanvas.width = PLAYFIELD_W
  darknessCanvas.height = PLAYFIELD_H
  darknessCtx = darknessCanvas.getContext('2d')
}

export function renderDarkness(
  ctx: CanvasRenderingContext2D,
  lights: readonly Light[],
): void {
  if (!darknessCanvas || !darknessCtx) return

  darknessCtx.globalCompositeOperation = 'source-over'
  darknessCtx.clearRect(0, 0, PLAYFIELD_W, PLAYFIELD_H)
  darknessCtx.fillStyle = `rgba(0, 0, 0, ${CAVE_AMBIENT_DARKNESS})`
  darknessCtx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H)

  darknessCtx.globalCompositeOperation = 'destination-out'
  for (const light of lights) {
    if (light.radius <= 0 || light.intensity <= 0) continue

    const gradient = darknessCtx.createRadialGradient(
      light.x,
      light.y,
      0,
      light.x,
      light.y,
      light.radius,
    )
    if (TORCH_LIGHT_BANDS > 0) {
      // Posterised light: sample the falloff at each ring's centre and hold it
      // flat across the ring — hard concentric banding reads 8-bit/arcade.
      for (let i = 0; i < TORCH_LIGHT_BANDS; i++) {
        const a = light.intensity * lightFalloff((i + 0.5) / TORCH_LIGHT_BANDS)
        gradient.addColorStop(i / TORCH_LIGHT_BANDS, `rgba(0, 0, 0, ${a})`)
        gradient.addColorStop((i + 1) / TORCH_LIGHT_BANDS - 0.001, `rgba(0, 0, 0, ${a})`)
      }
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    } else {
      // Smooth gradient through the same falloff control points.
      for (const [t, v] of FALLOFF) {
        gradient.addColorStop(t, `rgba(0, 0, 0, ${light.intensity * v})`)
      }
    }
    darknessCtx.fillStyle = gradient
    darknessCtx.fillRect(
      light.x - light.radius,
      light.y - light.radius,
      light.radius * 2,
      light.radius * 2,
    )
  }

  darknessCtx.globalCompositeOperation = 'source-over'
  ctx.drawImage(darknessCanvas, 0, 0)
}

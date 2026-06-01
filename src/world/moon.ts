/**
 * The moon — the climb's visual goal.
 *
 * A pale disc sitting in the ceiling exit hole, plus a big soft moonlight glow
 * that pools at the top of the shaft and spills down as you near the surface.
 * Both are rendered/added above the cave darkness, so the moon reads as the
 * light you are climbing toward — the destination, not just decoration.
 *
 * (Visible during the final approach; making it glow from the very bottom is the
 * job of the upcoming depth-based lighting, not this beacon.)
 */
import { C, type Rect } from 'zx-kit'
import type { Light } from './lighting.js'

export interface Moon {
  x: number
  y: number
  r: number
}

/** Centres the moon in the ceiling opening (top of the exit zone). */
export function makeMoon(exit: Rect): Moon {
  return { x: exit.x + exit.w / 2, y: 4, r: 9 }
}

/** Big, soft moonlight — brightest at the hole, fading down the shaft. Dim until
 *  the exit is "open" (all carrots collected), then full. */
export function moonLight(moon: Moon, camX: number, camY: number, intensity = 1): Light {
  return { x: moon.x - camX, y: moon.y - camY, radius: 150, intensity }
}

/** Draws the moon disc + craters with a gentle breathing pulse. When the exit is
 *  not yet `open`, the disc reads dim/cold — a clear "not yet" signal. */
export function renderMoon(
  ctx: CanvasRenderingContext2D,
  moon: Moon,
  camX: number,
  camY: number,
  now: number,
  open = true,
): void {
  const sx = moon.x - camX
  const sy = moon.y - camY
  // Off-screen below the view — nothing to draw (and arc() isn't free).
  if (sy > 220 || sy < -40) return

  const r = moon.r * (1 + Math.sin(now / 900) * 0.06)

  ctx.fillStyle = open ? C.B_WHITE : C.BLUE // bright full moon vs dim "closed" disc
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fill()

  // A few pale craters give the disc a face instead of a blank dot.
  ctx.fillStyle = open ? C.B_CYAN : C.B_BLUE
  for (const [dx, dy, cr] of [[-3, -2, 1.6], [2, 3, 1.2], [4, -3, 1]] as const) {
    ctx.beginPath()
    ctx.arc(sx + dx, sy + dy, cr, 0, Math.PI * 2)
    ctx.fill()
  }
}

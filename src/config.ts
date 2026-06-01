/** Global game constants. */

export const GAME_WIDTH = 256
export const GAME_HEIGHT = 192
export const CANVAS_SCALE = 4

/** UI language (i18n wiring comes in a later step). */
export const LANGUAGE_CODE = 'sk'

/**
 * Floors to climb before the escape hatch — the room's goal, shown in the HUD.
 * 11 matches the hand-built vertical slice (one platform ≈ one floor). The full
 * game targets 50 across ~5 escalating cave strata; bump this when the world
 * goes procedural.
 */
export const FLOOR_TARGET = 11 as const

/**
 * Lighting starting mode (toggle on/off in-game with the `L` key):
 *  - 'none' — start with the cave fully lit (current default; revisit with biomes).
 *  - 'zx'   — dithered cave darkness (via zx-kit's `lighting` module).
 * Darkness is OFF by default for now while we build levels; `L` turns it on.
 */
export const LIGHTING_MODE: 'zx' | 'none' = 'none'

/**
 * Darkest the cave ever gets — applied at the very **bottom** (deepest) of the
 * world. A fraction of full black (0 = no darkness, 1 = pure black outside every
 * light). Below 1 the unlit cave stays a *dim stipple* — silhouettes remain
 * faintly visible instead of vanishing. Dial up toward 1.0 for a darker deep.
 */
export const MAX_DARKNESS = 0.9 as const

/**
 * Depth-based lighting: how dark it stays near the **surface** (the moon), as a
 * fraction of {@link MAX_DARKNESS}. The baseline darkness lerps from
 * `MAX_DARKNESS × SURFACE_LIGHT_FACTOR` at the top to `MAX_DARKNESS` at the
 * bottom — so the deep cave keeps its murk while the climb brightens toward the
 * moonlit exit. 0.12 ≈ "the surface is basically lit". 1.0 disables the gradient.
 */
export const SURFACE_LIGHT_FACTOR = 0.12 as const

/**
 * Platformer physics in pixel/millisecond units (frame-rate independent —
 * everything is multiplied by `dt` in ms). Tuned for a snappy Mario / Jazz
 * Jackrabbit feel: punchy jump, heavier fall, short coyote + buffer windows.
 */
export const physics = {
  /** Rising-gravity (px/ms²). Lowered for a slightly slower, floatier jump. */
  gravity: 0.0017,
  /** Heavier gravity while falling — steeper descent, like a thrown arc. */
  fallGravity: 0.0030,
  /** Max horizontal speed (px/ms ≈ 120 px/s). */
  maxSpeed: 0.12,
  /** Horizontal acceleration toward max speed while grounded (px/ms²). */
  accelGround: 0.0015,
  /** Weaker mid-air steering — you mostly keep your launch momentum. */
  accelAir: 0.0008,
  /** Ground friction when no direction is held (px/ms²). Air has none → momentum. */
  frictionGround: 0.0024,
  /** Initial jump velocity (px/ms). Apex ≈ 47px — clears the 32px steps with
   *  margin; combined with the lower gravity the jump feels a touch slower. */
  jumpVelocity: -0.40,
  /** On jump release while rising, velocity is cut to this fraction (variable height). */
  jumpCut: 0.45,
  /** Terminal fall speed clamp (px/ms). */
  maxFallSpeed: 0.7,
  /** Grace window after leaving a ledge during which a jump still fires (ms). */
  coyoteMs: 100,
  /** Window before landing during which a jump press is remembered (ms). */
  jumpBufferMs: 120,
  /** Ladder climb speed (px/ms) — a touch slower than running. */
  climbSpeed: 0.06,
} as const

/**
 * Jump envelope, derived once from {@link physics} — the single source of truth
 * the world generator measures platform spacing against. Retune the jump or
 * speed and the reachable spacing follows automatically; no magic numbers.
 *
 *  - `JUMP_APEX_PX`  — peak rise of a full jump (`v² / 2g`).
 *  - `JUMP_REACH_PX` — horizontal distance covered on the way up at full speed
 *    (conservative: rise time × max speed).
 */
export const JUMP_APEX_PX = (physics.jumpVelocity ** 2) / (2 * physics.gravity)
export const JUMP_REACH_PX = physics.maxSpeed * (Math.abs(physics.jumpVelocity) / physics.gravity)

/** Ink colour for the (monochrome-first) rabbit — bright ZX blue/cyan. */
export const RABBIT_INK = '#00FFFF' as const

/** Ink colour for the carrot spark projectile. */
export const CARROT_INK = '#FFFF00' as const

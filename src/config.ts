/** Global game constants. */

export const GAME_WIDTH = 256
export const GAME_HEIGHT = 192
export const CANVAS_SCALE = 4

/** UI language (i18n wiring comes in a later step). */
export const LANGUAGE_CODE = 'sk'

/**
 * Lighting renderer:
 *  - 'zx'     — authentic 8×8 cell light levels + ordered dither (default).
 *  - 'smooth' — shelved modern soft radial gradients (flip here to compare).
 */
export const LIGHTING_MODE = 'zx' as const

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
} as const

/** Ink colour for the (monochrome-first) rabbit — bright ZX blue/cyan. */
export const RABBIT_INK = '#00FFFF' as const

/** Ink colour for the carrot spark projectile. */
export const CARROT_INK = '#FFFF00' as const

/** Global game constants. */
import { C, type SpectrumColor } from 'zx-kit'

export const GAME_WIDTH = 256
export const GAME_HEIGHT = 192

/**
 * Screen layout (2026-06-12 redesign, see docs/screen-redesign.sk.md): the
 * classic ZX pattern — a framed HUD sidebar on the left, the playfield on the
 * right. Everything stays inside the 256×192 ZX screen. All values MUST be
 * multiples of 8 (attribute cells, mono/clash alignment, frame tiles).
 */
export const SIDEBAR_W = 80 as const // 10 cells: 1 frame + 8 content + 1 frame
export const PLAYFIELD_X = SIDEBAR_W
export const PLAYFIELD_W = GAME_WIDTH - SIDEBAR_W // 176 px = 22 cells
export const PLAYFIELD_H = GAME_HEIGHT // 192 px = 24 cells

/** UI language (i18n wiring comes in a later step). */
export const LANGUAGE_CODE = 'sk'

/**
 * Floors to climb before the escape hatch — the room's goal, shown in the HUD.
 * 11 matches the hand-built vertical slice (one platform ≈ one floor). The full
 * game targets 50 across ~5 escalating cave strata; bump this as the level grows
 * toward them.
 */
export const FLOOR_TARGET = 11 as const

/**
 * Background music auto-rotation: how many times the current loop repeats before
 * the game shuffles to another track (a shuffle-bag — every track plays once per
 * cycle, never the same one twice in a row). Manual `N` still skips anytime.
 * Set to 0 to disable auto-rotation (stay on the chosen track until `N`).
 */
export const MUSIC_LOOPS_PER_TRACK = 2 as const

/**
 * Lighting starting mode (toggle on/off in-game with the `L` key):
 *  - 'none'   — start with the cave fully lit.
 *  - 'smooth' — dim ambient cave with soft radial light around torches.
 */
export const LIGHTING_MODE: 'smooth' | 'none' = 'none'

/**
 * Ambient darkness outside torch light. Keep this below 1 so the cave remains
 * visible even where no torch reaches.
 */
export const CAVE_AMBIENT_DARKNESS = 0.8 as const

/** Soft torch-light reach in screen pixels. Tune this to change the lit area. */
export const TORCH_LIGHT_RADIUS = 56 as const

/** Maximum amount of ambient darkness removed at the centre of a torch. */
export const TORCH_LIGHT_INTENSITY = 0.95 as const

/**
 * Organic torch pulse — two incommensurate sine waves (per-torch phase) make the
 * flame light breathe without ever exactly repeating, while staying a pure
 * function of time (deterministic, testable). Fractions of the base values:
 * radius swings ±TORCH_PULSE_RADIUS, intensity dips up to 2×TORCH_PULSE_INTENSITY.
 */
export const TORCH_PULSE_RADIUS = 0.6 as const
export const TORCH_PULSE_INTENSITY = 0.09 as const

/**
 * Tempo of the torch pulse — multiplies both sine frequencies, so the flicker
 * character stays identical, only faster/slower. 1 = the original tempo
 * (periods ≈ 480 ms + 1340 ms), 0.5 = half speed (calm embers), 2 = frantic.
 */
export const TORCH_PULSE_SPEED = 0.6 as const

/**
 * Posterise the torch/moon light falloff into N hard concentric rings instead of
 * a continuous gradient — banding reads 8-bit/arcade, smooth reads modern.
 *  - 0     — smooth gradient (modern, the current look)
 *  - 3–6   — visible rings (posterized, retro; 4 is a good start)
 *  - 8+    — approaches smooth again
 */
export const TORCH_LIGHT_BANDS = 0 as const

/**
 * Parallax dungeon backdrop (`world/background.ts`) — the distant brick wall
 * behind the playfield. Pure visual; rebuilt once per level, so changes here
 * cost nothing per frame.
 */
/** Ink for the backdrop bricks (mortar stays black — the cave shows through). */
export const BG_BRICK_INK: SpectrumColor = C.BLUE
/** Ink for wall decorations (chains, skulls). */
export const BG_DECO_INK: SpectrumColor = C.WHITE
/** Fraction of camera movement the backdrop scrolls at (0 = static, 1 = locked). */
export const BG_PARALLAX = 0.5 as const
/** Fraction of backdrop cells that get a decoration. */
export const BG_DECO_DENSITY = 0.04 as const
/**
 * Worn-brick grit: fraction of backdrop pixels knocked out to black, so the
 * bricks read broken/eroded without redrawing the sprites. 0 = clean wall,
 * ~0.33 ≈ "every third pixel gone". Deterministic — the same wall every run.
 */
export const BG_GRIT = 0.25 as const

/**
 * Platformer physics in pixel/millisecond units (frame-rate independent —
 * everything is multiplied by `dt` in ms). The jump is a Jump-King **charge-jump**:
 * hold Space to charge while rooted, release to leap (height = charge time, see
 * {@link chargeVelocity}). Ground running stays snappy; there is **no mid-air
 * steering** — the arc commits at launch.
 */
export const physics = {
  /** Rising-gravity (px/ms²). */
  gravity: 0.0017,
  /** Heavier gravity while falling — steeper descent, like a thrown arc. */
  fallGravity: 0.0030,
  /** Max horizontal RUN speed on the ground (px/ms ≈ 120 px/s). */
  maxSpeed: 0.12,
  /** Horizontal acceleration toward run speed while grounded (px/ms²). */
  accelGround: 0.0015,
  /** Ground friction when no direction is held (px/ms²). */
  frictionGround: 0.0024,
  /** Ladder hop-off velocity (px/ms, − = up) — a fixed small hop off a rung. */
  jumpVelocity: -0.40,
  /** Terminal fall speed clamp (px/ms). */
  maxFallSpeed: 0.7,
  /** Grace window to still start a charge just after stepping off a ledge (ms). */
  coyoteMs: 200,
  /** Ladder climb speed (px/ms). */
  climbSpeed: 0.06,
  /** Crouch crawl speed (px/ms) — slow and deliberate; you can't jump from a crouch. */
  crouchSpeed: 0.05,

  // ── Charge-jump (hold Space → leap). Tune these four by feel. ───────────────
  /** Launch velocity from a bare TAP (px/ms, − = up). Apex ≈ 1.5 tiles — clears one
   *  ledge, not two. */
  chargeMinVel: -0.22,
  /** Asymptotic launch velocity from an endless hold (px/ms). Apex ≈ 8 tiles —
   *  deliberately higher than the ~5–6 tile target gaps, so over-charging OVERSHOOTS
   *  (the right charge sits mid-curve → timing matters). No hard cap; the curve only
   *  approaches this. */
  chargeMaxVel: -0.47,
  /** Charge time constant (ms): velocity covers ~63% of the min→max range per TAU,
   *  ~95% by 3×TAU. Bigger = slower, more deliberate charge. */
  chargeTauMs: 260,
  /** Fixed forward horizontal speed imparted at launch (px/ms) — every hop travels
   *  forward (facing dir); longer charges fly farther (more airtime). */
  hopSpeed: 0.11,
} as const

/**
 * Charge → launch velocity (px/ms, − = up). Holding longer falls toward
 * {@link physics.chargeMaxVel} with **diminishing returns** (exponential approach)
 * and **no hard cap** — so over-charging a short gap overshoots it (Jump King). A
 * bare tap (`chargeMs ≈ 0`) yields {@link physics.chargeMinVel}.
 */
export function chargeVelocity(chargeMs: number): number {
  const t = 1 - Math.exp(-Math.max(0, chargeMs) / physics.chargeTauMs)
  return physics.chargeMinVel + (physics.chargeMaxVel - physics.chargeMinVel) * t
}

/**
 * Jump envelope, derived once from {@link physics} — the single source of truth
 * the level and its reachability linter (`tests/level.tests.ts`) measure platform
 * spacing against. With the charge-jump this is the **full-charge** reach (apex at
 * `chargeMaxVel`): if the strongest charge can reach a platform, some charge can.
 * Retune the charge and the reachable spacing follows automatically; no magic numbers.
 *
 *  - `JUMP_APEX_PX`  — peak rise of a full-charge jump (`v² / 2g`).
 *  - `JUMP_REACH_PX` — horizontal distance on the way up at launch hop-speed
 *    (conservative: rise time × hopSpeed).
 */
export const JUMP_APEX_PX = (physics.chargeMaxVel ** 2) / (2 * physics.gravity)
export const JUMP_REACH_PX = physics.hopSpeed * (Math.abs(physics.chargeMaxVel) / physics.gravity)

/**
 * Sprite animation cadence (ms per frame) — distinct from the MOVEMENT physics
 * above, which stays snappy for responsive control. The walk/idle frame rate is
 * eased a touch from a frantic arcade run so the rabbit reads as a calmer, more
 * deliberate cave creature. Dial these up for slower, dreamier; down for peppier.
 */
/** One beat of the 3-beat walk gait (A → B → C → B). */
export const ANIM_WALK_MS = 170 as const
/** One breath of the two-frame idle. */
export const ANIM_IDLE_MS = 760 as const

/** Ink for the rabbit's silhouette in the authentic-clash view (`C` → clash): one
 *  flat colour so the rabbit doesn't clash with itself. Pick any palette colour;
 *  bright cyan keeps the cute identity and pops on the cave. */
export const CLASH_RABBIT_INK: SpectrumColor = C.CYAN

/**
 * Theme — every playfield ink in one place (fake biomes by editing values).
 * Always palette colours (`C.*`), never raw hex. When B14 brings runtime biome
 * switching these constants get wrapped into per-biome themes — not before.
 */
/** Tiles (paper stays black everywhere — the cave shows through). */
export const THEME_STONE_INK: SpectrumColor = C.WHITE
export const THEME_MOSS_INK: SpectrumColor = C.B_GREEN
export const THEME_CRUMBLE_INK: SpectrumColor = C.B_YELLOW
export const THEME_OVERHANG_INK: SpectrumColor = C.B_CYAN
export const THEME_LADDER_INK: SpectrumColor = C.B_GREEN
/** Enemies. */
export const THEME_SPIDER_INK: SpectrumColor = C.WHITE
export const THEME_BAT_INK: SpectrumColor = C.B_MAGENTA
export const THEME_MOUSE_INK: SpectrumColor = C.WHITE
/** Carrots: the pickup and the thrown spark. */
export const THEME_CARROT_INK: SpectrumColor = C.B_YELLOW
export const THEME_CARROT_SHOT_INK: SpectrumColor = C.B_YELLOW
/** Torches: wall bracket + the fire particle colours. */
export const THEME_TORCH_BRACKET_INK: SpectrumColor = C.WHITE
export const THEME_FLAME_INKS: readonly SpectrumColor[] = [C.B_YELLOW, C.B_RED, C.B_WHITE]
/** Rabbit sprite layers (full-colour view; the clash view uses CLASH_RABBIT_INK). */
export const THEME_RABBIT_BODY_INK: SpectrumColor = C.WHITE
export const THEME_RABBIT_BELLY_INK: SpectrumColor = C.MAGENTA
export const THEME_RABBIT_ACCENT_INK: SpectrumColor = C.MAGENTA
export const THEME_RABBIT_EYE_INK: SpectrumColor = C.BLACK

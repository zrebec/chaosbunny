/**
 * Compiled sprite atlas: turns the text art in {@link "./sprites" | sprites.ts}
 * into render-ready monochrome {@link Bitmap}s and pre-computed pixel masks.
 *
 * 0.1.0 started monochrome-first, but the rabbit is now layered: one union mask
 * drives collision, while body/belly/ear/eye layers render in separate inks.
 * The carrot spark's 4 real pixels (not its 8×8 byte-aligned box) still decide
 * collision because every mask comes from normalized source rows.
 */
import { createBitmapFromRows, bitmapPixelMask, type Bitmap, type PixelMask } from 'zx-kit'
import { toBitmapRows, toLayerRows, type SpriteRows } from './rowsToMask.js'
import * as S from './sprites.js'

/** A render-ready sprite: bitmap + pre-computed mask + dimensions. */
export interface SpriteAsset {
  readonly bitmap: Bitmap
  readonly mask: PixelMask
  readonly width: number
  readonly height: number
}

/** Named colour layers for the player sprite. */
export interface RabbitAsset extends SpriteAsset {
  readonly layers: {
    readonly body: Bitmap
    readonly belly: Bitmap
    readonly accent: Bitmap
    readonly eye: Bitmap
  }
}

/** Builds a monochrome {@link SpriteAsset} from authored text rows. */
export function buildAsset(rows: SpriteRows): SpriteAsset {
  const bitmap = createBitmapFromRows(toBitmapRows(rows))
  const mask = bitmapPixelMask(bitmap)
  return { bitmap, mask, width: bitmap.width, height: bitmap.height }
}

/** Builds a layered rabbit asset while keeping the union mask for collisions. */
export function buildRabbitAsset(rows: SpriteRows): RabbitAsset {
  const base = buildAsset(rows)
  return {
    ...base,
    layers: {
      body: createBitmapFromRows(toLayerRows(rows, 'BX')),
      belly: createBitmapFromRows(toLayerRows(rows, 'W')),
      accent: createBitmapFromRows(toLayerRows(rows, 'P')),
      eye: createBitmapFromRows(toLayerRows(rows, 'K')),
    },
  }
}

export const atlas = {
  // player
  rabbitSideIdleA: buildRabbitAsset(S.RABBIT_SIDE_IDLE_A),
  rabbitSideIdleB: buildRabbitAsset(S.RABBIT_SIDE_IDLE_B),
  rabbitWalkA: buildRabbitAsset(S.RABBIT_WALK_A),
  rabbitWalkB: buildRabbitAsset(S.RABBIT_WALK_B),
  rabbitWalkC: buildRabbitAsset(S.RABBIT_WALK_C),
  rabbitJump: buildRabbitAsset(S.RABBIT_JUMP),
  rabbitCrouch: buildRabbitAsset(S.RABBIT_CROUCH),
  rabbitShoot: buildRabbitAsset(S.RABBIT_SHOOT),
  rabbitFrontIdle: buildAsset(S.RABBIT_FRONT_IDLE),

  // projectile & pickup
  carrotShot: buildAsset(S.CARROT_SHOT),
  carrotPickup: buildAsset(S.CARROT_PICKUP),

  // enemies
  spiderDescend: buildAsset(S.SPIDER_DESCEND),
  spiderCurled: buildAsset(S.SPIDER_CURLED),
  batEnemy: buildAsset(S.BAT_ENEMY),

  // tiles
  caveStoneTile: buildAsset(S.CAVE_STONE_TILE),
  mossPlatformTile: buildAsset(S.MOSS_PLATFORM_TILE),
  oneWayPlatformTile: buildAsset(S.ONE_WAY_PLATFORM_TILE),
  ladderTile: buildAsset(S.LADDER_TILE),
  crumbleTile: buildAsset(S.CRUMBLE_TILE),
} as const

export type AtlasKey = keyof typeof atlas

/**
 * Compiled sprite atlas: turns the text art in {@link "./sprites" | sprites.ts}
 * into render-ready monochrome {@link Bitmap}s and pre-computed pixel masks.
 *
 * 0.1.0 is monochrome-first (one ink per sprite). The mask is derived from the
 * same normalized rows, so it ignores transparent padding entirely — that is
 * what makes the carrot spark's 4 real pixels (not its 8×8 byte-aligned box)
 * the thing that collides. Adding colour layers later will not change the mask.
 */
import { createBitmapFromRows, bitmapPixelMask, type Bitmap, type PixelMask } from 'zx-kit'
import { toBitmapRows, type SpriteRows } from './rowsToMask.js'
import * as S from './sprites.js'

/** A render-ready sprite: bitmap + pre-computed mask + dimensions. */
export interface SpriteAsset {
  readonly bitmap: Bitmap
  readonly mask: PixelMask
  readonly width: number
  readonly height: number
}

/** Builds a monochrome {@link SpriteAsset} from authored text rows. */
export function buildAsset(rows: SpriteRows): SpriteAsset {
  const bitmap = createBitmapFromRows(toBitmapRows(rows))
  const mask = bitmapPixelMask(bitmap)
  return { bitmap, mask, width: bitmap.width, height: bitmap.height }
}

export const atlas = {
  // player
  rabbitSideIdleA: buildAsset(S.RABBIT_SIDE_IDLE_A),
  rabbitSideIdleB: buildAsset(S.RABBIT_SIDE_IDLE_B),
  rabbitWalkA: buildAsset(S.RABBIT_WALK_A),
  rabbitWalkB: buildAsset(S.RABBIT_WALK_B),
  rabbitJump: buildAsset(S.RABBIT_JUMP),
  rabbitCrouch: buildAsset(S.RABBIT_CROUCH),
  rabbitShoot: buildAsset(S.RABBIT_SHOOT),
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
} as const

export type AtlasKey = keyof typeof atlas

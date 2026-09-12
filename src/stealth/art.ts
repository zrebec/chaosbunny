/**
 * The prototype's art, loaded from the zx-art JSON copied into `src/art/zx/`
 * (zx-art is the source of truth — copy again after changing it there).
 *
 * A grid and its legend become one 1-bit bitmap per colour, drawn in order — the
 * same layering the platformer's rabbit uses, and the same way a Spectrum game
 * would overlay sprites. Validation is strict and happens at load, so a bad asset
 * fails at start-up with its name, not as a wrong pixel in the middle of a room.
 * The format and the colour-name table follow Ice Haul's `render/sprites/catalog.ts`.
 */
import { C, createBitmapFromRows, drawBitmap, mirrorBitmap, type Bitmap, type SpectrumColor } from 'zx-kit'
import { CARROT_PICKUP } from '../art/sprites.js'
import batFlyJson from '../art/zx/bat-td-fly.json'
import batRoostJson from '../art/zx/bat-td-roost.json'
import foxDownJson from '../art/zx/fox-td-down.json'
import foxSideJson from '../art/zx/fox-td-side.json'
import foxUpJson from '../art/zx/fox-td-up.json'
import randyDownJson from '../art/zx/randy-td-ears-down.json'
import randyUpJson from '../art/zx/randy-td-ears-up.json'
import roomKitJson from '../art/zx/room-kit.json'
import { THEME_CARROT_INK } from '../config.js'

export const ZX_COLOR_BY_NAME: Readonly<Record<string, SpectrumColor>> = {
  'C.BLACK': C.BLACK,
  'C.BLUE': C.BLUE,
  'C.RED': C.RED,
  'C.MAGENTA': C.MAGENTA,
  'C.GREEN': C.GREEN,
  'C.CYAN': C.CYAN,
  'C.YELLOW': C.YELLOW,
  'C.WHITE': C.WHITE,
  'C.B_BLACK': C.B_BLACK,
  'C.B_BLUE': C.B_BLUE,
  'C.B_RED': C.B_RED,
  'C.B_MAGENTA': C.B_MAGENTA,
  'C.B_GREEN': C.B_GREEN,
  'C.B_CYAN': C.B_CYAN,
  'C.B_YELLOW': C.B_YELLOW,
  'C.B_WHITE': C.B_WHITE,
}

/** A multi-colour picture as one bitmap per colour, bottom layer first. */
export interface Layered {
  readonly w: number
  readonly h: number
  readonly layers: ReadonlyArray<{ readonly bitmap: Bitmap; readonly ink: SpectrumColor }>
}

/** Builds a {@link Layered} from a text grid; throws naming `where` on any fault. */
export function layered(rows: readonly string[], legend: Readonly<Record<string, SpectrumColor>>, where: string): Layered {
  const h = rows.length
  const w = rows[0]?.length ?? 0
  if (h === 0 || w === 0 || w % 8 !== 0) throw new Error(`${where}: ${w}x${h} — width must be a positive multiple of 8`)
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${where}: row ${y} is ${row.length} wide, expected ${w}`)
    ;[...row].forEach((ch, x) => {
      if (ch !== '.' && !(ch in legend)) throw new Error(`${where}: (${x},${y}) '${ch}' is not in the legend`)
    })
  })
  const layers = Object.entries(legend)
    .filter(([symbol]) => rows.some((row) => row.includes(symbol)))
    .map(([symbol, ink]) => ({
      bitmap: createBitmapFromRows(rows.map((row) => [...row].map((ch) => (ch === symbol ? 'X' : '.')).join(''))),
      ink,
    }))
  return { w, h, layers }
}

function colours(legend: Readonly<Record<string, string>>, where: string): Record<string, SpectrumColor> {
  return Object.fromEntries(
    Object.entries(legend).map(([symbol, name]) => {
      const ink = ZX_COLOR_BY_NAME[name]
      if (!ink) throw new Error(`${where}: legend '${symbol}' names ${name}, not a zx-kit colour`)
      return [symbol, ink]
    }),
  )
}

interface ZxSpriteJson {
  readonly w: number
  readonly h: number
  readonly rows: readonly string[]
  readonly legend: Readonly<Record<string, string>>
}

function sprite(json: ZxSpriteJson, where: string): Layered {
  const art = layered(json.rows, colours(json.legend, where), where)
  if (art.w !== json.w || art.h !== json.h) throw new Error(`${where}: declared ${json.w}x${json.h}, grid is ${art.w}x${art.h}`)
  return art
}

export function mirrored(art: Layered): Layered {
  return { ...art, layers: art.layers.map((l) => ({ ...l, bitmap: mirrorBitmap(l.bitmap) })) }
}

export function drawLayered(ctx: CanvasRenderingContext2D, art: Layered, x: number, y: number): void {
  for (const l of art.layers) drawBitmap(ctx, l.bitmap, Math.round(x), Math.round(y), l.ink)
}

export type TileArt =
  | 'floor' | 'floor-shadow' | 'wall-top' | 'wall-face' | 'crate' | 'door' | 'lamp-on' | 'lamp-off' | 'board'
  | 'lever' | 'grate-shut' | 'grate-open'

function tileset(json: { tile: number; legend: Record<string, string>; tiles: Record<string, string[]> }): Record<TileArt, Layered> {
  const legend = colours(json.legend, 'room-kit')
  const need: TileArt[] = [
    'floor', 'floor-shadow', 'wall-top', 'wall-face', 'crate', 'door', 'lamp-on', 'lamp-off', 'board',
    'lever', 'grate-shut', 'grate-open',
  ]
  return Object.fromEntries(
    need.map((name) => {
      const rows = json.tiles[name]
      if (!rows) throw new Error(`room-kit: no tile '${name}'`)
      const art = layered(rows, legend, `room-kit/${name}`)
      if (art.w !== json.tile || art.h !== json.tile) throw new Error(`room-kit/${name}: not ${json.tile}x${json.tile}`)
      return [name, art]
    }),
  ) as Record<TileArt, Layered>
}

export const TILES = tileset(roomKitJson)

const foxSide = sprite(foxSideJson, 'fox-td-side')

export const SPRITES = {
  randyEarsUp: sprite(randyUpJson, 'randy-td-ears-up'),
  randyEarsDown: sprite(randyDownJson, 'randy-td-ears-down'),
  fox: {
    down: sprite(foxDownJson, 'fox-td-down'),
    up: sprite(foxUpJson, 'fox-td-up'),
    right: foxSide,
    left: mirrored(foxSide),
  },
  carrot: layered(CARROT_PICKUP, { G: C.B_GREEN, C: THEME_CARROT_INK }, 'carrot'),
  bat: {
    roost: sprite(batRoostJson, 'bat-td-roost'),
    fly: sprite(batFlyJson, 'bat-td-fly'),
  },
} as const

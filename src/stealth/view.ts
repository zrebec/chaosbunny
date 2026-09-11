/**
 * Draws a room of the prototype: 256×176 of play (16×11 tiles of 16×16 px) and a
 * two-row HUD underneath, on the 256×192 screen.
 *
 * What the player is told, and when — this is the stealth contract made visible:
 * - **Ears up**: every fox's cone is dotted on the floor, and its next two steps
 *   are marked. Randy can plan.
 * - **Ears down**: none of that. Only the foxes themselves, and their `?`.
 * - `?` over a fox: it saw Randy last beat and is standing still. `!`: caught.
 * - A carrot over a fox's head: it is eating, and blind.
 * - `~` over a bat: Randy is close enough for it to hear an ears-up step.
 *
 * Walls are drawn by where they are: a wall with floor below shows its face (3⁄4
 * view), a wall that touches the room shows its top, a wall deep in rock is black.
 */
import {
  C, createLayerCache, drawChar, drawText, drawTextCentered, refreshLayer, type LayerCache, type SpectrumColor,
} from 'zx-kit'
import { SPRITES, TILES, drawLayered, layered, type Layered } from './art.js'
import { BAT_HEARING } from './bat.js'
import { SNEAK_STEPS, throwTarget, type World } from './beat.js'
import { DIRS, manhattan, sameCell, type Cell } from './grid.js'
import { advanceFox, type Fox } from './patrol.js'
import { tileAt, type Room } from './room.js'
import { visibleCells } from './rules.js'
import type { Strings } from './strings.js'

export const TILE = 16
export const PLAY_W = 256
export const PLAY_H = 176
export const HUD_Y = 176

/** How far the sprites (16×24) rise above the tile they stand on. */
const SPRITE_RISE = 8

/** One beat on screen: the world after it, the world before, and how far the move has got. */
export interface Frame {
  readonly world: World
  readonly prev: World
  /** 0 → 1 across a beat's move animation. */
  readonly t: number
  /** The carrot in flight this beat, if one was thrown. */
  readonly thrown: { readonly from: Cell; readonly to: Cell } | null
  readonly aiming: boolean
  /** The fox that caught Randy, shown with `!`. */
  readonly caughtBy: number | null
  /** The bat that bit Randy, shown with `!`. */
  readonly bittenBy: number | null
  readonly won: boolean
  /** On the win screen: the room's record after this run, and whether this run set it. */
  readonly record: { readonly best: number; readonly isNew: boolean } | null
  /** A run being played back: no overlay, a banner instead of the key hints. */
  readonly replaying: boolean
  /** On the win screen, whether a record run is kept that B can play. */
  readonly bestRunKept: boolean
}

export interface Scene {
  readonly room: Room
  /** The room's place in the run, from 1 — shown in the HUD. */
  readonly number: number
  readonly roomLayer: LayerCache
  readonly dimLayer: LayerCache
}

// 25% dots: light on the floor where a fox is looking.
const CONE_DOTS = layered(
  Array.from({ length: TILE }, (_, y) => (y % 2 === 0 ? 'X.'.repeat(TILE / 2) : '.'.repeat(TILE))),
  { X: C.B_YELLOW },
  'cone',
)

const NEIGHBOURS: readonly Cell[] = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: dx, y: dy })))

function tileArt(room: Room, x: number, y: number): Layered | null {
  switch (tileAt(room, { x, y })) {
    case 'floor': return TILES.floor
    case 'shadow': return TILES['floor-shadow']
    case 'cover': return TILES.crate
    case 'door': return TILES.door
    case 'wall': {
      if (tileAt(room, { x, y: y + 1 }) !== 'wall') return TILES['wall-face']
      const touchesRoom = NEIGHBOURS.some((d) => tileAt(room, { x: x + d.x, y: y + d.y }) !== 'wall')
      return touchesRoom ? TILES['wall-top'] : null
    }
  }
}

export function createScene(room: Room, number: number): Scene {
  const roomLayer = createLayerCache(PLAY_W, PLAY_H)
  refreshLayer(roomLayer, (ctx) => {
    ctx.fillStyle = C.BLACK
    ctx.fillRect(0, 0, PLAY_W, PLAY_H)
    for (let y = 0; y < room.rows; y++) {
      for (let x = 0; x < room.cols; x++) {
        const art = tileArt(room, x, y)
        if (art) drawLayered(ctx, art, x * TILE, y * TILE)
      }
    }
  })
  // A 50% black checker over the play area — how the room dims when caught or out.
  const dimLayer = createLayerCache(PLAY_W, PLAY_H)
  refreshLayer(dimLayer, (ctx) => {
    ctx.fillStyle = C.BLACK
    for (let y = 0; y < PLAY_H; y++) for (let x = y % 2; x < PLAY_W; x += 2) ctx.fillRect(x, y, 1, 1)
  })
  return { room, number, roomLayer, dimLayer }
}

const ease = (t: number): number => t * t * (3 - 2 * t)

function lerpCell(a: Cell, b: Cell, t: number): { x: number; y: number } {
  const k = ease(Math.min(1, Math.max(0, t)))
  return { x: (a.x + (b.x - a.x) * k) * TILE, y: (a.y + (b.y - a.y) * k) * TILE }
}

function blit(ctx: CanvasRenderingContext2D, layer: LayerCache): void {
  if (layer.canvas) ctx.drawImage(layer.canvas, 0, 0)
}

function mark(ctx: CanvasRenderingContext2D, cell: Cell, size: number, ink: SpectrumColor): void {
  const o = (TILE - size) / 2
  ctx.fillStyle = ink
  ctx.fillRect(cell.x * TILE + o, cell.y * TILE + o, size, size)
}

/** Where a fox will stand after its next two beats, if nothing disturbs it. */
function nextSteps(room: Room, fox: Fox, world: World): Cell[] {
  const one = advanceFox(room, fox, world.items).fox
  const two = advanceFox(room, one, world.items).fox
  return [one.cell, two.cell]
}

function drawIntel(ctx: CanvasRenderingContext2D, room: Room, world: World): void {
  for (const fox of world.foxes) {
    if (fox.mode === 'eat') continue
    for (const s of visibleCells(room, fox.cell, fox.facing, false)) drawLayered(ctx, CONE_DOTS, s.cell.x * TILE, s.cell.y * TILE)
    const [one, two] = nextSteps(room, fox, world)
    if (one && !sameCell(one, fox.cell)) mark(ctx, one, 4, C.B_YELLOW)
    if (two && !sameCell(two, fox.cell) && !(one && sameCell(two, one))) mark(ctx, two, 2, C.B_YELLOW)
  }
}

function drawAim(ctx: CanvasRenderingContext2D, room: Room, world: World): void {
  for (const dir of DIRS) {
    const land = throwTarget(room, world.randy.cell, dir)
    if (!land) continue
    ctx.fillStyle = C.B_WHITE
    const x = land.x * TILE + 4
    const y = land.y * TILE + 4
    ctx.fillRect(x, y, 8, 1)
    ctx.fillRect(x, y + 7, 8, 1)
    ctx.fillRect(x, y, 1, 8)
    ctx.fillRect(x + 7, y, 1, 8)
  }
}

interface Actor {
  readonly y: number
  draw(): void
}

function actors(ctx: CanvasRenderingContext2D, f: Frame): Actor[] {
  const list: Actor[] = []
  const r = lerpCell(f.prev.randy.cell, f.world.randy.cell, f.t)
  const randyArt = f.world.randy.earsDown ? SPRITES.randyEarsDown : SPRITES.randyEarsUp
  list.push({ y: r.y, draw: () => drawLayered(ctx, randyArt, r.x, r.y - SPRITE_RISE) })

  f.world.foxes.forEach((fox, i) => {
    const from = f.prev.foxes[i]?.cell ?? fox.cell
    const p = lerpCell(from, fox.cell, f.t)
    list.push({
      y: p.y,
      draw: () => {
        drawLayered(ctx, SPRITES.fox[fox.facing], p.x, p.y - SPRITE_RISE)
        const headY = p.y - SPRITE_RISE - 8
        if (f.caughtBy === i) drawChar(ctx, '!'.charCodeAt(0), p.x + 4, headY, C.B_RED, C.BLACK)
        else if (fox.mode === 'suspicious') drawChar(ctx, '?'.charCodeAt(0), p.x + 4, headY, C.B_YELLOW, C.BLACK)
        else if (fox.mode === 'eat') drawLayered(ctx, SPRITES.carrot, p.x, headY - 8)
      },
    })
  })
  f.world.bats.forEach((bat, i) => {
    const from = f.prev.bats[i]?.cell ?? bat.cell
    const p = lerpCell(from, bat.cell, f.t)
    const art = bat.mode === 'roost' ? SPRITES.bat.roost : SPRITES.bat.fly
    // Bats hang and fly above the floor: drawn a little higher than they stand, and last among equals.
    list.push({
      y: p.y + 0.5,
      draw: () => {
        drawLayered(ctx, art, p.x, p.y - SPRITE_RISE)
        const headY = p.y - SPRITE_RISE - 8
        if (f.bittenBy === i) drawChar(ctx, '!'.charCodeAt(0), p.x + 4, headY, C.B_RED, C.BLACK)
        else if (bat.mode === 'roost' && manhattan(bat.cell, f.world.randy.cell) <= BAT_HEARING) {
          drawChar(ctx, '~'.charCodeAt(0), p.x + 4, headY, C.B_MAGENTA, C.BLACK)
        }
      },
    })
  })
  return list.sort((a, b) => a.y - b.y)
}

function drawCarrots(ctx: CanvasRenderingContext2D, f: Frame): void {
  const inFlight = f.thrown && f.t < 1 ? f.thrown : null
  for (const c of f.world.items) {
    if (inFlight && sameCell(c, inFlight.to)) continue
    drawLayered(ctx, SPRITES.carrot, c.x * TILE, c.y * TILE)
  }
  if (inFlight) {
    const p = lerpCell(inFlight.from, inFlight.to, f.t)
    const arc = Math.sin(Math.PI * Math.min(1, f.t)) * 10
    drawLayered(ctx, SPRITES.carrot, p.x, p.y - arc)
  }
}

/**
 * The dribble: with the ears down, one pip per step Randy may still take — full
 * while he can creep, hollow once spent. Hidden with the ears up (nothing to count).
 */
function drawSneakPips(ctx: CanvasRenderingContext2D, x: number, sneakLeft: number): void {
  for (let i = 0; i < SNEAK_STEPS; i++) {
    const px = x + i * 7
    const py = HUD_Y + 2
    if (i < sneakLeft) {
      ctx.fillStyle = C.B_CYAN
      ctx.fillRect(px, py, 5, 5)
    } else {
      ctx.fillStyle = C.CYAN
      ctx.fillRect(px, py, 5, 1)
      ctx.fillRect(px, py + 4, 5, 1)
      ctx.fillRect(px, py, 1, 5)
      ctx.fillRect(px + 4, py, 1, 5)
    }
  }
}

function drawHud(ctx: CanvasRenderingContext2D, scene: Scene, f: Frame, str: Strings): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, HUD_Y, PLAY_W, 192 - HUD_Y)
  const r = f.world.randy
  const ears = r.earsDown ? str.earsDown : str.earsUp
  drawText(ctx, ears, 0, HUD_Y, r.earsDown ? C.CYAN : C.B_CYAN)
  if (r.earsDown) drawSneakPips(ctx, ears.length * 8 + 3, r.sneakLeft)
  drawText(ctx, str.carrots(r.carrots), 96, HUD_Y, r.carrots > 0 ? C.B_YELLOW : C.YELLOW)
  const right = `${str.room(scene.number)} ${str.beats(f.world.beats)}`
  drawText(ctx, right, PLAY_W - right.length * 8, HUD_Y, C.WHITE)
  if (f.replaying) drawText(ctx, str.replaying, 0, HUD_Y + 8, C.B_YELLOW)
  else drawText(ctx, f.aiming ? str.aimHints : str.hints, 0, HUD_Y + 8, f.aiming ? C.B_WHITE : C.WHITE)
}

export function render(ctx: CanvasRenderingContext2D, scene: Scene, f: Frame, str: Strings): void {
  blit(ctx, scene.roomLayer)
  const settled = f.t >= 1
  const over = f.caughtBy !== null || f.bittenBy !== null
  if (settled && !f.world.randy.earsDown && !over && !f.won) drawIntel(ctx, scene.room, f.world)
  drawCarrots(ctx, f)
  for (const a of actors(ctx, f)) a.draw()
  if (settled && f.aiming) drawAim(ctx, scene.room, f.world)
  if (over) {
    blit(ctx, scene.dimLayer)
    drawTextCentered(ctx, str.caught, 80, 32, C.B_RED, C.BLACK)
  }
  if (f.won) {
    blit(ctx, scene.dimLayer)
    drawTextCentered(ctx, str.won, 56, 32, C.B_GREEN, C.BLACK)
    drawTextCentered(ctx, str.wonBeats(f.world.beats), 72, 32, C.B_WHITE, C.BLACK)
    const par = scene.room.par
    if (par !== null) {
      const onPar = f.world.beats <= par
      drawTextCentered(ctx, onPar ? str.onPar : str.par(par), 88, 32, onPar ? C.B_YELLOW : C.WHITE, C.BLACK)
    }
    if (f.record) {
      const text = f.record.isNew ? str.newRecord : str.record(f.record.best)
      drawTextCentered(ctx, text, 104, 32, f.record.isNew ? C.B_CYAN : C.WHITE, C.BLACK)
    }
    drawTextCentered(ctx, str.replayHint(f.bestRunKept), 120, 32, C.B_WHITE, C.BLACK)
    drawTextCentered(ctx, str.again, 136, 32, C.WHITE, C.BLACK)
  }
  drawHud(ctx, scene, f, str)
}

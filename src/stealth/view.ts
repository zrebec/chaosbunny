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
 * - `+n` beside the carrot count: that many are still lying in the room somewhere.
 * - `~` over a bat: Randy is close enough for it to hear an ears-up step.
 * - `^ v < >` over a sentry, ears up: the way it will look next beat.
 * - **A lit shadow is drawn as plain floor** — because that is what it is worth
 *   while the lamp burns. Put the lamp out and those cells go dark in front of you:
 *   the room itself tells you what the carrot bought.
 *
 * Walls are drawn by where they are: a wall with floor below shows its face (3⁄4
 * view), a wall that touches the room shows its top, a wall deep in rock is black.
 */
import {
  C, createGlowLayer, createLayerCache, drawChar, drawGlowSource, drawText, drawTextCentered, invalidateLayer,
  refreshLayer, renderGlow, type GlowLayer, type LayerCache, type SpectrumColor,
} from 'zx-kit'
import { SPRITES, TILES, drawLayered, layered, type Layered } from './art.js'
import { BAT_HEARING } from './bat.js'
import { SNEAK_STEPS, throwAt, type World } from './beat.js'
import { DIRS, manhattan, sameCell, type Cell, type Dir } from './grid.js'
import { allLampsOn, cellIndex, lampOn, litCells } from './light.js'
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
  /** A line shown over the room for a moment — the room's number, the music going on or off. */
  readonly toast: string | null
  /** Whether there is a beat to take back — the caught screen offers U only then. */
  readonly canUndo: boolean
  /**
   * Under the caught overlay: the verb this room cannot be left without, shown once a
   * player has been caught here often enough to be stuck rather than unlucky
   * (`wants.ts`). Null the rest of the time — advice nobody asked for is noise.
   */
  readonly nudge: string | null
}

export interface Scene {
  readonly room: Room
  /** The room's place in the run, from 1 — shown in the HUD. */
  readonly number: number
  readonly roomLayer: LayerCache
  readonly dimLayer: LayerCache
  /** Only rooms with a lamp carry one; the rest never draw a halo. */
  readonly glowLayer: GlowLayer | null
  /** The lamps the cached room was drawn with; when the world's differ, it is redrawn. */
  lamps: number
  /** The same for the grates: shut or open in the cached picture. */
  pulled: boolean
}

// 25% dots: light on the floor where a fox is looking.
const CONE_DOTS = layered(
  Array.from({ length: TILE }, (_, y) => (y % 2 === 0 ? 'X.'.repeat(TILE / 2) : '.'.repeat(TILE))),
  { X: C.B_YELLOW },
  'cone',
)

const NEIGHBOURS: readonly Cell[] = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: dx, y: dy })))

function tileArt(room: Room, x: number, y: number, lamps: number, lit: ReadonlySet<number>, pulled: boolean): Layered | null {
  const cell = { x, y }
  switch (tileAt(room, cell)) {
    case 'floor': return TILES.floor
    case 'shadow': return lit.has(cellIndex(room, cell)) ? TILES.floor : TILES['floor-shadow']
    case 'cover': return TILES.crate
    case 'door': return TILES.door
    case 'board': return TILES.board
    case 'water': return TILES.water
    case 'lever': return TILES.lever
    case 'grate': return pulled ? TILES['grate-open'] : TILES['grate-shut']
    case 'lamp': {
      const i = room.lamps.findIndex((l) => sameCell(l, cell))
      return lampOn(lamps, i) ? TILES['lamp-on'] : TILES['lamp-off']
    }
    case 'wall': {
      if (tileAt(room, { x, y: y + 1 }) !== 'wall') return TILES['wall-face']
      const touchesRoom = NEIGHBOURS.some((d) => tileAt(room, { x: x + d.x, y: y + d.y }) !== 'wall')
      return touchesRoom ? TILES['wall-top'] : null
    }
  }
}

/** Redraws the cached room for what the world has done to it — once, not per frame. */
function drawRoom(scene: Scene, lamps: number, pulled: boolean): void {
  const { room } = scene
  const lit = litCells(room, lamps)
  scene.lamps = lamps
  scene.pulled = pulled
  invalidateLayer(scene.roomLayer) // the cache only re-runs the draw while it is dirty
  refreshLayer(scene.roomLayer, (ctx) => {
    ctx.fillStyle = C.BLACK
    ctx.fillRect(0, 0, PLAY_W, PLAY_H)
    for (let y = 0; y < room.rows; y++) {
      for (let x = 0; x < room.cols; x++) {
        const art = tileArt(room, x, y, lamps, lit, pulled)
        if (art) drawLayered(ctx, art, x * TILE, y * TILE)
      }
    }
  })
}

/**
 * The 50% checker is the same picture in every room, so every room shares one — with
 * sixteen of them, sixteen private copies were sixteen canvases doing one canvas's work.
 */
let sharedDim: LayerCache | null = null

function dimLayer(): LayerCache {
  if (!sharedDim) {
    sharedDim = createLayerCache(PLAY_W, PLAY_H)
    refreshLayer(sharedDim, (ctx) => {
      ctx.fillStyle = C.BLACK
      for (let y = 0; y < PLAY_H; y++) for (let x = y % 2; x < PLAY_W; x += 2) ctx.fillRect(x, y, 1, 1)
    })
  }
  return sharedDim
}

export function createScene(room: Room, number: number): Scene {
  const roomLayer = createLayerCache(PLAY_W, PLAY_H)
  // The bloom is emissive only — nothing else in the room is drawn into it, so a room
  // without lamps does not need one at all (zx-kit's glow, the additive twin of lighting).
  const glowLayer = room.lamps.length > 0 ? createGlowLayer(PLAY_W, PLAY_H, { downscale: 4, alpha: 0.55 }) : null
  const scene: Scene = {
    room, number, roomLayer, dimLayer: dimLayer(), glowLayer, lamps: allLampsOn(room), pulled: false,
  }
  drawRoom(scene, scene.lamps, false)
  return scene
}

/** The halo of every burning lamp, added over the finished room. */
function drawGlow(ctx: CanvasRenderingContext2D, scene: Scene, world: World): void {
  const { room, glowLayer } = scene
  if (!glowLayer || !room.lamps.some((_, i) => lampOn(world.lamps, i))) return
  renderGlow(glowLayer, ctx, (g) => {
    room.lamps.forEach((lamp, i) => {
      if (!lampOn(world.lamps, i)) return
      drawGlowSource(g, { x: lamp.x * TILE + TILE / 2, y: lamp.y * TILE + 5, radius: 30, color: C.B_YELLOW, intensity: 0.9 })
    })
  })
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

const TURN_CHAR: Readonly<Record<Dir, string>> = { up: '^', down: 'v', left: '<', right: '>' }

function drawIntel(ctx: CanvasRenderingContext2D, room: Room, world: World): void {
  for (const fox of world.foxes) {
    if (fox.mode === 'eat') continue
    for (const s of visibleCells(room, fox.cell, fox.facing, false)) drawLayered(ctx, CONE_DOTS, s.cell.x * TILE, s.cell.y * TILE)
    const [one, two] = nextSteps(room, fox, world)
    if (one && !sameCell(one, fox.cell)) mark(ctx, one, 4, C.B_YELLOW)
    if (two && !sameCell(two, fox.cell) && !(one && sameCell(two, one))) mark(ctx, two, 2, C.B_YELLOW)
    const next = advanceFox(room, fox, world.items).fox
    if (sameCell(next.cell, fox.cell) && next.facing !== fox.facing) {
      // A sentry about to turn: say which way, so the window can be counted rather than guessed.
      drawChar(ctx, TURN_CHAR[next.facing].charCodeAt(0), fox.cell.x * TILE + 4, fox.cell.y * TILE - TILE, C.B_YELLOW, C.BLACK)
    }
  }
}

function drawAim(ctx: CanvasRenderingContext2D, room: Room, world: World): void {
  for (const dir of DIRS) {
    const shot = throwAt(room, world.randy.cell, dir, world.lamps)
    if (!shot) continue
    const land = shot.at
    // A lamp in range is marked in its own colour: that throw buys the dark, not a distraction.
    ctx.fillStyle = shot.kind === 'lamp' ? C.B_YELLOW : C.B_WHITE
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
  const carrots = str.carrots(r.carrots)
  drawText(ctx, carrots, 96, HUD_Y, r.carrots > 0 ? C.B_YELLOW : C.YELLOW)
  const right = `${str.room(scene.number)} ${str.beats(f.world.beats)}`
  const rightX = PLAY_W - right.length * 8
  drawText(ctx, right, rightX, HUD_Y, C.WHITE)
  // Carrots still lying about, dimly: enough to say one exists, never where it is. A
  // player who cannot see that a room holds a carrot concludes it holds none — which is
  // exactly how one got stuck. Dropped rather than overlapped when the beats run long.
  const loose = f.world.items.length > 0 ? `+${f.world.items.length}` : ''
  const looseX = 96 + carrots.length * 8 + 4
  if (loose && looseX + loose.length * 8 <= rightX) drawText(ctx, loose, looseX, HUD_Y, C.YELLOW)
  if (f.replaying) drawText(ctx, str.replaying, 0, HUD_Y + 8, C.B_YELLOW)
  else drawText(ctx, f.aiming ? str.aimHints : str.hints, 0, HUD_Y + 8, f.aiming ? C.B_WHITE : C.WHITE)
}

export function render(ctx: CanvasRenderingContext2D, scene: Scene, f: Frame, str: Strings): void {
  // A lamp going out, a grate opening: the room itself changed. Redraw the cache then, not every frame.
  if (scene.lamps !== f.world.lamps || scene.pulled !== f.world.pulled) drawRoom(scene, f.world.lamps, f.world.pulled)
  blit(ctx, scene.roomLayer)
  const settled = f.t >= 1
  const over = f.caughtBy !== null || f.bittenBy !== null
  if (settled && !f.world.randy.earsDown && !over && !f.won) drawIntel(ctx, scene.room, f.world)
  drawCarrots(ctx, f)
  for (const a of actors(ctx, f)) a.draw()
  drawGlow(ctx, scene, f.world)
  if (settled && f.aiming) drawAim(ctx, scene.room, f.world)
  if (f.toast) drawTextCentered(ctx, f.toast, 8, 32, C.B_WHITE, C.BLACK)
  if (over) {
    blit(ctx, scene.dimLayer)
    drawTextCentered(ctx, str.caught, 80, 32, C.B_RED, C.BLACK)
    if (f.canUndo) drawTextCentered(ctx, str.caughtHint, 96, 32, C.WHITE, C.BLACK)
    if (f.nudge) drawTextCentered(ctx, f.nudge, 116, 32, C.B_YELLOW, C.BLACK)
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

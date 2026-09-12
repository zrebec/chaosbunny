/**
 * The cellar between rooms: a map of the way out, drawn after every escape.
 *
 * Eleven rooms in a row is a list, not a place. The map turns the run into one
 * cellar — a chain of cells you are working along — and it costs nothing to keep:
 * a room counts as done when it has a record (`records.ts`), which is already saved.
 *
 * Laid out as a serpentine so the chain reads left to right, then back again, the
 * way a corridor would actually wander. Rooms behind you are lit and carry the
 * beats they took; the one you just left blinks; the ones ahead are outlines.
 */
import { C, drawBlinkingText, drawText, drawTextCentered } from 'zx-kit'
import type { Records } from './records.js'
import type { Strings } from './strings.js'
import { PLAY_H, PLAY_W } from './view.js'

/** Rooms across before the chain turns back. */
const COLS = 4
const NODE = 14

export interface MapNode {
  readonly x: number
  readonly y: number
}

/** Where each room sits on the map — pure, so a test can check the chain never overlaps. */
export function mapNodes(count: number): MapNode[] {
  const rows = Math.max(1, Math.ceil(count / COLS))
  const stepX = Math.floor((PLAY_W - 64) / (COLS - 1))
  const stepY = Math.min(40, Math.floor((PLAY_H - 96) / Math.max(1, rows - 1)))
  const top = 56
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / COLS)
    const col = i % COLS
    return { x: 32 + (row % 2 === 0 ? col : COLS - 1 - col) * stepX, y: top + row * stepY }
  })
}

function corridor(ctx: CanvasRenderingContext2D, a: MapNode, b: MapNode, lit: boolean): void {
  ctx.fillStyle = lit ? C.CYAN : C.BLUE
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 4
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    ctx.fillRect(Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t), 2, 2)
  }
}

/**
 * Draws the map. `current` is the room just left (or being played), `records` says
 * which rooms are behind you, and `now` drives the blink.
 */
export function renderCellar(
  ctx: CanvasRenderingContext2D,
  opts: {
    readonly names: readonly string[]
    readonly current: number
    readonly records: Records
    readonly now: number
  },
  str: Strings,
): void {
  const { names, current, records, now } = opts
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, PLAY_W, 192)
  drawTextCentered(ctx, str.cellar, 16, 32, C.B_CYAN, C.BLACK)

  const nodes = mapNodes(names.length)
  for (let i = 0; i + 1 < nodes.length; i++) {
    corridor(ctx, nodes[i]!, nodes[i + 1]!, records[names[i + 1]!] !== undefined || i + 1 === current)
  }

  nodes.forEach((n, i) => {
    const done = records[names[i]!] !== undefined
    const here = i === current
    // The box grows with its number, so a two-digit room is not written over its own wall.
    const label = String(i + 1)
    const w = label.length * 8 + 6
    const x = n.x - w / 2
    const y = n.y - NODE / 2
    ctx.fillStyle = done ? C.B_CYAN : C.BLUE
    if (done) ctx.fillRect(x, y, w, NODE)
    else {
      ctx.fillRect(x, y, w, 1)
      ctx.fillRect(x, y + NODE - 1, w, 1)
      ctx.fillRect(x, y, 1, NODE)
      ctx.fillRect(x + w - 1, y, 1, NODE)
    }
    // The number sits in the box, dark on light where the room is behind you.
    drawText(ctx, label, n.x - label.length * 4, n.y - 4, done ? C.BLACK : C.WHITE, done ? C.B_CYAN : C.BLACK)
    if (done) {
      const beats = String(records[names[i]!])
      drawText(ctx, beats, n.x - beats.length * 4, n.y + NODE / 2 + 2, C.CYAN, C.BLACK)
    }
    if (here) drawBlinkingText(ctx, '', n.x - 4, n.y - NODE / 2 - 10, now, C.B_YELLOW, C.BLACK)
  })

  drawTextCentered(ctx, str.cellarHint, 168, 32, C.WHITE, C.BLACK)
}

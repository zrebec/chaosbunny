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
 *
 * It is also how a room is chosen: the arrows walk the chain and the marked room is
 * the one that opens. Coming off a win, the next room is already marked, so carrying
 * on is still a single key.
 *
 * A room stays shut until the one before it is escaped (`score.ts` `isUnlocked`), and
 * its box is drawn dark. Beside every escaped room sits its medal — one glyph, because
 * the number under it is what nobody remembers — and the title line carries the whole
 * cellar's points.
 */
import { C, drawBlinkingText, drawText, drawTextCentered, type SpectrumColor } from 'zx-kit'
import type { Records, Stats } from './records.js'
import type { Room } from './room.js'
import { cellarScore, isUnlocked, recordScore, roomMedal, type Medal } from './score.js'
import { roomLabel, type Strings } from './strings.js'
import { PLAY_H, PLAY_W } from './view.js'

/** Rooms across before the chain turns back. */
const COLS = 4
const NODE = 14

/**
 * A medal as one ROM glyph and its ink. `done` has none: a lit box already says escaped,
 * and a third mark would make the two that are worth chasing harder to pick out.
 */
export const MEDAL_GLYPH: Readonly<Record<Medal, { readonly char: string; readonly ink: SpectrumColor } | null>> = {
  par: { char: '*', ink: C.B_YELLOW },
  near: { char: '+', ink: C.B_WHITE },
  done: null,
}

export interface MapNode {
  readonly x: number
  readonly y: number
}

/** Where each room sits on the map — pure, so a test can check the chain never overlaps. */
export function mapNodes(count: number): MapNode[] {
  const rows = Math.max(1, Math.ceil(count / COLS))
  const stepX = Math.floor((PLAY_W - 64) / (COLS - 1))
  const stepY = Math.min(40, Math.floor((PLAY_H - 96) / Math.max(1, rows - 1)))
  // Below the four lines that describe the marked room, which live at the top.
  const top = 72
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

/** Where the lines about the marked room sit: its name, then two lines of numbers. */
export const MAP_LABEL_Y = 20
export const MAP_STATS_Y = 32
export const MAP_TRIES_Y = 44

/**
 * What the map says about the marked room, above the chain: par, best, points — or
 * which room opens it — and, once it has been tried, the attempts and the catches.
 * Pure, so a test can hold every line to the 32 columns.
 *
 * These used to sit *under* each box, one number a room, and on a cellar of eighteen
 * they ran into the boxes of the row below. One room's numbers at a time, at the top,
 * is both readable and roomier.
 */
export function markedRoomLines(
  rooms: readonly Room[], selected: number, records: Records, stats: Stats, str: Strings,
): Array<{ readonly text: string; readonly ink: SpectrumColor; readonly y: number }> {
  const room = rooms[selected]
  if (!room) return []
  const lines: Array<{ text: string; ink: SpectrumColor; y: number }> = []
  if (!isUnlocked(rooms, records, selected)) {
    lines.push({ text: str.locked(selected), ink: C.BLUE, y: MAP_STATS_Y })
  } else {
    const best = records[room.name]
    const numbers = [
      room.par === null ? '' : str.par(room.par),
      best === undefined ? '' : str.record(best),
      best === undefined ? '' : str.score(recordScore(room, records)),
    ].filter(Boolean).join('  ')
    if (numbers) lines.push({ text: numbers, ink: C.CYAN, y: MAP_STATS_Y })
  }
  const s = stats[room.name]
  if (s && (s.attempts > 0 || s.caught > 0)) {
    lines.push({ text: `${str.attempts(s.attempts)}  ${str.timesCaught(s.caught)}`, ink: C.WHITE, y: MAP_TRIES_Y })
  }
  return lines
}

/**
 * Draws the map. `current` is the room just left (or being played), `records` says
 * which rooms are behind you, and `now` drives the blink.
 */
export function renderCellar(
  ctx: CanvasRenderingContext2D,
  opts: {
    /** The rooms themselves, in the order they are played. */
    readonly rooms: readonly Room[]
    /** The room just left, or being played — it blinks. */
    readonly current: number
    /** The room the arrows are resting on — it is framed, and it is the one that opens. */
    readonly selected: number
    readonly records: Records
    /** Attempts and catches per room (`records.ts`), shown for the marked room. */
    readonly stats: Stats
    /** Every room open for testing (`?dev`): said in the corner, so nobody forgets. */
    readonly dev: boolean
    /** Whether this is the mirrored cellar (`mirror.ts`) — it says so in the title. */
    readonly mirrored: boolean
    readonly now: number
  },
  str: Strings,
): void {
  const { rooms, current, selected, records, stats, dev, mirrored, now } = opts
  const names = rooms.map((r) => r.name)
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, PLAY_W, 192)
  const total = cellarScore(rooms, records)
  const name = mirrored ? str.cellarMirror : str.cellar
  drawTextCentered(ctx, total > 0 ? `${name}  ${str.score(total)}` : name, 8, 32, C.B_CYAN, C.BLACK)
  if (dev) drawText(ctx, str.devMark, PLAY_W - str.devMark.length * 8, 0, C.B_RED, C.BLACK)
  // The marked room, by name: a cellar with names is a place, not a list.
  drawTextCentered(ctx, roomLabel(str, selected), MAP_LABEL_Y, 32, C.WHITE, C.BLACK)
  for (const line of markedRoomLines(rooms, selected, records, stats, str)) {
    drawTextCentered(ctx, line.text, line.y, 32, line.ink, C.BLACK)
  }

  const nodes = mapNodes(names.length)
  for (let i = 0; i + 1 < nodes.length; i++) {
    corridor(ctx, nodes[i]!, nodes[i + 1]!, records[names[i + 1]!] !== undefined || i + 1 === current)
  }

  nodes.forEach((n, i) => {
    const done = records[names[i]!] !== undefined
    const open = isUnlocked(rooms, records, i)
    const here = i === current
    // The box grows with its number, so a two-digit room is not written over its own wall.
    const label = String(i + 1)
    const w = label.length * 8 + 6
    const x = n.x - w / 2
    const y = n.y - NODE / 2
    // Escaped: filled. Open and waiting: a white outline. Shut: blue, the colour of the dark.
    ctx.fillStyle = done ? C.B_CYAN : open ? C.WHITE : C.BLUE
    if (done) ctx.fillRect(x, y, w, NODE)
    else {
      ctx.fillRect(x, y, w, 1)
      ctx.fillRect(x, y + NODE - 1, w, 1)
      ctx.fillRect(x, y, 1, NODE)
      ctx.fillRect(x + w - 1, y, 1, NODE)
    }
    // The number sits in the box, dark on light where the room is behind you.
    const ink = done ? C.BLACK : open ? C.B_WHITE : C.BLUE
    drawText(ctx, label, n.x - label.length * 4, n.y - 4, ink, done ? C.B_CYAN : C.BLACK)
    if (done) {
      // The medal to the right, clear of the cursor frame that sits three pixels out.
      const medal = roomMedal(rooms[i]!, records)
      const glyph = medal ? MEDAL_GLYPH[medal] : null
      if (glyph) drawText(ctx, glyph.char, x + w + 5, n.y - 4, glyph.ink, C.BLACK)
    }
    // Where you are, pointed at from the side: above the box it would touch the name line.
    if (here) drawBlinkingText(ctx, '>', x - 12, n.y - 4, now, C.B_YELLOW, C.BLACK)
    if (i === selected) {
      // A frame a pixel clear of the box, so it reads as a cursor and not as a wall.
      ctx.fillStyle = C.B_YELLOW
      const fx = x - 3
      const fy = y - 3
      const fw = w + 6
      const fh = NODE + 6
      ctx.fillRect(fx, fy, fw, 1)
      ctx.fillRect(fx, fy + fh - 1, fw, 1)
      ctx.fillRect(fx, fy, 1, fh)
      ctx.fillRect(fx + fw - 1, fy, 1, fh)
    }
  })

  drawTextCentered(ctx, str.cellarHint, 176, 32, C.WHITE, C.BLACK)
}

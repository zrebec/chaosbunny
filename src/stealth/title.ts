/**
 * The title: the zx-art loading screen, loaded the way a Spectrum would load it.
 *
 * 1. `prompt` — a black screen and `LOAD ""` with the ROM's flashing cursor.
 * 2. `loading` — after a key: pilot-tone stripes in the page border (the body
 *    behind the canvas plays the Spectrum's border), then the bitmap in memory
 *    order, white on black, then the colours row by row. A key finishes it at once.
 * 3. `ready` — the picture, and a blinking prompt to start.
 * 4. `story` — why Randy is down there, on black, the way a Spectrum game told you
 *    before it let you play. A key from here starts the first room.
 * 5. `ending` — the night air, once the last cellar is behind him, with the beats the
 *    whole climb took if every room has a record.
 * 6. `sound` — the bench: every sound in the game on a key of its own, for tuning by
 *    ear. `S` from the picture, Esc back.
 * 7. `rules` — the ten lines the rooms are built on, for a player who forgot one.
 *    `H` from the picture, Esc back.
 * 8. `controls` — every key, right after the picture; a key from here opens the cellar
 *    map, which is where a room is chosen. The story is kept for the first time room 1
 *    is entered.
 *
 * The screen is a native `.scr` inlined by `scripts/screen-import.mjs` and decoded
 * with zx-kit's `parseSCR`; both finished looks are drawn once to offscreen layers
 * and the reveal only copies rows out of them.
 */
import {
  C, createLayerCache, drawBitmap, drawBitmapAttrs, drawBlinkingText, drawChar, drawText, drawTextCentered,
  parseSCR, refreshLayer, type LayerCache,
} from 'zx-kit'
import type { AYChannel } from 'zx-kit'
import { CHAOSBUNNY_STEALTH_LOADING_SCR } from '../art/zx/chaosbunny-stealth-loading.js'
import { loadStateAt, screenRowOfMemoryRow, type LoadPhase } from './loader.js'
import { channelMix } from './music.js'
import { SOUND_BENCH } from './sound.js'
import type { Strings } from './strings.js'

/**
 * The bench's voice keys, in the order `str.voiceNames` names them. F and G sit
 * together on the row and neither is spoken for: the sounds take the digits, `M` the
 * hum, `J` all the voices back. (H muted the drip until the drip went.)
 */
export const VOICE_KEYS: ReadonlyArray<readonly [key: string, channel: AYChannel]> = [
  ['F', 'A'], ['G', 'C'],
]

export type TitleMode = 'prompt' | 'loading' | 'ready' | 'controls' | 'story' | 'ending' | 'sound' | 'rules'

/** Where the keys screen starts, how far apart its lines sit, and its prompt's row. */
export const CONTROLS_TOP = 32
export const CONTROLS_STEP = 10
export const CONTROLS_PROMPT = 176

/**
 * Where the rules screen starts and how far apart its lines sit, and the row its "back"
 * footer keeps. Named because a rule was added and the last line landed on the footer:
 * `tests/stealth/strings.tests.ts` now does the arithmetic before a player has to.
 */
export const RULES_TOP = 40
export const RULES_STEP = 11
export const RULES_FOOTER = 176

export interface Title {
  /** The bitmap alone, white ink on black paper — what a screen shows before its attributes arrive. */
  readonly mono: LayerCache
  /** The finished picture. */
  readonly colour: LayerCache
}

export function createTitle(): Title {
  const screen = parseSCR(CHAOSBUNNY_STEALTH_LOADING_SCR)
  const mono = createLayerCache(256, 192)
  refreshLayer(mono, (ctx) => {
    ctx.fillStyle = C.BLACK
    ctx.fillRect(0, 0, 256, 192)
    drawBitmap(ctx, screen.bitmap, 0, 0, C.WHITE)
  })
  const colour = createLayerCache(256, 192)
  refreshLayer(colour, (ctx) => drawBitmapAttrs(ctx, screen.bitmap, screen.attrs, 0, 0))
  return { mono, colour }
}

function rows(ctx: CanvasRenderingContext2D, layer: LayerCache, y: number, h: number): void {
  if (layer.canvas) ctx.drawImage(layer.canvas, 0, y, 256, h, 0, y, 256, h)
}

/**
 * What the border says when the room answers. A Spectrum game flashed the border
 * because it was the one thing it could change in a single frame without touching
 * the screen — and this game needs exactly that: a signal that reaches a player who
 * is looking at his own rabbit rather than at the fox.
 */
export type BorderFlash = 'spotted' | 'caught' | 'won'

const FLASH_COLOUR: Readonly<Record<BorderFlash, string>> = {
  spotted: '#CDCD00',
  caught: '#CD0000',
  won: '#00CD00',
}

/** Long enough to register, short enough not to be a light show. */
export const FLASH_MS = 120

/** The border has one owner. A flash wins over the loading stripes while it lasts. */
let flashColour: string | null = null
let flashTimer: ReturnType<typeof setTimeout> | null = null
let loadPhase: LoadPhase | null = null
let phaseNow = 0

function paintBorder(): void {
  if (typeof document === 'undefined') return // headless: the tests import this module
  const style = document.body.style
  if (flashColour) {
    style.background = flashColour
    style.backgroundPosition = ''
  } else if (loadPhase === 'pilot') {
    style.background = 'repeating-linear-gradient(0deg, #CD0000 0 12px, #00CDCD 12px 24px)'
    style.backgroundPosition = `0 ${Math.floor(phaseNow / 8) % 24}px`
  } else if (loadPhase === 'pixels' || loadPhase === 'attrs') {
    style.background = 'repeating-linear-gradient(0deg, #0000CD 0 3px, #CDCD00 3px 5px, #0000CD 5px 9px, #CDCD00 9px 10px)'
    style.backgroundPosition = `0 ${Math.floor(phaseNow / 3) % 10}px`
  } else {
    style.background = ''
    style.backgroundPosition = ''
  }
}

/**
 * The Spectrum border, played by the page behind the canvas: wide red and cyan
 * bands for the pilot tone, thin blue and yellow ones for the data, black otherwise.
 */
export function setBorder(phase: LoadPhase | null, now: number): void {
  loadPhase = phase
  phaseNow = now
  paintBorder()
}

/**
 * One short colour in the border. Paints at once and clears itself, so it works in
 * the play phase — where nothing calls {@link setBorder} every frame — without the
 * game having to carry a border clock of its own.
 */
export function flashBorder(what: BorderFlash, ms = FLASH_MS): void {
  flashColour = FLASH_COLOUR[what]
  paintBorder()
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashTimer = null
    flashColour = null
    paintBorder()
  }, ms)
}

/** Drops a flash still in flight — leaving a room must not carry its colour along. */
export function clearBorderFlash(): void {
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = null
  flashColour = null
  paintBorder()
}

export function renderTitle(
  ctx: CanvasRenderingContext2D, title: Title, mode: TitleMode, loadMs: number, now: number, str: Strings,
  /** Beats for the whole cellar, when every room has a record — shown on the ending. */
  total: number | null = null,
  /** How many rooms the cellar holds, so the tale can count them honestly. */
  rooms = 0,
  /** The pars of every room added up — the number a perfect cellar would take. */
  parTotal = 0,
  /** Every record's points added up (`score.ts`) — shown on the ending with the beats. */
  score = 0,
): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, 256, 192)
  if (mode === 'prompt') {
    drawText(ctx, str.loadCommand, 0, 184, C.WHITE, C.BLACK)
    // The ROM's L cursor: ink and paper swap twice a second.
    const on = Math.floor(now / 320) % 2 === 0
    drawChar(ctx, 'L'.charCodeAt(0), str.loadCommand.length * 8, 184, on ? C.BLACK : C.WHITE, on ? C.WHITE : C.BLACK)
    return
  }
  if (mode === 'loading') {
    const s = loadStateAt(loadMs)
    for (let m = 0; m < s.memoryRows; m++) rows(ctx, title.mono, screenRowOfMemoryRow(m), 1)
    for (let r = 0; r < s.attrRows; r++) rows(ctx, title.colour, r * 8, 8)
    return
  }
  if (mode === 'rules') {
    drawTextCentered(ctx, str.rulesTitle, 16, 32, C.B_CYAN, C.BLACK)
    // Eleven columns a line, not twelve: the twelfth rule arrived and at twelve the last
    // one sat on the ESC footer. `tests/stealth/strings.tests.ts` holds the arithmetic.
    str.rules.forEach((line, i) => drawTextCentered(ctx, line, RULES_TOP + i * RULES_STEP, 32, C.B_WHITE, C.BLACK))
    drawTextCentered(ctx, str.soundHint.split(' - ').at(-1) ?? 'ESC', RULES_FOOTER, 32, C.WHITE, C.BLACK)
    return
  }
  if (mode === 'controls') {
    drawTextCentered(ctx, str.controlsTitle, 16, 32, C.B_CYAN, C.BLACK)
    // Left-aligned in one block, so the key column lines up down the screen.
    const width = Math.max(...str.controls.map((l) => l.length))
    const x = Math.floor((256 - width * 8) / 2)
    str.controls.forEach((line, i) => drawText(ctx, line, x, CONTROLS_TOP + i * CONTROLS_STEP, C.B_WHITE, C.BLACK))
    const px = Math.floor((256 - str.controlsPrompt.length * 8) / 2)
    drawBlinkingText(ctx, str.controlsPrompt, px, CONTROLS_PROMPT, now, C.WHITE, C.BLACK)
    return
  }
  if (mode === 'sound') {
    drawTextCentered(ctx, str.soundTitle, 16, 32, C.B_CYAN, C.BLACK)
    SOUND_BENCH.forEach((sound, i) => {
      const x = i % 2 === 0 ? 16 : 136
      const y = 40 + Math.floor(i / 2) * 16
      drawText(ctx, `${sound.key} ${str.soundNames[i] ?? ''}`, x, y, C.B_WHITE, C.BLACK)
    })
    // The voices of the hum, each on its own key: a muted one is drawn dim, so
    // the row is also the answer to "which of these am I listening to".
    const mix = channelMix()
    VOICE_KEYS.forEach(([key, ch], i) => {
      const on = (mix[ch] ?? 0) > 0
      drawText(ctx, `${key} ${str.voiceNames[i] ?? ''}`, 16 + i * 80, 148, on ? C.B_CYAN : C.BLUE, C.BLACK)
    })
    drawTextCentered(ctx, str.soundHint, 168, 32, C.WHITE, C.BLACK)
    return
  }
  // Two colours and the ROM font: the screens a cassette game gave you at either end.
  if (mode === 'story' || mode === 'ending') {
    const ending = mode === 'ending'
    const lines = ending ? str.ending(rooms) : str.story(rooms)
    drawTextCentered(ctx, ending ? str.endingTitle : str.storyTitle, 24, 32, ending ? C.B_GREEN : C.B_YELLOW, C.BLACK)
    // 14 px a line leaves the prompt its own air, however long the tale runs.
    lines.forEach((line: string, i: number) => drawTextCentered(ctx, line, 56 + i * 14, 32, C.B_WHITE, C.BLACK))
    if (ending && total !== null) {
      const y = 56 + lines.length * 14 + 8
      drawTextCentered(ctx, str.wholeCellar(total), y, 32, C.B_CYAN, C.BLACK)
      // What a perfect cellar would take, so the number above has something to beat.
      if (parTotal > 0) drawTextCentered(ctx, str.par(parTotal), y + 14, 32, total <= parTotal ? C.B_YELLOW : C.CYAN, C.BLACK)
      if (score > 0) drawTextCentered(ctx, str.score(score), y + 28, 32, C.B_WHITE, C.BLACK)
    }
    const sx = Math.floor((256 - str.startPrompt.length * 8) / 2)
    drawBlinkingText(ctx, str.startPrompt, sx, 176, now, C.WHITE, C.BLACK)
    return
  }
  rows(ctx, title.colour, 0, 192)
  const x = Math.floor((256 - str.startPrompt.length * 8) / 2)
  drawBlinkingText(ctx, str.startPrompt, x, 184, now, C.B_WHITE, C.BLACK)
}

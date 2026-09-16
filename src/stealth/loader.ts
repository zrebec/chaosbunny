/**
 * The tape loader, as timing and order only — what is on screen after `ms` of
 * loading. Pure, so the order of the reveal is tested rather than eyeballed.
 *
 * A real Spectrum fills its screen in memory order, not top to bottom: bitmap
 * memory is laid out in three thirds, and inside a third it runs through the
 * first pixel row of all eight character rows before the second — which is why a
 * loading screen arrives in those characteristic venetian-blind bands. The 768
 * attribute bytes come last, so the picture appears in black and white first and
 * is coloured in, one character row at a time, at the very end.
 *
 * The timings are a real load's (owner's call, 2026-09-15 — any key skips it). The ROM
 * saves a 0 bit as two 855 T-state pulses and a 1 bit as two of 1710, so random data
 * averages about 0.73 ms a bit: 6144 bitmap bytes take ~36 s and the 768 attribute
 * bytes ~4.5 s. The pilot is the few seconds of leader tone before the data block.
 *
 * `STEALTH_TAPE_SPEED` divides all three: 1 is a real load, 2 half of one.
 */
import { STEALTH_TAPE_SPEED } from '../config.js'

/** A real load, before the speed is applied. */
export const REAL_PILOT_MS = 5000
export const REAL_PIXELS_MS = 36000
export const REAL_ATTRS_MS = 4500

const speed = Math.max(0.25, Number(STEALTH_TAPE_SPEED) || 1)

/** Pilot tone: stripes, no picture yet. */
export const PILOT_MS = Math.round(REAL_PILOT_MS / speed)
/** The 192 bitmap rows, in memory order — 6144 bytes at the ROM's speed. */
export const PIXELS_MS = Math.round(REAL_PIXELS_MS / speed)
/** The 24 attribute rows — 768 bytes. */
export const ATTRS_MS = Math.round(REAL_ATTRS_MS / speed)
export const LOAD_MS = PILOT_MS + PIXELS_MS + ATTRS_MS

/**
 * The screen row the `m`-th row of bitmap memory paints. Memory row bits are
 * `TT RRR SSS` where the screen's are `TT SSS RRR` (third, character row, pixel
 * row): the two three-bit fields swap, so the mapping is its own inverse.
 */
export function screenRowOfMemoryRow(m: number): number {
  return (m & 0xc0) | ((m & 0x07) << 3) | ((m >> 3) & 0x07)
}

export type LoadPhase = 'pilot' | 'pixels' | 'attrs' | 'done'

export interface LoadState {
  readonly phase: LoadPhase
  /** Bitmap rows loaded so far, in memory order (0..192). */
  readonly memoryRows: number
  /** Attribute rows loaded so far (0..24). */
  readonly attrRows: number
}

/** What has loaded after `ms` milliseconds of tape. */
export function loadStateAt(ms: number): LoadState {
  if (ms < PILOT_MS) return { phase: 'pilot', memoryRows: 0, attrRows: 0 }
  const p = ms - PILOT_MS
  if (p < PIXELS_MS) return { phase: 'pixels', memoryRows: Math.floor((p / PIXELS_MS) * 192), attrRows: 0 }
  const a = p - PIXELS_MS
  if (a < ATTRS_MS) return { phase: 'attrs', memoryRows: 192, attrRows: Math.floor((a / ATTRS_MS) * 24) }
  return { phase: 'done', memoryRows: 192, attrRows: 24 }
}

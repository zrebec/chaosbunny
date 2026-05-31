/**
 * Sprite-authoring helpers: turn the multi-symbol text art from the design docs
 * into byte-aligned, mask-ready pixel rows.
 *
 * The design sprites use colour symbols (P, B, W, C, S, G, Y, K, R, V) and have
 * uneven / non-byte-aligned widths (e.g. the front-facing rabbit is 30 wide with
 * 32-wide trailing rows). zx-kit's `createBitmapFromRows` is strict: every row
 * must be the same width and a multiple of 8, and only `X`/`#`/`.`/space are
 * allowed. These helpers bridge that gap:
 *
 *  - {@link normalizeRows}  — pad every row to the same width, rounded up to a
 *    multiple of 8 (transparent padding never appears in the mask).
 *  - {@link rowsToMaskRows} — collapse every non-`.` symbol to `X` (monochrome
 *    first; colour layering can come later without touching the mask).
 *  - {@link toBitmapRows}   — normalize + maskify in one step, ready for
 *    `createBitmapFromRows`.
 */

export type SpriteRows = readonly string[]

/** Rounds `n` up to the next multiple of 8. */
function ceil8(n: number): number {
  return Math.ceil(n / 8) * 8
}

/**
 * Pads every row on the right with `.` so all rows share one width, rounded up
 * to a multiple of 8. Throws on empty input.
 */
export function normalizeRows(rows: SpriteRows): string[] {
  if (rows.length === 0) {
    throw new Error('normalizeRows: rows must not be empty')
  }
  let maxWidth = 0
  for (const row of rows) maxWidth = Math.max(maxWidth, row.length)
  const width = ceil8(maxWidth)
  return rows.map((row) => row.padEnd(width, '.'))
}

/**
 * Collapses every non-`.` character to `X`, leaving `.` as transparent.
 * Spaces are treated as solid too — only the dot means empty in the design art.
 */
export function rowsToMaskRows(rows: SpriteRows): string[] {
  return rows.map((row) => row.replace(/[^.]/g, 'X'))
}

/**
 * Normalizes then maskifies — the exact rows to hand to `createBitmapFromRows`.
 */
export function toBitmapRows(rows: SpriteRows): string[] {
  return rowsToMaskRows(normalizeRows(rows))
}

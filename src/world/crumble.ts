/**
 * Crumbling platforms (Manic Miner flavour, kept gentle).
 *
 * Stand on a `kind:'crumble'` platform and it collapses a short moment later —
 * its tiles clear, so the rabbit falls through. It then **respawns** after a
 * pause, so the climb is never permanently broken (tension, not cruelty).
 *
 * Implemented over the tilemap: clearing a tile makes it non-solid, so the
 * existing collision handles the fall for free. State + timers live here.
 */
import { CELL, type TileMap, type Tile, type Rect } from 'zx-kit'

const CRUMBLE_MS = 450  // grounded time before it collapses (your window to leave)
const RESPAWN_MS = 2500 // gone time before the platform comes back

interface Crumbler {
  x: number   // left column
  row: number
  w: number
  tile: Tile  // captured for respawn
  state: 'intact' | 'gone'
  timer: number
}

/** Captures the crumble platforms from a freshly-built map (their solid tiles). */
export function makeCrumblers(
  map: TileMap,
  specs: ReadonlyArray<{ x: number; y: number; w: number; kind?: string }>,
): Crumbler[] {
  return specs
    .filter((s) => s.kind === 'crumble')
    .map((s) => ({ x: s.x, row: s.y, w: s.w, tile: map.getTile(s.x, s.y)!, state: 'intact' as const, timer: 0 }))
}

function collapse(cr: Crumbler, map: TileMap): void {
  for (let c = cr.x; c < cr.x + cr.w; c++) map.clearTile(c, cr.row)
  cr.state = 'gone'
  cr.timer = RESPAWN_MS
}

function restore(cr: Crumbler, map: TileMap): void {
  for (let c = cr.x; c < cr.x + cr.w; c++) map.setTile(c, cr.row, cr.tile)
  cr.state = 'intact'
  cr.timer = 0
}

/** Returns true the frame a platform collapses (so the caller can play SFX). */
export function updateCrumblers(crumblers: Crumbler[], map: TileMap, box: Rect, onGround: boolean, dt: number): boolean {
  const feetRow = Math.floor((box.y + box.h) / CELL)
  const c0 = Math.floor(box.x / CELL)
  const c1 = Math.floor((box.x + box.w - 1) / CELL)
  let collapsed = false
  for (const cr of crumblers) {
    if (cr.state === 'gone') {
      cr.timer -= dt
      if (cr.timer <= 0) restore(cr, map)
      continue
    }
    const standing = onGround && feetRow === cr.row && c1 >= cr.x && c0 <= cr.x + cr.w - 1
    if (standing) {
      cr.timer += dt
      if (cr.timer >= CRUMBLE_MS) { collapse(cr, map); collapsed = true }
    } else {
      cr.timer = Math.max(0, cr.timer - dt * 0.5) // recovers if you step off in time
    }
  }
  return collapsed
}

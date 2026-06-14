/**
 * chaosBunny — game loop for the 0.1.0 vertical slice.
 *
 * Cave room (scrolling tilemap) + rabbit + carrot spark + pixel-perfect carrots,
 * spider and bat (every hit/pickup decided by `masksOverlap`, never bounding
 * boxes). Controls: ←/→ or A/D move, Space/W jump, ↑/↓ climb, ↓/S crouch,
 * Z/Ctrl shoot. B (or P / gamepad Start) pauses — freezes everything and shows
 * the key help. L lights, M music mute, N next music, C playfield look;
 * Ctrl+Shift+B toggles the debug overlay.
 */
import {
  setupCanvas,
  drawScanlines,
  drawText,
  drawTextCentered,
  drawSprite,
  drawBitmap,
  flashBorder,
  C,
  CELL,
  SCALE,
  createCamera,
  setCameraTarget,
  tickCamera,
  drawTileMapAt,
  tileMapWorldSize,
  createLayerCache,
  refreshLayer,
  invalidateLayer,
  createMonoScreen,
  clearMonoScreen,
  flushMonoScreen,
  createAttrScreen,
  clearAttrScreen,
  flushAttrScreen,
  initInput,
  consumeDebug,
  consumePause,
  consumeAnyKey,
  rectsOverlap,
  createParticleSystem,
  tickParticles,
  renderParticles,
  type SpectrumColor,
} from 'zx-kit'
import {
  GAME_WIDTH, GAME_HEIGHT, LIGHTING_MODE, FLOOR_TARGET, CLASH_RABBIT_INK,
  SIDEBAR_W, PLAYFIELD_X, PLAYFIELD_W, PLAYFIELD_H, physics,
} from './config.js'
import { buildRoomFromLevel } from './world/room.js'
import { LEVEL } from './world/level.js'
import { HEART } from './art/sprites.js'
import { atlas } from './art/atlas.js'
import { drawDungeonBackground, initBackground } from './world/background.js'
import { initLighting, renderDarkness } from './world/lighting.js'
import { makeMoon, moonLight, renderMoon } from './world/moon.js'
import { makeCrumblers, updateCrumblers } from './world/crumble.js'
import { makeTorches, emitTorchFire, torchLights, renderTorches } from './entities/torch.js'
import {
  createPlayer, updatePlayer, renderPlayer, playerBox, playerMask, damagePlayer, muzzle,
} from './entities/player.js'
import { spawnShot, updateShots, renderShots, type Shot } from './entities/projectile.js'
import { makeCarrots, updateCarrots, renderCarrots } from './entities/pickup.js'
import { makeSpiders, updateSpiders, renderSpiders } from './entities/spider.js'
import { makeBats, updateBats, renderBats } from './entities/bat.js'
import { makeMice, updateMice, renderMice } from './entities/mouse.js'
import { ensureAudio, SFX } from './audio/sfx.js'
import { startMusic, toggleMusic, stopMusic, nextMusicTrack, currentMusicTrackName } from './audio/music.js'
import { drawTiles, ctxPainter, monoPainter, attrPainter, nextViewMode, type ViewMode } from './world/playfield.js'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, SCALE, GAME_WIDTH, GAME_HEIGHT)
canvas.style.width = ''
canvas.style.height = ''

initInput()
// First gesture unlocks audio and kicks off the background music loop.
// (Gated on pause — a key press while paused must not restart the music.)
const unlockAudio = () => { ensureAudio(); if (!paused) startMusic() }
window.addEventListener('keydown', unlockAudio)
window.addEventListener('pointerdown', unlockAudio)

// Pause (B, or zx-kit's P / gamepad Start): freezes the whole game — updates,
// music, particle time, torch pulse — and shows the key help over the scene.
let paused = false
function togglePause(): void {
  if (state !== 'playing') return // result screens have their own "any key" flow
  paused = !paused
  if (paused) stopMusic()
  else startMusic() // respects the M mute flag
}

// Lighting toggle (L): play with the cave lit or dark. Darkness rendering lives
// in zx-kit now; `lightsOn` just gates whether we draw it this frame.
let lightsOn = LIGHTING_MODE !== 'none'
let viewMode: ViewMode = 'bricks' // C cycles the playfield look: bricks → black → mono
window.addEventListener('keydown', (e) => {
  // Plain B only — Ctrl+Shift+B is the debug toggle.
  if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) togglePause()
  if (paused) return // paused means paused: every other toggle waits
  if (e.key === 'l' || e.key === 'L') lightsOn = !lightsOn
  if (e.key === 'm' || e.key === 'M') toggleMusic() // mute / unmute music
  if (e.key === 'n' || e.key === 'N') nextMusicTrack() // next AY loop
  if (e.key === 'c' || e.key === 'C') viewMode = nextViewMode(viewMode) // cycle playfield look
})

// Key help shown while paused (B10) — mirrors the README controls table.
// Single centred lines: the 22-cell playfield is too narrow for two columns.
const PAUSE_HELP: readonly string[] = [
  'ARROWS A D - MOVE',
  'SPACE W - JUMP',
  'UP DOWN - CLIMB',
  'DOWN S - CROUCH',
  'Z CTRL - SHOOT',
  'L - LIGHTS',
  'M - MUSIC ON/OFF',
  'N - NEXT TRACK',
  'C - PLAYFIELD LOOK',
  'B P - PAUSE',
]

let room = buildRoomFromLevel(LEVEL)
const world = tileMapWorldSize(room.map)
initBackground(world.width, world.height)
initLighting()
// The level geometry is static (only crumble platforms mutate it), so cache the
// whole tilemap to an offscreen and blit a camera window each frame — one
// drawImage instead of re-rasterising every visible tile (per-pixel fillRect).
const tileCache = createLayerCache(world.width, world.height)
// The CRT scanline overlay is fully static — pre-render it once at device
// resolution and blit it each frame instead of ~384 `fillRect`s/frame.
const scanlineCache = createLayerCache(canvas.width, canvas.height)
// Clash/mono mode (C key): the whole playfield is drawn into a zx-kit MonoScreen —
// one ink + one paper for everything (the classic ZX anti-clash trick). Colour
// stays in the HUD on top. The default (clash-off) view is untouched full colour.
const mono = createMonoScreen(PLAYFIELD_W, PLAYFIELD_H, C.BLACK, C.B_CYAN)
const paint = ctxPainter(ctx)        // full-colour painter (default view)
const monoPaint = monoPainter(mono)  // monochrome painter (mono view)
// Authentic ZX attribute clash (C → 'clash'): each 8×8 cell snaps to one ink + paper.
const attr = createAttrScreen(PLAYFIELD_W / CELL, PLAYFIELD_H / CELL)
const attrPaint = attrPainter(attr, C.BLACK)
const cam = createCamera({
  viewW: PLAYFIELD_W,
  viewH: PLAYFIELD_H,
  worldW: world.width,
  worldH: world.height,
  lerp: 0.2,
  deadzoneW: 56,
  deadzoneH: 32,
})

let player = createPlayer(room.spawnX, room.spawnY)
const shots: Shot[] = []
let carrots = makeCarrots(room.carrots)
let spiders = makeSpiders(room.spiders)
let bats = makeBats(room.bats)
let mice = makeMice(room.mice)
let torches = makeTorches(room.torches)
const fire = createParticleSystem(600)
let moon = makeMoon(room.exit)
let crumblers = makeCrumblers(room.map, LEVEL.platforms)

let carrotCount = 0
const TOTAL_CARROTS = LEVEL.carrots.length // collect them all to open the moon (the exit)
let debug = false
let last = performance.now()
let frameMs = 16 // smoothed real frame time (debug FPS readout)
// Game clock for time-driven visuals (torch pulse, moon breathing). Unlike
// `now` it stops while paused, so a pause freezes the flames mid-flicker —
// and any future timer derives from it instead of wall time.
let gameTime = 0

// ── Goal: climb to the escape hatch ───────────────────────────────────────────
// Floor 0 at spawn → FLOOR_TARGET at the top ledge under the exit. The counter
// is the player's progress; `state` drives the win/lose flow.
type GameState = 'playing' | 'won' | 'lost'
let state: GameState = 'playing'
let endTimer = 0        // time spent on a result screen (gates the restart key)
let highestFloor = 0    // highest floor reached this run (HUD never goes backwards)

const FLOOR_BOTTOM_Y = room.spawnY
const FLOOR_TOP_Y = room.exit.y + room.exit.h
const FLOOR_PX = (FLOOR_BOTTOM_Y - FLOOR_TOP_Y) / FLOOR_TARGET

function floorOf(y: number): number {
  const f = Math.round((FLOOR_BOTTOM_Y - y) / FLOOR_PX)
  return Math.max(0, Math.min(FLOOR_TARGET, f))
}

function resetGame(): void {
  // Same fixed level every run — learnable and speedrun-able.
  room = buildRoomFromLevel(LEVEL)
  moon = makeMoon(room.exit)
  crumblers = makeCrumblers(room.map, LEVEL.platforms)
  invalidateLayer(tileCache) // room.map was rebuilt — re-render the cached tiles
  player = createPlayer(room.spawnX, room.spawnY)
  shots.length = 0
  carrots = makeCarrots(room.carrots)
  spiders = makeSpiders(room.spiders)
  bats = makeBats(room.bats)
  mice = makeMice(room.mice)
  torches = makeTorches(room.torches)
  carrotCount = 0
  highestFloor = 0
  endTimer = 0
  // Snap the camera to the new spawn so the view doesn't slide up from the old cave.
  cam.x = 0
  cam.y = Math.max(0, Math.min(world.height - PLAYFIELD_H, room.spawnY - PLAYFIELD_H / 2))
  startMusic() // resume music for the new run (stopped on game over)
  state = 'playing'
}

// ── Sidebar HUD (left panel, docs/screen-redesign.sk.md) ─────────────────────
// The carrot frame + static labels render ONCE into a layer cache; only live
// values (hearts, carrot count, floor, FPS) are drawn on top each frame.
const sidebarCache = createLayerCache(SIDEBAR_W, GAME_HEIGHT)
const APP_VER = import.meta.env.VITE_APP_VERSION ?? '?'
const ZX_KIT_VER = import.meta.env.VITE_ZX_KIT_VERSION ?? '?'

/** Centres a text line within the sidebar width. */
function sideCentered(c: CanvasRenderingContext2D, text: string, y: number, ink: SpectrumColor): void {
  drawText(c, text, Math.round((SIDEBAR_W - text.length * CELL) / 2), y, ink)
}

/** The decorative frame: a small two-layer carrot tiled around the panel. */
function drawSidebarFrame(c: CanvasRenderingContext2D): void {
  const stamp = (x: number, y: number) => {
    drawBitmap(c, atlas.sidebarCarrotBody.bitmap, x, y, C.B_YELLOW)
    drawBitmap(c, atlas.sidebarCarrotLeaf.bitmap, x, y, C.B_GREEN)
  }
  for (let x = 0; x < SIDEBAR_W; x += CELL) {
    stamp(x, 0)
    stamp(x, GAME_HEIGHT - CELL)
  }
  for (let y = CELL; y < GAME_HEIGHT - CELL; y += CELL) {
    stamp(0, y)
    stamp(SIDEBAR_W - CELL, y)
  }
}

function renderSidebar(
  c: CanvasRenderingContext2D,
  hp: number, got: number, total: number, floor: number, exitOpen: boolean, fps: number,
): void {
  const panel = refreshLayer(sidebarCache, (lctx) => {
    lctx.fillStyle = C.BLACK
    lctx.fillRect(0, 0, SIDEBAR_W, GAME_HEIGHT)
    drawSidebarFrame(lctx)
    sideCentered(lctx, 'LIVES', 14, C.B_RED)
    sideCentered(lctx, 'CARROTS', 44, C.B_YELLOW)
    sideCentered(lctx, 'FLOOR', 78, C.CYAN)
    sideCentered(lctx, 'VERSION', 108, C.WHITE)
    sideCentered(lctx, APP_VER, 118, C.WHITE)
    sideCentered(lctx, 'ZX-KIT', 136, C.WHITE)
    sideCentered(lctx, ZX_KIT_VER, 146, C.WHITE)
  })
  if (panel) c.drawImage(panel, 0, 0)

  // Live values, over the cached panel.
  for (let i = 0; i < Math.max(0, hp); i++) {
    drawSprite(c, HEART, 26 + i * 10, 24, C.B_RED, C.BLACK)
  }
  drawBitmap(c, atlas.carrotPickup.bitmap, 16, 50, C.B_YELLOW)
  drawText(c, `${got}/${total}`, 38, 56, exitOpen ? C.B_GREEN : C.B_WHITE, C.BLACK)
  sideCentered(c, `${floor} OF ${FLOOR_TARGET}`, 88, C.CYAN)
  const fpsInk = fps >= 55 ? C.B_GREEN : fps >= 30 ? C.B_YELLOW : C.B_RED
  sideCentered(c, `${fps} FPS`, 168, fpsInk)
}

function frame(now: number): void {
  const rawDt = now - last
  const dt = Math.max(0, Math.min(rawDt, 50)) // never negative — a backwards first-frame rAF timestamp would push animation indices below zero
  last = now
  frameMs += (rawDt - frameMs) * 0.08 // EMA of actual frame time

  if (consumeDebug()) debug = !debug
  if (consumePause()) togglePause() // P / gamepad Start (B handled on keydown)
  if (!paused) gameTime += dt // freeze flames, moon and future timers while paused

  if (state === 'playing' && !paused) {
    const ev = updatePlayer(player, room.map, dt)
    if (ev.jumped) SFX.jump()
    if (ev.landed) SFX.land()
    if (ev.shot) {
      const m = muzzle(player)
      spawnShot(shots, m.x, m.y, player.facing)
      SFX.shoot()
    }

    updateShots(shots, room.map, dt, world.width)

    // Crumbling platforms collapse under the rabbit, then respawn. Either change
    // mutates the tilemap → invalidate the cached tile layer so it re-renders.
    if (updateCrumblers(crumblers, room.map, playerBox(player), player.onGround, dt)) {
      invalidateLayer(tileCache)
    }

    // Pixel-perfect interactions (masksOverlap is the final decision).
    const pMask = playerMask(player)
    const px = Math.round(player.x)
    const py = Math.round(player.y)

    const got = updateCarrots(carrots, pMask, px, py)
    if (got > 0) {
      const was = carrotCount
      carrotCount += got
      SFX.pickup()
      // The last carrot opens the moon — flash to signal the exit is live.
      if (was < TOTAL_CARROTS && carrotCount >= TOTAL_CARROTS) flashBorder(C.B_YELLOW, 3, 120)
    }

    const spiderRes = updateSpiders(spiders, pMask, px, py, shots, dt)
    const batRes = updateBats(bats, pMask, px, py, shots, dt)
    if (spiderRes.curled) SFX.shoot()

    // Mice: stomp from above → the mouse bolts and the rabbit gets a little
    // Mario bounce; side contact hurts like any other enemy.
    const pBox = playerBox(player)
    const mouseRes = updateMice(
      mice, pMask, px, py, player.vy, pBox.y + pBox.h, shots, dt, world.width,
    )
    if (mouseRes.stomped) {
      player.vy = physics.jumpVelocity * 0.55
      SFX.jump()
    }

    const hitX = spiderRes.hitX ?? batRes.hitX ?? mouseRes.hitX
    if (hitX !== null && damagePlayer(player, hitX)) {
      SFX.hurt()
      flashBorder(C.B_RED, 1, 90)
    }

    emitTorchFire(torches, fire, dt)
    tickParticles(fire, dt, -0.00012) // slight upward drift — flames lick up

    // ── Goal: track progress, then test win (escaped) / lose (no HP) ──
    const f = floorOf(player.y)
    if (f > highestFloor) highestFloor = f
    if (carrotCount >= TOTAL_CARROTS && rectsOverlap(playerBox(player), room.exit)) {
      state = 'won'; endTimer = 0; flashBorder(C.B_GREEN, 2, 150)
    } else if (player.hp <= 0) {
      state = 'lost'; endTimer = 0; flashBorder(C.B_RED, 2, 120); stopMusic()
    }

    setCameraTarget(cam, player.x + 8, player.y + 16)
    tickCamera(cam, dt)
  } else if (state !== 'playing') {
    // Result screen: drain input every frame (ignore the keys that ended the
    // run / are still held), then a fresh press after a short delay restarts.
    endTimer += dt
    const pressed = consumeAnyKey()
    if (endTimer > 700 && pressed) resetGame()
  }

  const camX = Math.round(cam.x)
  const camY = Math.round(cam.y)

  // ── render ──
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  const exitOpen = carrotCount >= TOTAL_CARROTS

  // ── playfield — translated right of the sidebar and clipped to its rect, so
  //    every draw below keeps working in playfield-local coordinates. ──
  ctx.save()
  ctx.translate(PLAYFIELD_X, 0)
  ctx.beginPath()
  ctx.rect(0, 0, PLAYFIELD_W, PLAYFIELD_H)
  ctx.clip()

  if (viewMode === 'mono') {
    // Monochrome playfield: draw EVERYTHING — tiles, all entities, the spider
    // thread, the rabbit — into one MonoScreen, then resolve to a single ink/paper
    // in one putImageData + drawImage. No clash: white spider, green tile and cyan
    // rabbit all become the same ink. Colour lives only in the HUD on top.
    clearMonoScreen(mono)
    drawTiles(monoPaint, room.map, camX, camY, PLAYFIELD_W, PLAYFIELD_H)
    renderCarrots(monoPaint, carrots, camX, camY)
    renderSpiders(monoPaint, spiders, camX, camY)
    renderBats(monoPaint, bats, camX, camY)
    renderMice(monoPaint, mice, camX, camY)
    renderShots(monoPaint, shots, camX, camY)
    renderTorches(monoPaint, torches, camX, camY)
    renderPlayer(monoPaint, player, camX, camY)
    flushMonoScreen(ctx, mono, 0, 0)
    // The moon is the exit beacon (a light source) — keep it a colour glow on top.
    renderMoon(ctx, moon, camX, camY, gameTime, exitOpen)
  } else if (viewMode === 'clash') {
    // Authentic ZX attribute clash: stamp EVERYTHING into the AttrScreen so each 8×8
    // cell snaps to one ink + one paper (the famous colour bleed), then flush once.
    clearAttrScreen(attr, C.BLACK)
    drawTiles(attrPaint, room.map, camX, camY, PLAYFIELD_W, PLAYFIELD_H)
    renderCarrots(attrPaint, carrots, camX, camY)
    renderSpiders(attrPaint, spiders, camX, camY)
    renderBats(attrPaint, bats, camX, camY)
    renderMice(attrPaint, mice, camX, camY)
    renderShots(attrPaint, shots, camX, camY)
    renderTorches(attrPaint, torches, camX, camY)
    renderPlayer(attrPaint, player, camX, camY, CLASH_RABBIT_INK) // one ink → no self-clash
    flushAttrScreen(ctx, attr)
    // Moon stays a colour glow on top (same as mono).
    renderMoon(ctx, moon, camX, camY, gameTime, exitOpen)
  } else {
    if (viewMode === 'bricks') drawDungeonBackground(ctx, camX, camY) // bricks look only; 'black' lets the cleared black show
    // Cached tile layer: render the whole map once, then blit the camera window.
    const tiles = refreshLayer(tileCache, (lctx) => drawTileMapAt(lctx, room.map, 0, 0, world.width, world.height))
    if (tiles) {
      const sx = Math.max(0, Math.min(world.width - PLAYFIELD_W, camX))
      const sy = Math.max(0, Math.min(world.height - PLAYFIELD_H, camY))
      ctx.drawImage(tiles, sx, sy, PLAYFIELD_W, PLAYFIELD_H, 0, 0, PLAYFIELD_W, PLAYFIELD_H)
    }
    renderCarrots(paint, carrots, camX, camY)
    renderSpiders(paint, spiders, camX, camY)
    renderBats(paint, bats, camX, camY)
    renderMice(paint, mice, camX, camY)
    renderShots(paint, shots, camX, camY)
    renderTorches(paint, torches, camX, camY)
    renderPlayer(paint, player, camX, camY)

    // Wall torches and the moon illuminate the cave — the rabbit and shots do
    // not (the planned lantern tool will light the rabbit, the carrot stays dark).
    // The moon glows dim until every carrot is collected: a "not yet" signal.
    if (lightsOn) {
      const lights = torchLights(torches, camX, camY, gameTime)
      lights.push(moonLight(moon, camX, camY, exitOpen ? 1 : 0.3))
      renderDarkness(ctx, lights)
    }
    renderMoon(ctx, moon, camX, camY, gameTime, exitOpen)
    renderParticles(ctx, fire, camX, camY)
  }

  if (debug) {
    const b = playerBox(player)
    ctx.strokeStyle = C.B_GREEN
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(b.x - camX), Math.round(b.y - camY), b.w, b.h)
    drawText(ctx, `${player.state} g:${player.onGround ? 1 : 0} sh:${shots.length} light:${lightsOn ? 1 : 0} ${frameMs.toFixed(1)}ms`, 2, 12, C.B_CYAN)
    drawText(ctx, `music:${currentMusicTrackName()}`, 2, 22, C.B_MAGENTA)
  }

  // Pause overlay — frozen scene below, blinking PAUSED + key help on top.
  // Blink runs on real `now` (gameTime is frozen while paused by design).
  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H)
    const cols = PLAYFIELD_W / CELL
    if (Math.floor(now / 450) % 2 === 0) drawTextCentered(ctx, 'PAUSED', 26, cols, C.B_YELLOW)
    let y = 50
    for (const line of PAUSE_HELP) {
      drawTextCentered(ctx, line, y, cols, C.B_WHITE)
      y += 12
    }
  }

  // Result overlay — win/lose, above everything but the scanlines.
  if (state !== 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H)
    const cols = PLAYFIELD_W / CELL
    if (state === 'won') {
      drawTextCentered(ctx, 'YOU ESCAPED!', 72, cols, C.B_GREEN)
      drawTextCentered(ctx, 'THE MOON AWAITS', 88, cols, C.B_WHITE)
    } else {
      drawTextCentered(ctx, 'GAME OVER', 80, cols, C.B_RED)
    }
    if (endTimer > 700) drawTextCentered(ctx, 'PRESS ANY KEY', 110, cols, C.B_YELLOW)
  }

  ctx.restore() // end of the translated + clipped playfield

  renderSidebar(ctx, player.hp, carrotCount, TOTAL_CARROTS, highestFloor, exitOpen, Math.round(1000 / frameMs))

  // CRT scanlines: rendered once into an offscreen at device resolution, then
  // blitted in physical pixels (reset the ×SCALE transform for a 1:1 copy).
  const scan = refreshLayer(scanlineCache, (sctx) => drawScanlines(sctx))
  if (scan) {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(scan, 0, 0)
    ctx.restore()
  }

  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

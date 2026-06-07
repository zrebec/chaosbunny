/**
 * chaosBunny — game loop for the 0.1.0 vertical slice.
 *
 * Cave room (scrolling tilemap) + rabbit + carrot spark + pixel-perfect carrots,
 * spider and bat (every hit/pickup decided by `masksOverlap`, never bounding
 * boxes). Controls: ←/→ or A/D move, Space/↑ jump, ↓ crouch, Z/Ctrl shoot.
 * L lights, M music mute, N next music, C mono (monochrome playfield);
 * Ctrl+Shift+B toggles the debug overlay.
 */
import {
  setupCanvas,
  drawScanlines,
  drawText,
  drawTextCentered,
  drawSprite,
  flashBorder,
  C,
  CELL,
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
  initInput,
  consumeDebug,
  consumeAnyKey,
  rectsOverlap,
  createParticleSystem,
  tickParticles,
  renderParticles,
} from 'zx-kit'
import { GAME_WIDTH, GAME_HEIGHT, CANVAS_SCALE, LIGHTING_MODE, FLOOR_TARGET } from './config.js'
import { buildRoomFromLevel } from './world/room.js'
import { LEVEL } from './world/level.js'
import { HEART } from './art/sprites.js'
import { drawDungeonBackground, initBackground } from './world/background.js'
import { initLighting, renderDarkness, type Light } from './world/lighting.js'
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
import { ensureAudio, SFX } from './audio/sfx.js'
import { startMusic, toggleMusic, stopMusic, nextMusicTrack, currentMusicTrackName } from './audio/music.js'
import { drawTiles, ctxPainter, monoPainter, nextViewMode, type ViewMode } from './world/clash.js'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, CANVAS_SCALE, GAME_WIDTH, GAME_HEIGHT)
canvas.style.width = ''
canvas.style.height = ''

initInput()
// First gesture unlocks audio and kicks off the background music loop.
const unlockAudio = () => { ensureAudio(); startMusic() }
window.addEventListener('keydown', unlockAudio)
window.addEventListener('pointerdown', unlockAudio)

// Lighting toggle (L): play with the cave lit or dark. Darkness rendering lives
// in zx-kit now; `lightsOn` just gates whether we draw it this frame.
let lightsOn = LIGHTING_MODE !== 'none'
let viewMode: ViewMode = 'bricks' // C cycles the playfield look: bricks → black → mono
window.addEventListener('keydown', (e) => {
  if (e.key === 'l' || e.key === 'L') lightsOn = !lightsOn
  if (e.key === 'm' || e.key === 'M') toggleMusic() // mute / unmute music
  if (e.key === 'n' || e.key === 'N') nextMusicTrack() // next AY loop
  if (e.key === 'c' || e.key === 'C') viewMode = nextViewMode(viewMode) // cycle playfield look
})

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
const mono = createMonoScreen(GAME_WIDTH, GAME_HEIGHT, C.BLACK, C.B_CYAN)
const paint = ctxPainter(ctx)        // full-colour painter (default view)
const monoPaint = monoPainter(mono)  // monochrome painter (clash view)
const cam = createCamera({
  viewW: GAME_WIDTH,
  viewH: GAME_HEIGHT,
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
let torches = makeTorches(room.torches)
const fire = createParticleSystem(600)
let moon = makeMoon(room.exit)
let crumblers = makeCrumblers(room.map, LEVEL.platforms)

let carrotCount = 0
const TOTAL_CARROTS = LEVEL.carrots.length // collect them all to open the moon (the exit)
let debug = false
let last = performance.now()
let frameMs = 16 // smoothed real frame time (debug FPS readout)

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
  torches = makeTorches(room.torches)
  carrotCount = 0
  highestFloor = 0
  endTimer = 0
  // Snap the camera to the new spawn so the view doesn't slide up from the old cave.
  cam.x = 0
  cam.y = Math.max(0, Math.min(world.height - GAME_HEIGHT, room.spawnY - GAME_HEIGHT / 2))
  startMusic() // resume music for the new run (stopped on game over)
  state = 'playing'
}

function frame(now: number): void {
  const rawDt = now - last
  const dt = Math.max(0, Math.min(rawDt, 50)) // never negative — a backwards first-frame rAF timestamp would push animation indices below zero
  last = now
  frameMs += (rawDt - frameMs) * 0.08 // EMA of actual frame time

  if (consumeDebug()) debug = !debug

  if (state === 'playing') {
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

    const hitX = spiderRes.hitX ?? batRes.hitX
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
  } else {
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

  if (viewMode === 'mono') {
    // Monochrome playfield: draw EVERYTHING — tiles, all entities, the spider
    // thread, the rabbit — into one MonoScreen, then resolve to a single ink/paper
    // in one putImageData + drawImage. No clash: white spider, green tile and cyan
    // rabbit all become the same ink. Colour lives only in the HUD on top.
    clearMonoScreen(mono)
    drawTiles(monoPaint, room.map, camX, camY, GAME_WIDTH, GAME_HEIGHT)
    renderCarrots(monoPaint, carrots, camX, camY)
    renderSpiders(monoPaint, spiders, camX, camY)
    renderBats(monoPaint, bats, camX, camY)
    renderShots(monoPaint, shots, camX, camY)
    renderTorches(monoPaint, torches, camX, camY)
    renderPlayer(monoPaint, player, camX, camY)
    flushMonoScreen(ctx, mono, 0, 0)
    // The moon is the exit beacon (a light source) — keep it a colour glow on top.
    renderMoon(ctx, moon, camX, camY, now, exitOpen)
  } else {
    if (viewMode === 'bricks') drawDungeonBackground(ctx, camX, camY) // bricks look only; 'black' lets the cleared black show
    // Cached tile layer: render the whole map once, then blit the camera window.
    const tiles = refreshLayer(tileCache, (lctx) => drawTileMapAt(lctx, room.map, 0, 0, world.width, world.height))
    if (tiles) {
      const sx = Math.max(0, Math.min(world.width - GAME_WIDTH, camX))
      const sy = Math.max(0, Math.min(world.height - GAME_HEIGHT, camY))
      ctx.drawImage(tiles, sx, sy, GAME_WIDTH, GAME_HEIGHT, 0, 0, GAME_WIDTH, GAME_HEIGHT)
    }
    renderCarrots(paint, carrots, camX, camY)
    renderSpiders(paint, spiders, camX, camY)
    renderBats(paint, bats, camX, camY)
    renderShots(paint, shots, camX, camY)
    renderTorches(paint, torches, camX, camY)
    renderPlayer(paint, player, camX, camY)

    // Lighting + glow — full-colour view only (mono playfields have no soft light).
    const lights: Light[] = [
      { x: player.x + 8 - camX, y: player.y + 16 - camY, radius: 72, intensity: 1.0 },
      moonLight(moon, camX, camY, exitOpen ? 1 : 0.3), // dim until all carrots collected
    ]
    for (const l of torchLights(torches, camX, camY, now)) lights.push(l)
    for (const s of shots) if (s.active) lights.push({ x: s.x - camX, y: s.y - camY, radius: 38, intensity: 0.9 })
    if (lightsOn) renderDarkness(ctx, lights, camY, world.height)
    renderMoon(ctx, moon, camX, camY, now, exitOpen)
    renderParticles(ctx, fire, camX, camY)
  }

  // HUD — above the darkness so it stays readable.
  // HUD is inset one tile (CELL) past the stone border walls, and drawn on a
  // black paper so it stays readable over the bricks / stone.
  drawText(ctx, `CARROTS:${carrotCount}/${TOTAL_CARROTS}`, CELL, 2, exitOpen ? C.B_GREEN : C.B_YELLOW, C.BLACK)
  drawText(ctx, `FLOOR ${highestFloor}/${FLOOR_TARGET}`, 13 * CELL, 2, C.B_WHITE, C.BLACK)
  // HP as little hearts, right-aligned inside the right border wall.
  for (let i = 0; i < Math.max(0, player.hp); i++) {
    drawSprite(ctx, HEART, GAME_WIDTH - CELL - (i + 1) * CELL, 2, C.B_RED, C.BLACK)
  }

  // Permanent FPS readout, bottom-right (Firefox eats Ctrl+Shift+B, so the
  // debug overlay can't be the only place to see it).
  // Bottom row: inset one tile up from the floor border and past the side walls,
  // on black paper. Version bottom-left, FPS bottom-right.
  const bottomY = GAME_HEIGHT - 2 * CELL
  const fps = Math.round(1000 / frameMs)
  const fpsText = `${fps} FPS`
  const fpsInk = fps >= 55 ? C.B_GREEN : fps >= 30 ? C.B_YELLOW : C.B_RED
  drawText(ctx, fpsText, GAME_WIDTH - CELL - fpsText.length * CELL, bottomY, fpsInk, C.BLACK)

  // Versions, bottom-left: game version / real running zx-kit version.
  const appVer = import.meta.env.VITE_APP_VERSION ?? '?'
  const zxKit = import.meta.env.VITE_ZX_KIT_VERSION ?? '?'
  drawText(ctx, `v${appVer}/${zxKit}`, CELL, bottomY, C.BLUE, C.BLACK)

  if (debug) {
    const b = playerBox(player)
    ctx.strokeStyle = C.B_GREEN
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(b.x - camX), Math.round(b.y - camY), b.w, b.h)
    drawText(ctx, `${player.state} g:${player.onGround ? 1 : 0} sh:${shots.length} light:${lightsOn ? 1 : 0} ${frameMs.toFixed(1)}ms`, 2, 12, C.B_CYAN)
    drawText(ctx, `music:${currentMusicTrackName()}`, 2, 22, C.B_MAGENTA)
  }

  // Result overlay — win/lose, above everything but the scanlines.
  if (state !== 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    const cols = GAME_WIDTH / CELL
    if (state === 'won') {
      drawTextCentered(ctx, 'YOU ESCAPED!', 72, cols, C.B_GREEN)
      drawTextCentered(ctx, 'RABBIT FOUND THE WAY OUT', 88, cols, C.B_WHITE)
    } else {
      drawTextCentered(ctx, 'GAME OVER', 80, cols, C.B_RED)
    }
    if (endTimer > 700) drawTextCentered(ctx, 'PRESS ANY KEY', 110, cols, C.B_YELLOW)
  }

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

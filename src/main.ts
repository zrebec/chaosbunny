/**
 * chaosBunny — game loop for the 0.1.0 vertical slice.
 *
 * Cave room (scrolling tilemap) + rabbit + carrot spark + pixel-perfect carrots,
 * spider and bat (every hit/pickup decided by `masksOverlap`, never bounding
 * boxes). Controls: ←/→ or A/D move, Space/↑ jump, ↓ crouch, Z/Ctrl shoot.
 * Ctrl+Shift+B toggles the debug overlay.
 */
import {
  setupCanvas,
  drawScanlines,
  drawText,
  flashBorder,
  C,
  createCamera,
  setCameraTarget,
  tickCamera,
  drawTileMapAt,
  tileMapWorldSize,
  initInput,
  consumeDebug,
  createParticleSystem,
  tickParticles,
  renderParticles,
} from 'zx-kit'
import { GAME_WIDTH, GAME_HEIGHT, CANVAS_SCALE, LIGHTING_MODE } from './config.js'
import { buildCaveRoom } from './world/room.js'
import { drawDungeonBackground, initBackground } from './world/background.js'
import { initLighting, renderDarkness, type Light } from './world/lighting.js'
import { makeTorches, emitTorchFire, torchLights, renderTorches } from './entities/torch.js'
import {
  createPlayer, updatePlayer, renderPlayer, playerBox, playerMask, damagePlayer, muzzle,
} from './entities/player.js'
import { spawnShot, updateShots, renderShots, type Shot } from './entities/projectile.js'
import { makeCarrots, updateCarrots, renderCarrots } from './entities/pickup.js'
import { makeSpiders, updateSpiders, renderSpiders } from './entities/spider.js'
import { makeBats, updateBats, renderBats } from './entities/bat.js'
import { ensureAudio, SFX } from './audio/sfx.js'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, CANVAS_SCALE, GAME_WIDTH, GAME_HEIGHT)
canvas.style.width = ''
canvas.style.height = ''

initInput()
window.addEventListener('keydown', ensureAudio)
window.addEventListener('pointerdown', ensureAudio)

const room = buildCaveRoom()
const world = tileMapWorldSize(room.map)
initBackground(world.width, world.height)
initLighting()
const cam = createCamera({
  viewW: GAME_WIDTH,
  viewH: GAME_HEIGHT,
  worldW: world.width,
  worldH: world.height,
  lerp: 0.2,
  deadzoneW: 56,
  deadzoneH: 32,
})

const player = createPlayer(room.spawnX, room.spawnY)
const shots: Shot[] = []
const carrots = makeCarrots(room.carrots)
const spiders = makeSpiders(room.spiders)
const bats = makeBats(room.bats)
const torches = makeTorches(room.torches)
const fire = createParticleSystem(600)

let carrotCount = 0
let debug = false
let last = performance.now()

function frame(now: number): void {
  const dt = Math.min(now - last, 50)
  last = now

  if (consumeDebug()) debug = !debug

  const ev = updatePlayer(player, room.map, dt)
  if (ev.jumped) SFX.jump()
  if (ev.landed) SFX.land()
  if (ev.shot) {
    const m = muzzle(player)
    spawnShot(shots, m.x, m.y, player.facing)
    SFX.shoot()
  }

  updateShots(shots, room.map, dt, world.width)

  // Pixel-perfect interactions (masksOverlap is the final decision).
  const pMask = playerMask(player)
  const px = Math.round(player.x)
  const py = Math.round(player.y)

  const got = updateCarrots(carrots, pMask, px, py)
  if (got > 0) { carrotCount += got; SFX.pickup() }

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

  setCameraTarget(cam, player.x + 8, player.y + 16)
  tickCamera(cam, dt)
  const camX = Math.round(cam.x)
  const camY = Math.round(cam.y)

  // ── render ──
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  drawDungeonBackground(ctx, camX, camY) // deepest layer (parallax)
  drawTileMapAt(ctx, room.map, camX, camY)
  renderCarrots(ctx, carrots, camX, camY)
  renderSpiders(ctx, spiders, camX, camY)
  renderBats(ctx, bats, camX, camY)
  renderShots(ctx, shots, camX, camY)
  renderTorches(ctx, torches, camX, camY)
  renderPlayer(ctx, player, camX, camY)

  // Lighting: dim the scene, then punch soft holes at each light source.
  const lights: Light[] = [
    { x: player.x + 8 - camX, y: player.y + 16 - camY, radius: 72, intensity: 1.0 },
  ]
  for (const l of torchLights(torches, camX, camY, now)) lights.push(l)
  for (const s of shots) if (s.active) lights.push({ x: s.x - camX, y: s.y - camY, radius: 38, intensity: 0.9 })
  renderDarkness(ctx, lights, LIGHTING_MODE)

  // Fire glows on top of the darkness.
  renderParticles(ctx, fire, camX, camY)

  // HUD — above the darkness so it stays readable.
  drawText(ctx, `CARROTS:${carrotCount}`, 2, 2, C.B_YELLOW)
  drawText(ctx, `HP:${Math.max(0, player.hp)}`, GAME_WIDTH - 8 * 5, 2, C.B_RED)

  if (debug) {
    const b = playerBox(player)
    ctx.strokeStyle = C.B_GREEN
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(b.x - camX), Math.round(b.y - camY), b.w, b.h)
    drawText(ctx, `${player.state} g:${player.onGround ? 1 : 0} sh:${shots.length}`, 2, 12, C.B_CYAN)
  }

  drawScanlines(ctx)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

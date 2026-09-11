/**
 * Entry point of the tile-stealth prototype (`index.html` loads this on the
 * `proto/tile-stealth` branch; the platformer's `src/main.ts` is not loaded).
 *
 * Controls — every action is one beat, and a beat moves every fox:
 * - arrows / WASD / d-pad: step
 * - Z: ears up / down
 * - X or F (gamepad A): aim a carrot, then an arrow throws it that way; X or Esc cancels
 * - Space: wait a beat
 * - R: start the room again
 * - 1, 2, …: jump to that room (after a win, any key goes on to the next)
 *
 * It opens on the title (`title.ts`): `LOAD ""`, a key starts the tape, a key
 * during the load finishes it, a key on the picture starts room 1. Winning the
 * last room comes back to the picture.
 *
 * Ears down allows only `SNEAK_STEPS` (beat.ts) steps before they must come up;
 * the pips beside EARS DOWN count them.
 *
 * A step is animated for {@link BEAT_MS}; a key pressed during it is kept and played
 * when it ends, so a held arrow walks at the key-repeat pace without dropping beats.
 */
import { consumeAnyKey, consumeFlag, initInput, resetInput, SCALE, setupCanvas, tickMovement } from 'zx-kit'
import { ensureAudio } from '../audio/sfx.js'
import { beat, startWorld, type Action, type World } from './beat.js'
import { parseRoom } from './room.js'
import { ROOM_01 } from './rooms/room01.js'
import { ROOM_02 } from './rooms/room02.js'
import { ROOM_03 } from './rooms/room03.js'
import { playBlocked, playEvents, playTape, stopTape } from './sound.js'
import { STR } from './strings.js'
import { loadStateAt } from './loader.js'
import { createTitle, renderTitle, setBorder, type TitleMode } from './title.js'
import { createScene, render, type Frame, type Scene } from './view.js'

const BEAT_MS = 150
/** How long the room stays dimmed with `!` before it starts again. */
const CAUGHT_MS = 900
/** A pause after winning before a key restarts, so the winning keypress cannot skip the screen. */
const WON_GRACE_MS = 400

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, SCALE, 256, 192)
canvas.style.width = '' // index.html's CSS fits the canvas to the window
canvas.style.height = ''

const ROOMS = [ROOM_01, ROOM_02, ROOM_03].map(parseRoom)
const scenes = new Map<number, Scene>()
let roomIndex = 0
let room = ROOMS[roomIndex]!
let scene = sceneFor(roomIndex)

/** Room layers are drawn once per room and kept. */
function sceneFor(i: number): Scene {
  let s = scenes.get(i)
  if (!s) scenes.set(i, (s = createScene(ROOMS[i]!, i + 1)))
  return s
}

let world: World = startWorld(room)
let prev: World = world
let t = 1
let thrown: Frame['thrown'] = null
let aiming = false
let phase: 'title' | 'play' | 'caught' | 'won' = 'title'
let phaseMs = 0
let caughtBy: number | null = null
let queued: Action | null = null
const title = createTitle()
let titleMode: TitleMode = 'prompt'
let loadMs = 0

// Beat-paced key repeat: a held arrow steps again after 220 ms, then every 180 ms.
initInput(220, 180)
window.addEventListener('keydown', ensureAudio)
window.addEventListener('pointerdown', ensureAudio)

function goToTitle(mode: TitleMode): void {
  phase = 'title'
  titleMode = mode
  loadMs = 0
  resetInput()
}

/** A key on the title: start the tape, finish it, or start the game. */
function advanceTitle(): void {
  if (titleMode === 'prompt') {
    titleMode = 'loading'
    loadMs = 0
    playTape() // the key that got us here has just unlocked audio (ensureAudio on keydown)
  } else if (titleMode === 'loading') {
    stopTape()
    titleMode = 'ready'
  } else {
    goToRoom(0)
  }
}

function goToRoom(i: number): void {
  if (phase === 'title') stopTape()
  setBorder(null, 0)
  roomIndex = ((i % ROOMS.length) + ROOMS.length) % ROOMS.length
  room = ROOMS[roomIndex]!
  scene = sceneFor(roomIndex)
  restart()
}

function restart(): void {
  world = startWorld(room)
  prev = world
  t = 1
  thrown = null
  aiming = false
  phase = 'play'
  phaseMs = 0
  caughtBy = null
  queued = null
  resetInput()
}

function play(action: Action): void {
  const r = beat(room, world, action)
  if (r.outcome === 'blocked') {
    playBlocked()
    return
  }
  playEvents(r.events)
  prev = world
  world = r.world
  t = 0
  const toss = r.events.find((e) => e.type === 'throw')
  thrown = toss && toss.type === 'throw' ? { from: toss.from, to: toss.to } : null
  if (r.outcome === 'caught') {
    const by = r.events.find((e) => e.type === 'caught')
    caughtBy = by && by.type === 'caught' ? by.fox : 0
    phase = 'caught'
    phaseMs = 0
    queued = null
    aiming = false
  } else if (r.outcome === 'won') {
    phase = 'won'
    phaseMs = 0
    queued = null
    resetInput()
  }
}

/** Plays now, or keeps the action for the end of the current step's animation. */
function request(action: Action): void {
  if (t < 1) queued = action
  else play(action)
}

function toggleAim(): void {
  if (aiming) aiming = false
  else if (world.randy.carrots > 0) aiming = true
  else playBlocked()
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return
  const digit = Number(e.key)
  if (Number.isInteger(digit) && digit >= 1 && digit <= ROOMS.length) {
    goToRoom(digit - 1)
    return
  }
  if (phase !== 'play') return
  switch (e.key) {
    case 'z':
    case 'Z':
      request({ kind: 'ears' })
      break
    case ' ':
      e.preventDefault()
      request({ kind: 'wait' })
      break
    case 'x':
    case 'X':
      toggleAim()
      break
    case 'Escape':
      aiming = false
      break
    case 'r':
    case 'R':
      restart()
      break
  }
})

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(50, now - last)
  last = now
  const dir = tickMovement(dt) // also polls the gamepad
  const flag = consumeFlag() // F or gamepad A

  if (phase === 'play') {
    if (flag) toggleAim()
    if (dir) {
      request(aiming ? { kind: 'throw', dir } : { kind: 'move', dir })
      aiming = false
    }
    if (t < 1) {
      t = Math.min(1, t + dt / BEAT_MS)
      if (t >= 1 && queued) {
        const next = queued
        queued = null
        play(next)
      }
    }
  } else if (phase === 'title') {
    if (titleMode === 'loading') {
      loadMs += dt
      if (loadStateAt(loadMs).phase === 'done') titleMode = 'ready'
    }
    setBorder(titleMode === 'loading' ? loadStateAt(loadMs).phase : null, now)
    if (consumeAnyKey()) advanceTitle()
  } else {
    t = Math.min(1, t + dt / BEAT_MS)
    phaseMs += dt
    if (phase === 'caught' && phaseMs >= CAUGHT_MS) restart()
    if (phase === 'won' && phaseMs >= WON_GRACE_MS && consumeAnyKey()) {
      if (roomIndex === ROOMS.length - 1) goToTitle('ready')
      else goToRoom(roomIndex + 1)
    }
  }

  if (phase === 'title') renderTitle(ctx, title, titleMode, loadMs, now, STR)
  else render(ctx, scene, { world, prev, t, thrown, aiming, caughtBy, won: phase === 'won' }, STR)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

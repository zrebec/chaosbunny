/**
 * Entry point of the tile-stealth prototype (`index.html` loads this on the
 * `proto/tile-stealth` branch; the platformer's `src/main.ts` is not loaded).
 *
 * Controls — every action is one beat, and a beat moves every fox:
 * - arrows / WASD / d-pad: step
 * - Z, or P / gamepad Start: ears up / down (the kit's pad has one action button,
 *   which the throw already uses — see docs/zx-kit-findings.md)
 * - X or F (gamepad A): aim a carrot, then an arrow throws it that way; X or Esc cancels
 * - Space: wait a beat
 * - U: take the last beat back (and, while a fox has you, the one that lost the room)
 * - M: the cellar hum on or off (on the loaded picture, S opens the sound bench)
 * - L: how dark the cellar is — as it was, the cellar, the deep cellar. Picture only:
 *   it changes no rule, and a room's par is the same at every level
 * - R: start the room again
 * - 1, 2, … 9, 0: jump to that room, 0 being the tenth; [ and ] step to any other —
 *   development builds only (`STEALTH_ROOM_SKIP`): a released cellar opens a room once
 *   the one before it has been escaped (`score.ts`)
 * - H: the rules the rooms are built on — from the picture or from inside a room,
 *   where any key puts you back on the beat you left
 * - C: the cellar map, where the arrows pick a room — from the loaded picture or from
 *   inside a room, where Esc puts you back exactly where you left off
 * - (after a win, any key goes on to the next room)
 *
 * After a win, P plays the run back and B the run that holds the room's record
 * (`replay.ts`: a run is just its actions); any key stops it. Leaving the win screen
 * shows the cellar map (`cellar.ts`) with the room just escaped lit up, and a key
 * from there walks on to the next.
 *
 * It opens on the title (`title.ts`): `LOAD ""`, a key starts the tape, a key
 * during the load finishes it, a key on the picture brings the story, and a key on
 * that starts room 1. Winning the last room comes back to the picture.
 *
 * Ears down allows only `SNEAK_STEPS` (beat.ts) steps before they must come up;
 * the pips beside EARS DOWN count them.
 *
 * A step is animated for {@link BEAT_MS}; a key pressed during it is kept and played
 * when it ends, so a held arrow walks at the key-repeat pace without dropping beats.
 */
import {
  consumeAnyKey, consumeDebug, consumeFlag, consumePause, initInput, resetInput, SCALE, setupCanvas,
  tickMovement,
} from 'zx-kit'
import { ensureAudio } from '../audio/sfx.js'
import { STEALTH_ROOM_SKIP } from '../config.js'
import { BAT_HEARING } from './bat.js'
import { beat, startWorld, type Action, type BeatEvent, type World } from './beat.js'
import { manhattan } from './grid.js'
import { guide as guideFor, isGuided, type Guidance } from './guide.js'
import { cellIndex, litCells } from './light.js'
import { musicOn, pauseMusic, resetChannels, startMusic, toggleChannel, toggleMusic } from './music.js'
import { openRecords, type Run } from './records.js'
import { decodeRun, encodeRun } from './replay.js'
import { parseRoom, tileAt } from './room.js'
import { spots } from './rules.js'
import { cellarScore, isUnlocked } from './score.js'
import { ROOM_SOURCES } from './rooms/index.js'
import { playBlocked, playEvents, playTape, playUndo, SOUND_BENCH, stopTape } from './sound.js'
import { roomLabel, STR } from './strings.js'
import { loadStateAt } from './loader.js'
import { renderCellar } from './cellar.js'
import { clearBorderFlash, createTitle, flashBorder, renderTitle, setBorder, VOICE_KEYS, type TitleMode } from './title.js'
import { createScene, cycleAmbience, render, type Frame, type Scene } from './view.js'

const BEAT_MS = 150
/**
 * How long the room stays dimmed with `!` before it starts again on its own. Long
 * enough to read the `!` and take the beat back with U; any other key starts again
 * at once, so the wait is never imposed on a player who has already decided.
 */
const CAUGHT_MS = 1600
/** A pause after winning before a key restarts, so the winning keypress cannot skip the screen. */
const WON_GRACE_MS = 400
/** Replay pace: a little slower than play, so a run can be followed. */
const REPLAY_BEAT_MS = 260
/** How long the last beat of a replay stays before the win screen returns. */
const REPLAY_HOLD_MS = 700

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, SCALE, 256, 192)
canvas.style.width = '' // index.html's CSS fits the canvas to the window
canvas.style.height = ''

const ROOMS = ROOM_SOURCES.map(parseRoom)
/** Every room's par added up: what the whole cellar costs a player who never wastes a beat. */
const PAR_TOTAL = ROOMS.reduce((sum, r) => sum + (r.par ?? 0), 0)
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
let phase: 'title' | 'play' | 'caught' | 'won' | 'replay' | 'map' = 'title'
let phaseMs = 0
let caughtBy: number | null = null
let bittenBy: number | null = null
let queued: Action | null = null
const title = createTitle()
const book = openRecords()
let lastRun: Run | null = null
/** Every action of the current attempt that the room took — the run, if it wins. */
let runActions: Action[] = []
let wonWorld: World | null = null
/**
 * The world before each beat of this attempt, newest last — what U walks back
 * through, in step with `runActions` so an undone beat leaves no trace in the run
 * that gets saved. Emptied whenever the room starts over.
 */
const history: World[] = []
let replay: { actions: readonly Action[]; next: number; waitMs: number; holdMs: number } | null = null
/**
 * The rules the game states nowhere else, each said once per visit to a room, at the
 * moment it first matters. A player who already knows them never sees them twice.
 */
const hinted = { spotted: false, shadow: false, crate: false, carrot: false, lamp: false, board: false, lever: false, bat: false, water: false }
/**
 * The next best move in the taught rooms, worked out once when a beat settles rather
 * than every frame — a search is cheap here but not sixty times a second cheap.
 */
let guidance: Guidance | null = null

function refreshGuidance(): void {
  guidance = isGuided(roomIndex) && phase === 'play' ? guideFor(room, world) : null
}

/** The room the map's arrows are resting on. */
let mapPick = 0
/** Set when the map is showing the last cellar just escaped: leaving it is the ending. */
let escaped = false
/**
 * Times a fox or a bat has ended each room, by room name, for as long as the page is
 * open. Three is where being unlucky turns into being stuck and the room starts saying
 * what it wants (`wants.ts`).
 *
 * Per room rather than per visit: a player who cannot get through goes and tries another
 * room and comes back, and a counter that started again each time would keep the advice
 * from the one player it is for. Not saved — a stuck player is stuck now, and a count
 * carried across days would greet him with advice he never asked for.
 */
const caughtIn = new Map<string, number>()
/** Catches before the room names the verb it cannot be left without. */
const NUDGE_AFTER = 3

/** Where Esc goes from the map: back to the picture, or back into the room being played. */
let mapBack: 'title' | 'room' = 'title'
/** The same for the rules screen, which a stuck player wants without losing the room. */
let rulesBack: 'title' | 'room' = 'title'
let toast: { text: string; ms: number } | null = null
const TOAST_MS = 1400

/** The beats of every room's record added up, or `null` until the whole cellar is done. */
function wholeCellarBeats(): number | null {
  const records = book.records()
  let total = 0
  for (const room of ROOMS) {
    const beats = records[room.name]
    if (beats === undefined) return null
    total += beats
  }
  return total
}

/** Whether room `i` may be opened: once the room before it is escaped, or always while tuning. */
function canEnter(i: number): boolean {
  return STEALTH_ROOM_SKIP || isUnlocked(ROOMS, book.records(), i)
}

function say(text: string): void {
  toast = { text, ms: TOAST_MS }
}

/**
 * Says a rule the moment it first bites, and only then. The `?` is the one that cost a
 * player a room: being noticed is a warning, not a capture. The other two are the
 * things a player can stand in the middle of without being told: the dark only hides
 * lowered ears, and a bat hears the ones that are up.
 *
 * The lamp one is the odd member and the most important. The other three fire when the
 * player has *not* done the thing; this one fires when he has — ears down, standing in
 * shadow — and it is not working, because a lamp is lighting that very cell. That is the
 * only rule in the cellar that looks like a bug from the inside.
 *
 * Which is why these run on a **caught** beat too, and not only on a clean one. The
 * lamp's lesson is usually delivered by the capture itself: he lowers his ears in a
 * shadow the lamp is on, the fox sees him anyway, and the room ends. Skipping the hint
 * there — as this did at first — meant the one rule that most needs saying was the one
 * rule that could not be said. The `?` line is the exception and is held back: "hide
 * this beat" is no use to somebody who has already been caught.
 */
function hint(world: World, events: readonly BeatEvent[], caught: boolean): void {
  const randy = world.randy
  const lit = litCells(room, world.lamps)
  // In the order a player needs them, not the order they were written. What just went
  // wrong comes first; what merely happened comes last, because only one line can be
  // said in a beat and a beat can hold several of these at once.

  // "Hide this beat" is no use to somebody who has already been caught; every other
  // line here is *more* use then, because it says why.
  if (!caught && world.foxes.some((f) => f.mode === 'suspicious')) {
    // In the two taught rooms this is said *every* time, and it says the half of the
    // rule the ordinary line leaves out. Room two cannot be crossed unseen — the
    // solver puts its `fewestSightings` at one — so the guide will itself walk the
    // player into a `?`, and a player who reads that as a mistake will undo the one
    // move the room is built on. Once a session is not enough for a lesson that
    // arrives looking like a failure.
    if (isGuided(roomIndex)) {
      hinted.spotted = true
      say(STR.guideSpotted)
      return
    }
    if (!hinted.spotted) {
      hinted.spotted = true
      say(STR.spottedHint)
      return
    }
  }
  // Cover is the quietest no in the game: a fox looking straight at him who would not be,
  // had his ears been down. Not on a shadow cell — that is a line below, and there the
  // difference is the dark rather than the crate.
  if (!hinted.crate && !randy.earsDown && tileAt(room, randy.cell) !== 'shadow'
    && world.foxes.some((f) => spots(room, f.cell, f.facing, randy.cell, false, lit) !== null
      && spots(room, f.cell, f.facing, randy.cell, true, lit) === null)) {
    hinted.crate = true
    say(STR.crateHint)
    return
  }
  // He has done the right thing and it is not working, because a lamp is on the cell.
  if (!hinted.lamp && randy.earsDown && tileAt(room, randy.cell) === 'shadow'
    && lit.has(cellIndex(room, randy.cell))) {
    hinted.lamp = true
    say(STR.lampHint)
    return
  }
  // Two sounds the player makes and cannot see: the plank under his own foot and the
  // handle he just pulled. Both bring a fox, and without a word the fox looks arbitrary.
  if (!hinted.board && events.some((e) => e.type === 'creak')) {
    hinted.board = true
    say(STR.boardHint)
    return
  }
  if (!hinted.lever && events.some((e) => e.type === 'lever')) {
    hinted.lever = true
    say(STR.leverHint)
    return
  }
  const heard = world.bats.some((b) => b.mode === 'roost' && manhattan(b.cell, randy.cell) <= BAT_HEARING)
  if (!hinted.bat && !randy.earsDown && heard) {
    hinted.bat = true
    say(STR.batHint)
    return
  }
  if (!hinted.water && events.some((e) => e.type === 'wade')) {
    hinted.water = true
    say(STR.waterHint)
    return
  }
  // Nothing has gone wrong in these two: he is standing somewhere that will not hide him
  // yet, and a carrot has just been heard. Advice and a number, in that order, last.
  if (!hinted.shadow && !randy.earsDown && tileAt(room, randy.cell) === 'shadow') {
    hinted.shadow = true
    say(STR.shadowHint)
    return
  }
  if (!hinted.carrot && events.some((e) => e.type === 'throw') && events.some((e) => e.type === 'heard')) {
    hinted.carrot = true
    say(STR.carrotHint)
  }
}
let titleMode: TitleMode = 'prompt'
let loadMs = 0

// Beat-paced key repeat: a held arrow steps again after 220 ms, then every 180 ms.
initInput(220, 180)
window.addEventListener('keydown', ensureAudio)
window.addEventListener('pointerdown', ensureAudio)

function goToTitle(mode: TitleMode): void {
  pauseMusic()
  clearBorderFlash()
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
  } else if (titleMode === 'ready') {
    titleMode = 'story' // why he is down there, before he starts climbing out
  } else if (titleMode === 'ending') {
    titleMode = 'ready' // back to the picture, for whoever wants the climb again
  } else {
    goToRoom(0)
  }
}

function goToRoom(i: number): void {
  if (phase === 'title') stopTape()
  escaped = false
  setBorder(null, 0)
  clearBorderFlash() // the colour of the room just left must not follow him into the next
  roomIndex = ((i % ROOMS.length) + ROOMS.length) % ROOMS.length
  room = ROOMS[roomIndex]!
  scene = sceneFor(roomIndex)
  restart()
  // The hints are *not* reset here. They were, once per room, which read as helpful and
  // is not: nine rules times eighteen rooms is a hundred and sixty chances to be told
  // something you already know, and a plank room entered five times said the same
  // sentence five times. A rule is learned once; `H` is there for the rest.
  if (musicOn()) startMusic() // a room is where the hum belongs; the title has the tape
  say(roomLabel(STR, roomIndex))
}

/**
 * What the caught overlay says to a player who keeps losing this room: nothing for the
 * first two catches, then the verb the room is built on, and one more of them each time
 * he is caught again — a room with several wants gives them up one at a time, in the
 * order a player would think of them, and starts over rather than running out.
 */
function nudge(): string | null {
  const caught = caughtIn.get(room.name) ?? 0
  if (caught < NUDGE_AFTER) return null
  const wants = room.wants
  // A room that asks for no tool is usually about timing — but two of them are about
  // picking a route instead, and saying "timing" there would be the one wrong thing the
  // nudge can say (`wants.ts` `offersChoice`).
  if (wants.length === 0) return room.choice ? STR.wants.choice : STR.wants.none
  return STR.wants[wants[(caught - NUDGE_AFTER) % wants.length]!]
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
  bittenBy = null
  queued = null
  runActions = []
  history.length = 0
  replay = null
  guidance = null
  resetInput()
  refreshGuidance()
}

/**
 * One beat back: the world as it was before the last action, the action struck from
 * the run. Works while playing and — the reason it exists — while a fox has Randy by
 * the jacket, so a lost room costs one beat instead of every beat.
 */
function undo(): boolean {
  const back = history.pop()
  if (!back) return false
  runActions.pop()
  world = back
  prev = back
  t = 1
  thrown = null
  aiming = false
  queued = null
  caughtBy = null
  bittenBy = null
  phase = 'play'
  phaseMs = 0
  playUndo()
  say(STR.undone)
  refreshGuidance()
  return true
}

function startReplay(actions: readonly Action[]): void {
  if (!wonWorld || actions.length === 0) return
  phase = 'replay'
  world = startWorld(room)
  prev = world
  t = 1
  thrown = null
  replay = { actions, next: 0, waitMs: 0, holdMs: 0 }
  resetInput()
}

function stopReplay(): void {
  if (!wonWorld) return
  phase = 'won'
  phaseMs = 0
  world = wonWorld
  prev = wonWorld
  t = 1
  thrown = null
  replay = null
  resetInput()
}

/** One beat of a replay: the same beat() the player's keys went through. */
function stepReplay(r: NonNullable<typeof replay>, dt: number): void {
  if (r.next >= r.actions.length) {
    r.holdMs += dt
    if (r.holdMs >= REPLAY_HOLD_MS) stopReplay()
    return
  }
  if (t < 1) return
  r.waitMs += dt
  if (r.waitMs < REPLAY_BEAT_MS - BEAT_MS) return
  r.waitMs = 0
  const result = beat(room, world, r.actions[r.next]!)
  r.next = result.outcome === 'ok' ? r.next + 1 : r.actions.length
  if (result.outcome === 'blocked') return
  playEvents(result.events, result.world)
  // A replay shows what happened, border and all — it is the same beat played again.
  if (result.events.some((e) => e.type === 'suspicious')) flashBorder('spotted')
  prev = world
  world = result.world
  t = 0
  const toss = result.events.find((e) => e.type === 'throw')
  thrown = toss && toss.type === 'throw' ? { from: toss.from, to: toss.to } : null
}

function play(action: Action): void {
  const r = beat(room, world, action)
  if (r.outcome === 'blocked') {
    playBlocked()
    return
  }
  playEvents(r.events, r.world)
  // The border answers with the sound, not after it: yellow for a `?`, red for the
  // room ending, green for the way out. A Spectrum said these things with the border
  // long before it could say them with a sprite.
  if (r.outcome === 'caught') flashBorder('caught')
  else if (r.outcome === 'won') flashBorder('won')
  else if (r.events.some((e) => e.type === 'suspicious')) flashBorder('spotted')
  if (r.outcome === 'ok' || r.outcome === 'caught') hint(r.world, r.events, r.outcome === 'caught')
  runActions.push(action)
  history.push(world)
  prev = world
  world = r.world
  t = 0
  const toss = r.events.find((e) => e.type === 'throw')
  thrown = toss && toss.type === 'throw' ? { from: toss.from, to: toss.to } : null
  refreshGuidance()
  if (r.outcome === 'caught') {
    const by = r.events.find((e) => e.type === 'caught' || e.type === 'bitten')
    caughtBy = by && by.type === 'caught' ? by.fox : null
    bittenBy = by && by.type === 'bitten' ? by.bat : null
    phase = 'caught'
    phaseMs = 0
    caughtIn.set(room.name, (caughtIn.get(room.name) ?? 0) + 1)
    queued = null
    aiming = false
  } else if (r.outcome === 'won') {
    lastRun = book.finish(room.name, world.beats, encodeRun(runActions))
    wonWorld = world
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

/** Keys that are not an answer to "any key": holding Shift must not restart a room. */
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'])

window.addEventListener('keydown', (e) => {
  if (e.repeat) return
  // The map: the arrows walk the chain, Enter opens the marked room, Esc leaves.
  if (phase === 'map') {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') mapPick = (mapPick + ROOMS.length - 1) % ROOMS.length
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') mapPick = (mapPick + 1) % ROOMS.length
    else if (e.key === 'Enter' || e.key === ' ') {
      // Out of the last cellar, with the mark still on it: that way is the night air.
      if (escaped && mapPick === roomIndex) goToTitle('ending')
      else if (canEnter(mapPick)) goToRoom(mapPick)
      else playBlocked() // shut: the map already says which room opens it
    }
    // Peeked at from inside a room, Esc costs nothing: the beat you were on is still there.
    else if (e.key === 'Escape') {
      if (mapBack === 'room') phase = 'play'
      else goToTitle('ready')
    }
    resetInput()
    e.preventDefault()
    return
  }
  // The sound bench: each key plays its own sound, Esc goes back to the picture.
  if (phase === 'title' && titleMode === 'rules') {
    // Any key leaves; a player who came from a room lands back on the beat they left.
    if (rulesBack === 'room') phase = 'play'
    else titleMode = 'ready'
    resetInput()
    return
  }
  if ((e.key === 'h' || e.key === 'H') && (phase === 'play' || (phase === 'title' && titleMode === 'ready'))) {
    rulesBack = phase === 'play' ? 'room' : 'title'
    phase = 'title'
    titleMode = 'rules'
    resetInput()
    return
  }
  if (phase === 'title' && titleMode === 'sound') {
    const key = e.key.toUpperCase()
    if (e.key === 'Escape' || key === 'Q') {
      pauseMusic() // the bench is for the beeper; the hum stops when you leave
      resetChannels() // and a voice muted for tuning does not follow you into a room
      titleMode = 'ready'
    }
    // The tuning question is whether a blip cuts through the hum, so the hum is here too.
    else if (key === 'M') toggleMusic()
    // …and whether it does depends on which of the three voices is in the way, so each
    // one can be taken out while it plays. J brings them all back.
    else if (key === 'J') resetChannels()
    else {
      const voice = VOICE_KEYS.find(([k]) => k === key)
      if (voice) toggleChannel(voice[1])
      else SOUND_BENCH.find((s) => s.key === key)?.play()
    }
    resetInput()
    return
  }
  if (phase === 'title' && titleMode === 'ready' && (e.key === 's' || e.key === 'S')) {
    titleMode = 'sound'
    resetInput()
    return
  }
  // The cellar from the title: the first room still unbeaten is the one marked.
  if (phase === 'title' && titleMode === 'ready' && (e.key === 'c' || e.key === 'C')) {
    const records = book.records()
    const next = ROOMS.findIndex((r) => records[r.name] === undefined)
    phase = 'map'
    escaped = false
    mapBack = 'title'
    mapPick = next < 0 ? 0 : next
    roomIndex = mapPick
    phaseMs = WON_GRACE_MS
    resetInput()
    return
  }
  // The cellar from inside a room: a look at where you are, and a way to leave for
  // another one. Esc comes back to the beat you were standing on.
  if (phase === 'play' && (e.key === 'c' || e.key === 'C')) {
    phase = 'map'
    escaped = false
    mapBack = 'room'
    mapPick = roomIndex
    phaseMs = WON_GRACE_MS
    resetInput()
    return
  }
  // A tuning shortcut, not a way through the cellar: with rooms that open one after
  // another, a key that jumps to any of them would make the lock mean nothing.
  const digit = e.key === '0' ? 10 : Number(e.key) // 0 is the tenth room, as on a Spectrum menu
  if (STEALTH_ROOM_SKIP && Number.isInteger(digit) && digit >= 1 && digit <= ROOMS.length) {
    goToRoom(digit - 1)
    return
  }
  // The cellar outgrew the number row: [ and ] walk it.
  if (STEALTH_ROOM_SKIP && (e.key === '[' || e.key === ']')) {
    goToRoom(roomIndex + (e.key === ']' ? 1 : -1))
    return
  }
  if (phase === 'won' && phaseMs >= WON_GRACE_MS) {
    if (e.key === 'p' || e.key === 'P') startReplay(runActions)
    const best = book.bestRun(room.name)
    if ((e.key === 'b' || e.key === 'B') && best) startReplay(decodeRun(best))
    return
  }
  // Caught: U takes back the beat that lost the room; anything else starts it again now.
  if (phase === 'caught') {
    if (e.key === 'u' || e.key === 'U') undo()
    else if (!MODIFIERS.has(e.key)) restart()
    return
  }
  if (phase !== 'play') return
  switch (e.key) {
    case 'u':
    case 'U':
      if (!undo()) playBlocked()
      break
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
    case 'm':
    case 'M':
      say(toggleMusic() ? STR.musicOn : STR.musicOff)
      break
    case 'l':
    case 'L':
      // How dark the cellar is, walked rather than argued. It touches the picture and
      // nothing else: the solver, the rules and every par are untouched by it.
      say(STR.ambience[cycleAmbience()])
      break
  }
})

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(50, now - last)
  last = now
  const dir = tickMovement(dt) // also polls the gamepad
  const flag = consumeFlag() // F or gamepad A
  // Read every frame, like the flag, so a press on the title or the map is spent there
  // rather than eating the first beat of the next room.
  const wait = consumeDebug() // Ctrl+Shift+B or gamepad Y
  if (toast) {
    toast.ms -= dt
    if (toast.ms <= 0) toast = null
  }

  if (phase === 'play') {
    // The pad has one *action* button and the throw has it, so the other two verbs
    // borrow buttons the kit spends elsewhere: the ears take Start (`consumePause` — a
    // beat-based game has nothing to pause) and waiting takes Y (`consumeDebug` — this
    // game has no debug overlay for it to toggle). Both are workarounds and both are
    // written up in `docs/zx-kit-findings.md`; what they buy is a pad that can finish
    // the cellar instead of one that can walk Randy into rooms it cannot get him out of.
    if (consumePause()) request({ kind: 'ears' })
    if (wait) request({ kind: 'wait' })
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
  } else if (phase === 'replay') {
    t = Math.min(1, t + dt / BEAT_MS)
    if (consumeAnyKey()) stopReplay()
    else if (replay) stepReplay(replay, dt)
  } else if (phase === 'map') {
    phaseMs += dt
    consumeAnyKey() // the map's keys are handled on keydown; nothing here may advance it
  } else if (phase === 'title') {
    if (titleMode === 'sound' || titleMode === 'rules') {
      setBorder(null, now)
      renderTitle(ctx, title, titleMode, loadMs, now, STR, wholeCellarBeats(), ROOMS.length, PAR_TOTAL, cellarScore(ROOMS, book.records()))
      requestAnimationFrame(frame)
      return // its keys are handled on keydown, so no key may advance the title here
    }
    if (titleMode === 'loading') {
      loadMs += dt
      if (loadStateAt(loadMs).phase === 'done') titleMode = 'ready'
    }
    setBorder(titleMode === 'loading' ? loadStateAt(loadMs).phase : null, now)
    if (consumeAnyKey()) advanceTitle()
  } else {
    t = Math.min(1, t + dt / BEAT_MS)
    phaseMs += dt
    // Advice needs longer on screen than a shrug does.
    if (phase === 'caught' && phaseMs >= (nudge() ? CAUGHT_MS + 1400 : CAUGHT_MS)) restart()
    // Keys during the grace are dropped, not kept for later — or they would skip the screen the moment it ends.
    if (phase === 'won' && consumeAnyKey() && phaseMs >= WON_GRACE_MS) {
      phase = 'map' // the cellar, with the room just escaped lit up
      mapBack = 'title'
      escaped = roomIndex === ROOMS.length - 1
      mapPick = escaped ? roomIndex : roomIndex + 1
      phaseMs = 0
      resetInput()
    }
  }

  if (phase === 'title') renderTitle(ctx, title, titleMode, loadMs, now, STR, wholeCellarBeats(), ROOMS.length, PAR_TOTAL, cellarScore(ROOMS, book.records()))
  else if (phase === 'map') {
    renderCellar(
      ctx,
      { rooms: ROOMS, current: roomIndex, selected: mapPick, records: book.records(), now },
      STR,
    )
  }
  else render(ctx, scene, {
      world, prev, t, now, thrown, aiming, caughtBy, bittenBy, won: phase === 'won',
      record: phase === 'won' && lastRun ? { best: lastRun.records[room.name]!, isNew: lastRun.isNew } : null,
      replaying: phase === 'replay',
      bestRunKept: book.bestRun(room.name) !== null,
      toast: toast?.text ?? null,
      canUndo: history.length > 0,
      nudge: phase === 'caught' ? nudge() : null,
      guide: phase === 'play' ? guidance : null,
    }, STR)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

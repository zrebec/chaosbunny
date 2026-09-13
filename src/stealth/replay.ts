/**
 * A run is its actions. The beat is deterministic — the same room and the same
 * actions always make the same beats — so a replay stores nothing but what Randy
 * did, one character per beat, and plays it back through `beat()`.
 *
 * | char | action     | char | action      |
 * |------|------------|------|-------------|
 * | `U`  | step up    | `u`  | throw up    |
 * | `R`  | step right | `r`  | throw right |
 * | `D`  | step down  | `d`  | throw down  |
 * | `L`  | step left  | `l`  | throw left  |
 * | `E`  | ears       | `.`  | wait        |
 *
 * This is zx-kit's "Action Replay" idea (seed + timed inputs) in its simplest
 * form: a room is its own seed, and a beat is the timing. Build it in the game,
 * extract it into the kit when a second game wants it.
 */
import { beat, startWorld, type Action, type BeatResult } from './beat.js'
import type { Dir } from './grid.js'
import type { Room } from './room.js'

const MOVE: Readonly<Record<Dir, string>> = { up: 'U', right: 'R', down: 'D', left: 'L' }
const DIR_OF: Readonly<Record<string, Dir>> = { U: 'up', R: 'right', D: 'down', L: 'left' }

export function encodeRun(actions: readonly Action[]): string {
  return actions
    .map((a) => {
      switch (a.kind) {
        case 'move': return MOVE[a.dir]
        case 'throw': return MOVE[a.dir].toLowerCase()
        case 'ears': return 'E'
        case 'wait': return '.'
      }
    })
    .join('')
}

/** Decodes a run; throws on a character that is not an action. */
export function decodeRun(run: string): Action[] {
  return [...run].map((ch, i) => {
    if (ch === 'E') return { kind: 'ears' }
    if (ch === '.') return { kind: 'wait' }
    const dir = DIR_OF[ch.toUpperCase()]
    if (!dir) throw new Error(`run: '${ch}' at ${i} is not an action`)
    return ch === ch.toUpperCase() ? { kind: 'move', dir } : { kind: 'throw', dir }
  })
}

/**
 * Plays a run from the start of the room. Stops early at the first beat that is
 * not `ok` — a win, a catch, or a `blocked` beat that means the run does not fit
 * this room (a room that changed since the run was recorded).
 */
export function playRun(room: Room, actions: readonly Action[]): BeatResult[] {
  const out: BeatResult[] = []
  let world = startWorld(room)
  for (const action of actions) {
    const r = beat(room, world, action)
    out.push(r)
    if (r.outcome !== 'ok') break
    world = r.world
  }
  return out
}

/** Whether a run, played from the start, walks out of the door. */
export function runWins(room: Room, actions: readonly Action[]): boolean {
  return playRun(room, actions).at(-1)?.outcome === 'won'
}

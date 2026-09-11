/**
 * Proves a room. A breadth-first search over every state the room can reach —
 * Randy's cell, ears, carrots, the carrots on the floor, and every fox's full
 * state — returns the shortest sequence of actions that walks out of the door,
 * or `null` if there is none.
 *
 * The state space is finite (foxes loop, the room is 16×11), so the search always
 * ends; `maxStates` is only a guard against a room that is far bigger than intended.
 *
 * This is the guarantee Minefield gives its fields, applied to a stealth room: a
 * room that ships has a solution, and a test says so.
 */
import { DIRS, cellKey } from './grid.js'
import { beat, startWorld, type Action, type World } from './beat.js'
import type { Room } from './room.js'

export interface SolveOptions {
  /** Allow throwing carrots (default true). Off, it answers "can this room be done without one?" */
  readonly throws?: boolean
  /** Allow ears up/down (default true). Off, Randy keeps his ears up the whole way. */
  readonly ears?: boolean
  readonly maxStates?: number
}

export function worldKey(w: World): string {
  const r = w.randy
  const items = w.items.map(cellKey).sort().join(';')
  const foxes = w.foxes
    .map((f) => `${cellKey(f.cell)}:${f.facing}:${f.routeIndex}:${f.mode}:${f.resume}:${f.timer}:${f.target ? cellKey(f.target) : '-'}`)
    .join('|')
  return `${cellKey(r.cell)}:${r.earsDown ? 1 : 0}:${r.carrots}/${items}/${foxes}`
}

export function actionsFor(throws: boolean, ears: boolean): Action[] {
  const actions: Action[] = DIRS.map((dir) => ({ kind: 'move', dir }) as const)
  actions.push({ kind: 'wait' })
  if (ears) actions.push({ kind: 'ears' })
  if (throws) actions.push(...DIRS.map((dir) => ({ kind: 'throw', dir }) as const))
  return actions
}

/** The shortest winning action sequence, or `null` if the room cannot be left. */
export function solve(room: Room, options: SolveOptions = {}): Action[] | null {
  const actions = actionsFor(options.throws ?? true, options.ears ?? true)
  const maxStates = options.maxStates ?? 500_000
  const start = startWorld(room)
  const parent = new Map<string, { prev: string; action: Action } | null>([[worldKey(start), null]])
  const queue: World[] = [start]

  for (let head = 0; head < queue.length; head++) {
    const world = queue[head]!
    const key = worldKey(world)
    for (const action of actions) {
      const result = beat(room, world, action)
      if (result.outcome === 'blocked' || result.outcome === 'caught') continue
      if (result.outcome === 'won') {
        const path: Action[] = [action]
        for (let at = parent.get(key); at; at = parent.get(at.prev)) path.push(at.action)
        return path.reverse()
      }
      const next = worldKey(result.world)
      if (parent.has(next)) continue
      if (parent.size >= maxStates) throw new Error(`${room.name}: more than ${maxStates} states — is the room too open?`)
      parent.set(next, { prev: key, action })
      queue.push(result.world)
    }
  }
  return null
}

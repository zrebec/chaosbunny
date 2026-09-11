import { beat, startWorld, type Action, type BeatResult, type World } from '../../src/stealth/beat.js'
import { parseRoom, ROOM_COLS, ROOM_ROWS, type PatrolSource, type Room } from '../../src/stealth/room.js'

/** A small map in the top-left corner of an otherwise solid 16×11 room. */
export function testRoom(map: readonly string[], patrols: readonly PatrolSource[] = [], carrots = 0): Room {
  const rows = Array.from({ length: ROOM_ROWS }, (_, y) => (map[y] ?? '').padEnd(ROOM_COLS, '#'))
  return parseRoom({ name: 'test', rows, patrols, carrots })
}

/** Plays actions from the start and returns every result, stopping at the first that is not `ok`. */
export function play(room: Room, actions: readonly Action[], from: World = startWorld(room)): BeatResult[] {
  const results: BeatResult[] = []
  let world = from
  for (const action of actions) {
    const r = beat(room, world, action)
    results.push(r)
    if (r.outcome !== 'ok') break
    world = r.world
  }
  return results
}

export const move = (dir: 'up' | 'down' | 'left' | 'right'): Action => ({ kind: 'move', dir })
export const toss = (dir: 'up' | 'down' | 'left' | 'right'): Action => ({ kind: 'throw', dir })
export const EARS: Action = { kind: 'ears' }
export const WAIT: Action = { kind: 'wait' }

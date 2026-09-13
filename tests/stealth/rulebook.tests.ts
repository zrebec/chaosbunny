/**
 * The rulebook, pinned. Every number and every rule in `RULES.md` §🔴 is held here,
 * so that changing one is a loud, deliberate act rather than a quiet one.
 *
 * Why this file exists: eighteen rooms have a `par` the solver computed and their
 * tests pinned. Almost every "small improvement" to a rule rewrites all eighteen at
 * once — and usually *silently*, because the room stays winnable, just for a
 * different number of beats, a different fairness and a different nudge. The room
 * tests do catch that, but they report it as "room07 par 22 != 24", which reads
 * like a broken room rather than a changed rule.
 *
 * This file says what actually happened, in one line, before the other fifty do.
 *
 * It holds no room's solution and never may: every fixture here is a three-cell
 * corridor built for the test.
 */
import { describe, expect, it } from 'vitest'
import { CREAK_HEARING, SNEAK_STEPS, THROW_RANGE, WADE_BEATS, beat, startWorld } from '../../src/stealth/beat.js'
import { BAT_CIRCLE_BEATS, BAT_HEARING, BAT_SPEED } from '../../src/stealth/bat.js'
import { LAMP_REACH } from '../../src/stealth/light.js'
import { EAT_BEATS, HEARING } from '../../src/stealth/patrol.js'
import { MAX_LAMPS, ROOM_COLS, ROOM_ROWS } from '../../src/stealth/room.js'
import { SIGHT_RANGE, spots } from '../../src/stealth/rules.js'
import { worldKey } from '../../src/stealth/solver.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { move, testRoom, WAIT } from './helpers.js'

/**
 * The sentence a broken rule gets to say for itself. Vitest prints the actual value
 * underneath as "Received", so this says what the pinned one was and what it cost.
 */
const broke = (name: string, was: number | string, what: string): string =>
  `\n\n🔴 ZMENIL SI PRAVIDLO HRY — ${name}\n`
  + `   ${what}\n`
  + `   Pripnuta hodnota je ${was}; aktualna je nizsie ako "Received".\n`
  + `   Toto prepise par a ferovost VSETKYCH ${ROOM_SOURCES.length} izieb a znehodnoti ulozene rekordy.\n`
  + '   Precitaj RULES.md §R1. Prepocitat: KIND=ladder npm run roomgen\n'

describe('the rulebook — RULES.md §R1, the constants that are the game', () => {
  // Each line is one number the solver used to prove every room. See RULES.md §R1.
  const PINNED: ReadonlyArray<readonly [name: string, value: number, was: number, what: string]> = [
    ['SNEAK_STEPS', SNEAK_STEPS, 2, 'Kolko krokov kupia sklopene usi (dribling).'],
    ['THROW_RANGE', THROW_RANGE, 3, 'Ako daleko leti mrkva.'],
    ['CREAK_HEARING', CREAK_HEARING, 3, 'Ako daleko pocut vrzgnutie dosky.'],
    ['WADE_BEATS', WADE_BEATS, 2, 'Kolko beatov stoji krok do vody.'],
    ['HEARING', HEARING, 5, 'Ako daleko liska pocuje dopad mrkvy.'],
    ['EAT_BEATS', EAT_BEATS, 2, 'Kolko beatov je liska pri mrkve slepa.'],
    ['SIGHT_RANGE', SIGHT_RANGE, 4, 'Dosah kuzela.'],
    ['LAMP_REACH', LAMP_REACH, 3, 'Ako daleko svieti lampa, v krokoch cez vsetko okrem steny.'],
    ['BAT_HEARING', BAT_HEARING, 4, 'Ako daleko netopier pocuje.'],
    ['BAT_SPEED', BAT_SPEED, 2, 'Kolko buniek preleti netopier za beat.'],
    ['BAT_CIRCLE_BEATS', BAT_CIRCLE_BEATS, 2, 'Kolko beatov kruzi netopier nad zvukom.'],
    ['MAX_LAMPS', MAX_LAMPS, 8, 'Kolko lamp znesie stav sveta (jeden bit kazda).'],
    ['ROOM_COLS', ROOM_COLS, 16, 'Sirka izby v bunkach.'],
    ['ROOM_ROWS', ROOM_ROWS, 11, 'Vyska izby v bunkach.'],
  ]

  it.each(PINNED)('%s is still %i', (name, value, was, what) => {
    expect(value, broke(name, was, what)).toBe(was)
  })

  it('the cone is still 1 cell ahead, then 3 wide out to 4 — the shape, not just the range', () => {
    // A fox at (6,1) facing left, in an open hall with nothing to block it and room
    // on both sides for the cone's full width. Every cell it can see is collected by
    // asking `spots` about each one in turn.
    const room = testRoom(
      ['................', '................', '................', 'R..............D'],
      [{ route: [[6, 1]], facing: 'left' }],
    )
    const fox = { x: 6, y: 1 }
    const seen: string[] = []
    for (let y = 0; y < ROOM_ROWS; y++) {
      for (let x = 0; x < ROOM_COLS; x++) {
        const s = spots(room, fox, 'left', { x, y }, false)
        if (s) seen.push(`${s.forward},${s.lateral}`)
      }
    }
    expect(seen.sort(), broke('HALF_CONE', 7, 'Tvar kuzela — tabulka v rules.ts, nie vzorec.')).toEqual(
      ['1,0', '2,-1', '2,0', '2,1', '3,-1', '3,0', '3,1', '4,-1', '4,0', '4,1'].sort(),
    )
  })
})

describe('the rulebook — RULES.md §R2, water is time and never sound', () => {
  // Randy wades at (3,1); a guard stands three cells away, well inside HEARING.
  const room = testRoom(
    ['################', '#R.w...D', '#.......'],
    [{ route: [[5, 2]], facing: 'down' }],
  )

  it('a wade is heard by the player and by nobody in the room', () => {
    const world = beat(room, startWorld(room), move('right')).world
    const wade = beat(room, world, move('right'))

    expect(wade.events.some((e) => e.type === 'wade'), 'the player must hear the splash').toBe(true)
    expect(
      wade.events.some((e) => e.type === 'heard' || e.type === 'batHeard'),
      '\n\n🔴 ZMENIL SI PRAVIDLO HRY — voda zacala byt hluk\n'
      + '   Liska pocula sploschnutie. Voda je pravidlo o CASE, nie o zvuku.\n'
      + '   Izba 15 (Zaplava) sa neda prejst suchou nohou — ak ju voda prezradi, moze byt neprejditelna.\n'
      + '   Precitaj RULES.md §R2.\n',
    ).toBe(false)
    expect(wade.world.foxes[0]!.mode, 'the guard must not have been diverted').toBe('patrol')
  })

  it('but it does cost the clock two beats, and the world two turns', () => {
    const world = beat(room, startWorld(room), move('right')).world
    const wade = beat(room, world, move('right'))
    expect(wade.world.beats - world.beats, broke('WADE_BEATS', 2, 'Kolko beatov stoji krok do vody.')).toBe(WADE_BEATS)
  })
})

describe('the rulebook — RULES.md §R3, two chances and never one', () => {
  // A corridor with a guard at (3,1) looking left, straight down it at Randy.
  const room = testRoom(['################', '#R.....D'], [{ route: [[3, 1]], facing: 'left' }])

  it('seen from a distance is a `?`, and the room goes on', () => {
    const r = beat(room, startWorld(room), WAIT)
    expect(
      r.outcome,
      '\n\n🔴 ZMENIL SI PRAVIDLO HRY — zbadanie z dialky zacalo byt chytenie\n'
      + '   `?` je varovanie, nie prehra. Cela izba 2 je postavena na tomto jedinom pravidle.\n'
      + '   Precitaj RULES.md §R3.\n',
    ).toBe('ok')
    expect(r.world.foxes[0]!.mode).toBe('suspicious')
    expect(r.events.some((e) => e.type === 'suspicious')).toBe(true)
  })

  it('a `?` fox stands still — that frozen beat is the tool the room is built on', () => {
    const spotted = beat(room, startWorld(room), WAIT).world
    const after = beat(room, spotted, move('up')) // out of the cone, into the wall: blocked, so ask the fox directly
    expect(after.outcome).toBe('blocked')
    // The fox has not moved and will not, while it is suspicious.
    expect(spotted.foxes[0]!.cell).toEqual({ x: 3, y: 1 })
  })

  it('but right in front of its nose is the end', () => {
    const r = beat(room, startWorld(room), move('right')) // (1,1) → (2,1): forward 1, lateral 0
    expect(
      r.outcome,
      '\n\n🔴 ZMENIL SI PRAVIDLO HRY — chytenie spred nosa prestalo platit\n'
      + '   Chyti len `forward === 1 && lateral === 0` v smere, ktorym sa liska pozera.\n'
      + '   Precitaj RULES.md §R3.\n',
    ).toBe('caught')
    expect(r.events.some((e) => e.type === 'caught' && e.why === 'seen')).toBe(true)
  })

  it('and standing beside or behind a fox is not being seen at all', () => {
    const fox = { x: 3, y: 1 }
    expect(spots(room, fox, 'left', { x: 4, y: 1 }, false), 'behind its tail').toBeNull()
    expect(spots(room, fox, 'left', { x: 3, y: 2 }, false), 'at its flank').toBeNull()
  })
})

describe('the rulebook — RULES.md §R7, beat() is pure and deterministic', () => {
  const room = testRoom(
    ['################', '#R.....D', '#.......'],
    [{ route: [[5, 1], [5, 2]] }],
  )

  it('the same room and the same action always give the same world', () => {
    const start = startWorld(room)
    const once = beat(room, start, move('right'))
    const twice = beat(room, start, move('right'))
    expect(
      worldKey(once.world),
      '\n\n🔴 ZMENIL SI PRAVIDLO HRY — beat() prestala byt deterministicka\n'
      + '   Solver prechadza statisice stavov a testy sa pytaju tu istu otazku dvakrat.\n'
      + '   Ziadny Math.random, Date.now ani globalny stav v beat/patrol/bat/rules/light.\n'
      + '   Precitaj RULES.md §R7.\n',
    ).toBe(worldKey(twice.world))
    expect(once.outcome).toBe(twice.outcome)
    expect(once.events).toEqual(twice.events)
  })

  it('and it never mutates the world it was given', () => {
    const start = startWorld(room)
    const before = worldKey(start)
    beat(room, start, move('right'))
    beat(room, start, WAIT)
    expect(worldKey(start)).toBe(before)
  })
})

describe('the rulebook — RULES.md §R4, a room id is a player\'s record', () => {
  it('every room id is unique, so no record can land on the wrong room', () => {
    const names = ROOM_SOURCES.map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('the ids are pinned: renaming one throws away that room\'s saved records', () => {
    expect(
      ROOM_SOURCES.map((r) => r.name),
      '\n\n🔴 PREMENOVAL SI IZBU\n'
      + '   Id izby je kluc, pod ktorym je v localStorage ulozeny rekord hraca a zaznam behu.\n'
      + '   Poradie sa meni v rooms/index.ts, nikdy premenovanim. Precitaj RULES.md §R4.\n',
    ).toEqual([
      'room01', 'room1b', 'room2b', 'room3b', 'room02', 'room03', 'room04', 'room05', 'room06',
      'room07', 'room08', 'room09', 'room10', 'room16', 'room13', 'room14', 'room12', 'room11',
    ])
  })
})

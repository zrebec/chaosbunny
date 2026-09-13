import { describe, it, expect } from 'vitest'
import designDoc from '../../docs/stealth-design.md?raw'
import readme from '../../README.md?raw'
import roadmap from '../../docs/ROADMAP.md?raw'
import main from '../../src/stealth/main.ts?raw'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { LOCALES, SPOKEN_RULES } from '../../src/stealth/strings.js'
import type { Want } from '../../src/stealth/wants.js'

/**
 * The design doc carries a table generated from the rooms themselves
 * (`KIND=ladder npm run roomgen`). Documents rot quietly, and this one is where the
 * numbers are read from — so the table is held to the rooms, and the failure message
 * says how to put it right.
 */
const DOC = 'docs/stealth-design.md'

/** Both documents and the design doc's tally count in words, as prose does. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
]

const REGENERATE = `run \`KIND=ladder npm run roomgen\` and paste the table into ${DOC}`

interface Row { readonly place: number; readonly name: string; readonly id: string; readonly par: number }

function tableRows(): Row[] {
  return designDoc
    .split('\n')
    .map((line: string) => /^\| (\d+) \| ([^|]+) \| `([^`]+)` \| (\d+) \|/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ place: Number(m[1]), name: m[2]!.trim(), id: m[3]!, par: Number(m[4]) }))
}

describe('the design doc', () => {
  const rows = tableRows()

  it('has a row for every room that ships', () => {
    expect(rows.length, REGENERATE).toBe(ROOM_SOURCES.length)
  })

  it('lists them in the order they are played, by id', () => {
    expect(rows.map((r) => r.id), REGENERATE).toEqual(ROOM_SOURCES.map((r) => r.name))
    expect(rows.map((r) => r.place), REGENERATE).toEqual(ROOM_SOURCES.map((_, i) => i + 1))
  })

  it('quotes the par each room actually declares', () => {
    expect(rows.map((r) => r.par), REGENERATE).toEqual(ROOM_SOURCES.map((r) => r.par))
  })

  it('calls each room what the game calls it', () => {
    expect(rows.map((r) => r.name), REGENERATE).toEqual(LOCALES.en.roomNames.map((n) => n.toLowerCase()))
  })
})

/**
 * The two documents a newcomer reads first both count the rooms in words, and a count
 * in prose is the first thing to rot. Any "<word> rooms" in them has to be the truth.
 *
 * Which means the phrase is reserved: "two rooms use it now" in a paragraph about water
 * fails this test, and rightly — a reader skimming for the size of the game would read
 * it as the total. Write "one room offers it and the next demands it" instead.
 */
describe('the documents that count the rooms', () => {
  it.each([['README.md', readme], ['docs/ROADMAP.md', roadmap]])('%s says how many rooms there really are', (file, text) => {
    const counts = [...text.matchAll(/\*{0,2}(\w+) rooms\*{0,2}/g)]
      .map((m) => WORDS.indexOf(m[1]!.toLowerCase()))
      .filter((n) => n > 0)
    expect(counts.length, `${file} should count the rooms somewhere`).toBeGreaterThan(0)
    for (const n of counts) expect(n, `${file}: says ${WORDS[n]} rooms`).toBe(ROOM_SOURCES.length)
  })
})

/**
 * The design doc counts, in prose, how many rooms want each verb — the kind of sentence
 * a new room ages the moment it ships. The tally is short enough to write out and cheap
 * enough to rebuild from the rooms' own declarations (no solver: `wants.tests.ts` is
 * what proves those honest), so the doc is held to the exact sentence.
 */
describe('the design doc tally of what rooms want', () => {
  it('counts each want the way the rooms declare it', () => {
    const n = (want: Want): string => WORDS[ROOM_SOURCES.filter((r) => (r.wants ?? []).includes(want)).length]!
    const timing = WORDS[ROOM_SOURCES.filter((r) => (r.wants ?? []).length === 0).length]!
    const sentence =
      `the ears down in ${n('dark')} rooms, a carrot in ${n('carrot')}, a lamp out in ${n('lampOut')}, the lever in\n` +
      `   ${n('lever')}, wet feet in ${n('water')}, and nothing but timing in ${timing}`
    expect(designDoc, `${DOC} should say: ${sentence.replace(/\n +/, ' ')}`).toContain(sentence)
  })
})

/**
 * Both documents count, in prose, how many rules the game says out loud at the beat they
 * bite. That number went from four to seven in one morning and both documents said four,
 * then one of them said six because the lever's line was forgotten in the counting. It is
 * derivable — every one of them is a `…Hint` string — so it is derived.
 */
describe('the documents that count the spoken rules', () => {
  const spoken = SPOKEN_RULES.length

  it('names only strings that exist', () => {
    for (const key of SPOKEN_RULES) expect(LOCALES.en[key], `${key} is not a string any more`).toBeTruthy()
  })

  it('names exactly the hints the game actually speaks', () => {
    // The list lives in `strings.ts` and the speaking lives in `main.ts`; without this
    // they drift, and the drift is invisible — a hint nobody says still has a string,
    // and a hint said but unlisted makes both documents undercount by one. Which is
    // exactly what happened to the lever's line within an hour of writing it.
    const said = [...main.matchAll(/STR\.(\w+Hint)\b/g)].map((m) => m[1]!)
    expect([...new Set(said)].sort()).toEqual([...SPOKEN_RULES].sort())
  })

  it.each([['README.md', readme], [DOC, designDoc]])('%s says how many rules the game speaks', (file, text) => {
    const counts = [...text.matchAll(/(\w+) (?:rules the rooms rely on|of them are now said)/g)]
      .map((m) => WORDS.indexOf(m[1]!.toLowerCase()))
      .filter((n) => n > 0)
    expect(counts.length, `${file} should count the spoken rules`).toBeGreaterThan(0)
    for (const n of counts) expect(n, `${file}: says ${WORDS[n]}, there are ${spoken}`).toBe(spoken)
  })
})

/**
 * The HUD's bottom line is a legend: a letter, then what it does. It is the only key
 * list a player sees while playing, so every letter on it has to be a letter the game
 * actually listens for — and one the README explains, since that is where somebody
 * goes when the legend is too terse. Both tongues must name the same keys, too: a
 * translation that quietly drops one teaches half the players a smaller game.
 *
 * `H` was added to the legend the same hour the rules screen learned to open mid-room;
 * this test is what makes the next such letter impossible to forget.
 */
describe('the HUD key legend', () => {
  /** Standalone capitals in a legend line: `Z USI X HOD U SPAT C MAPA R H` → Z X U C R H. */
  const letters = (hints: string): string[] => [...hints.matchAll(/(?:^| )([A-Z])(?= |$)/g)].map((m) => m[1]!)

  const en = letters(LOCALES.en.hints)
  const sk = letters(LOCALES.sk.hints)

  it('names the same keys in both tongues', () => {
    expect([...sk].sort()).toEqual([...en].sort())
  })

  it('names only keys the game listens for', () => {
    const handled = new Set([
      ...[...main.matchAll(/e\.key === '([A-Za-z])'/g)].map((m) => m[1]!.toUpperCase()),
      ...[...main.matchAll(/^ *case '([A-Za-z])':/gm)].map((m) => m[1]!.toUpperCase()),
    ])
    for (const key of en) expect([...handled], `the HUD offers ${key}`).toContain(key)
  })

  it('names only keys the README explains', () => {
    for (const key of en) expect(readme, `README should have a row for ${key}`).toContain(`| \`${key}\``)
  })
})

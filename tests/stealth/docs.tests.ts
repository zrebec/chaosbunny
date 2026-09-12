import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { LOCALES } from '../../src/stealth/strings.js'

/**
 * The design doc carries a table generated from the rooms themselves
 * (`KIND=ladder npm run roomgen`). Documents rot quietly, and this one is where the
 * numbers are read from — so the table is held to the rooms, and the failure message
 * says how to put it right.
 */
const DOC = 'docs/stealth-design.md'
const REGENERATE = `run \`KIND=ladder npm run roomgen\` and paste the table into ${DOC}`

interface Row { readonly place: number; readonly name: string; readonly id: string; readonly par: number }

function tableRows(): Row[] {
  const doc = readFileSync(DOC, 'utf8')
  return doc
    .split('\n')
    .map((line) => /^\| (\d+) \| ([^|]+) \| `([^`]+)` \| (\d+) \|/.exec(line))
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

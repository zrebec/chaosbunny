import { describe, it, expect } from 'vitest'
import { LOCALES, roomLabel, STR, type Strings } from '../../src/stealth/strings.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'

/** Every line the game draws, with sample numbers where a line takes one. */
function lines(s: Strings): [string, string][] {
  const out: [string, string][] = []
  for (const [name, value] of Object.entries(s) as [string, unknown][]) {
    if (typeof value === 'string') out.push([name, value])
    else if (Array.isArray(value)) value.forEach((line, i) => out.push([`${name}[${i}]`, String(line)]))
    else if (typeof value === 'function') {
      const f = value as (n: number | boolean) => string | readonly string[]
      for (const [label, arg] of [['', 88], ['(true)', true], ['(false)', false]] as const) {
        const got = f(arg)
        if (typeof got === 'string') out.push([`${name}${label}`, got])
        else got.forEach((line, i) => out.push([`${name}${label}[${i}]`, line]))
      }
    }
  }
  return out
}

describe('the strings', () => {
  it('all fit the 32 columns of the screen', () => {
    for (const [name, line] of lines(STR)) expect(line.length, `${name}: "${line}"`).toBeLessThanOrEqual(32)
  })

  it('use only glyphs the ROM font has — ASCII, no diacritics', () => {
    for (const [name, line] of lines(STR)) expect(/^[\x20-\x7e]*$/.test(line), `${name}: "${line}"`).toBe(true)
  })

  it('says nothing twice: each key has its own line', () => {
    // Blank lines in a block of prose are spacing, not text.
    const strings = lines(STR).filter(([name, line]) => !name.includes('(') && !name.includes('[') && line !== '')
    const seen = new Map<string, string>()
    for (const [name, line] of strings) {
      const clash = seen.get(line)
      expect(clash, `${name} and ${clash} are both "${line}"`).toBeUndefined()
      seen.set(line, name)
    }
  })
})

describe('the screens at either end', () => {
  it('both fit above the prompt, however long the tale is', () => {
    const storyBottom = 56 + (STR.story(12).length - 1) * 14 + 8
    expect(storyBottom, `story: ${STR.story(12).length} lines reach ${storyBottom}px`).toBeLessThan(176)
    // The ending carries one more line under it: the beats for the whole cellar.
    const endBottom = 56 + STR.ending(12).length * 14 + 8 + 8
    expect(endBottom, `ending: ${STR.ending(12).length} lines reach ${endBottom}px`).toBeLessThan(176)
  })
})

describe('the cellar has names', () => {
  it('names every room that ships, in both tongues', () => {
    for (const [code, s] of Object.entries(LOCALES)) {
      expect(s.roomNames.length, `${code} names`).toBe(ROOM_SOURCES.length)
      for (const [i, name] of s.roomNames.entries()) expect(name.length, `${code} ${i}`).toBeGreaterThan(2)
    }
  })

  it('fits a name and its number across the screen', () => {
    for (const [code, s] of Object.entries(LOCALES)) {
      for (let i = 0; i < s.roomNames.length; i++) {
        const label = roomLabel(s, i)
        expect(label.length, `${code}: "${label}"`).toBeLessThanOrEqual(32)
      }
    }
  })

  it('falls back to the number when a room has outgrown the names', () => {
    expect(roomLabel(STR, 99)).toBe(STR.roomToast(100))
  })
})

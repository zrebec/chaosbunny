import { describe, it, expect } from 'vitest'
import { STR, type Strings } from '../../src/stealth/strings.js'

/** Every line the game draws, with sample numbers where a line takes one. */
function lines(s: Strings): [string, string][] {
  const out: [string, string][] = []
  for (const [name, value] of Object.entries(s) as [string, unknown][]) {
    if (typeof value === 'string') out.push([name, value])
    else if (Array.isArray(value)) value.forEach((line, i) => out.push([`${name}[${i}]`, String(line)]))
    else if (typeof value === 'function') {
      const f = value as (n: number | boolean) => string
      out.push([name, f(88)], [`${name}(true)`, f(true)], [`${name}(false)`, f(false)])
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

describe('the story screen', () => {
  it('fits above the prompt, however long the tale is', () => {
    const bottom = 56 + (STR.story.length - 1) * 14 + 8
    expect(bottom, `${STR.story.length} lines reach ${bottom}px`).toBeLessThan(176)
  })
})

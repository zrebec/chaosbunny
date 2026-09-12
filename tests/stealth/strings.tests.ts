import { describe, it, expect } from 'vitest'
import { STR, type Strings } from '../../src/stealth/strings.js'

/** Every line the game draws, with sample numbers where a line takes one. */
function lines(s: Strings): [string, string][] {
  const out: [string, string][] = []
  for (const [name, value] of Object.entries(s) as [string, unknown][]) {
    if (typeof value === 'string') out.push([name, value])
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
    const strings = lines(STR).filter(([name]) => !name.includes('('))
    const seen = new Map<string, string>()
    for (const [name, line] of strings) {
      const clash = seen.get(line)
      expect(clash, `${name} and ${clash} are both "${line}"`).toBeUndefined()
      seen.set(line, name)
    }
  })
})

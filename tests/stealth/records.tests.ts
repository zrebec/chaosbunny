import { afterEach, describe, it, expect } from 'vitest'
import { countIn, openRecords, recordRun, sanitize, sanitizeRuns, sanitizeStats } from '../../src/stealth/records.js'

describe('recordRun', () => {
  it('takes the first finish as the record', () => {
    expect(recordRun({}, 'room01', 20)).toEqual({ records: { room01: 20 }, previous: null, isNew: true })
  })

  it('keeps the record on a slower or equal run, and beats it on a faster one', () => {
    expect(recordRun({ room01: 15 }, 'room01', 18)).toMatchObject({ isNew: false, previous: 15, records: { room01: 15 } })
    expect(recordRun({ room01: 15 }, 'room01', 15).isNew).toBe(false)
    expect(recordRun({ room01: 15 }, 'room01', 13)).toMatchObject({ isNew: true, previous: 15, records: { room01: 13 } })
  })

  it('never touches another room', () => {
    expect(recordRun({ room02: 30 }, 'room01', 14).records).toEqual({ room01: 14, room02: 30 })
  })
})

describe('sanitize', () => {
  it('keeps whole positive beat counts and drops anything else', () => {
    expect(sanitize({ a: 12, b: 0, c: -3, d: 1.5, e: '9', f: null })).toEqual({ a: 12 })
    expect(sanitize(null)).toEqual({})
    expect(sanitize('nonsense')).toEqual({})
  })
})

describe('sanitizeRuns', () => {
  it('keeps runs made of action characters, for rooms that have a record', () => {
    expect(sanitizeRuns({ a: 'URE.l', b: 'U?R', c: 42, d: 'UU' }, { a: 5, b: 3, c: 1 })).toEqual({ a: 'URE.l' })
    expect(sanitizeRuns(undefined, { a: 5 })).toEqual({})
  })
})

describe('sanitizeStats and countIn', () => {
  it('keeps whole non-negative counts and reads anything else as zero', () => {
    expect(sanitizeStats({ a: { attempts: 3, caught: 2 }, b: { attempts: -1, caught: 1.5 }, c: 'x' }))
      .toEqual({ a: { attempts: 3, caught: 2 }, b: { attempts: 0, caught: 0 } })
    expect(sanitizeStats(null)).toEqual({})
  })

  it('counts one more without touching the other field or another room', () => {
    const once = countIn({ b: { attempts: 1, caught: 1 } }, 'a', 'attempts')
    expect(once).toEqual({ a: { attempts: 1, caught: 0 }, b: { attempts: 1, caught: 1 } })
    expect(countIn(once, 'a', 'caught').a).toEqual({ attempts: 1, caught: 1 })
  })
})

describe('openRecords', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete (globalThis as { localStorage?: unknown }).localStorage
  })

  function fakeStorage(): Storage {
    const m = new Map<string, string>()
    return {
      get length() { return m.size },
      clear: () => m.clear(),
      getItem: (k) => m.get(k) ?? null,
      key: (i) => [...m.keys()][i] ?? null,
      removeItem: (k) => { m.delete(k) },
      setItem: (k, v) => { m.set(k, String(v)) },
    }
  }

  it('remembers a record across a reload', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage(), configurable: true })
    const first = openRecords()
    expect(first.finish('room02', 34).isNew).toBe(true)
    expect(first.finish('room02', 31).isNew).toBe(true)
    const again = openRecords()
    expect(again.records()).toEqual({ room02: 31 })
    expect(again.finish('room02', 33)).toMatchObject({ isNew: false, previous: 31 })
  })

  it('keeps the run that set the record, and drops it when a record comes without one', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage(), configurable: true })
    const book = openRecords()
    book.finish('room01', 14, 'UURE')
    expect(openRecords().bestRun('room01')).toBe('UURE')
    book.finish('room01', 15, 'UUUUU') // slower: nothing changes
    expect(openRecords().bestRun('room01')).toBe('UURE')
    book.finish('room01', 13)
    expect(openRecords().bestRun('room01')).toBeNull()
  })

  it('loads a version 1 save — beats only — without losing a record', () => {
    const storage = fakeStorage()
    storage.setItem('zxkit:chaosbunny-stealth:default', JSON.stringify({ version: 1, timestamp: 1, data: { best: { room02: 31 } } }))
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
    const book = openRecords()
    expect(book.records()).toEqual({ room02: 31 })
    expect(book.bestRun('room02')).toBeNull()
  })

  it('remembers attempts and catches across a reload', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage(), configurable: true })
    const book = openRecords()
    book.attempt('room02')
    book.attempt('room02')
    book.caught('room02')
    expect(openRecords().stats()).toEqual({ room02: { attempts: 2, caught: 1 } })
  })

  it('loads a version 2 save — beats and runs — keeping the runs and counting nothing yet', () => {
    const storage = fakeStorage()
    storage.setItem('zxkit:chaosbunny-stealth:default', JSON.stringify({
      version: 2, timestamp: 1, data: { best: { room01: 13 }, runs: { room01: 'UURE' } },
    }))
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
    const book = openRecords()
    expect(book.records()).toEqual({ room01: 13 })
    expect(book.bestRun('room01')).toBe('UURE')
    expect(book.stats()).toEqual({})
  })

  it('keeps playing when there is no storage at all', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    const book = openRecords()
    expect(book.finish('room01', 13).isNew).toBe(true)
    expect(book.records()).toEqual({ room01: 13 })
  })
})

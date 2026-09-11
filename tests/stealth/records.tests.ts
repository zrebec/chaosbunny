import { afterEach, describe, it, expect } from 'vitest'
import { openRecords, recordRun, sanitize } from '../../src/stealth/records.js'

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

  it('keeps playing when there is no storage at all', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
    const book = openRecords()
    expect(book.finish('room01', 13).isNew).toBe(true)
    expect(book.records()).toEqual({ room01: 13 })
  })
})

/**
 * The fewest beats each room has been left in — and the run that did it — kept
 * between visits with zx-kit's save profiles (`localStorage`, a versioned
 * envelope, typed failures, migration).
 *
 * Losing a record is not worth an error on screen: storage that is disabled or
 * full leaves the game playing, and only the records forget. A record is keyed by
 * the room's `name`, so reordering rooms never moves one to the wrong room.
 *
 * Save versions: 1 kept beats only; 2 adds the record run (`replay.ts` encoding),
 * so a best can be watched again; 3 adds, per room, how many attempts a player began
 * and how many of them a fox or a bat ended — the map shows both. Older saves load
 * with what they had and nothing counted yet.
 */
import { createSaveProfile, readSave, writeSave } from 'zx-kit'

export type Records = Readonly<Record<string, number>>
export type Runs = Readonly<Record<string, string>>

/** One room's history: attempts begun (a run with at least one beat) and catches. */
export interface RoomStats {
  readonly attempts: number
  readonly caught: number
}

export type Stats = Readonly<Record<string, RoomStats>>

const NO_STATS: RoomStats = { attempts: 0, caught: 0 }

export interface Run {
  readonly records: Records
  /** The record for this room before this run, if any. */
  readonly previous: number | null
  readonly isNew: boolean
}

/** Folds a finished run into the records. Pure; a tie is not a new record. */
export function recordRun(records: Records, room: string, beats: number): Run {
  const previous = records[room] ?? null
  const isNew = previous === null || beats < previous
  return { records: isNew ? { ...records, [room]: beats } : records, previous, isNew }
}

/** Keeps only whole positive beat counts — a hand-edited or damaged save loads as far as it is sane. */
export function sanitize(best: unknown): Records {
  const clean: Record<string, number> = {}
  if (typeof best !== 'object' || best === null) return clean
  for (const [room, beats] of Object.entries(best)) {
    if (typeof beats === 'number' && Number.isInteger(beats) && beats > 0) clean[room] = beats
  }
  return clean
}

/** Keeps only runs made of action characters, and only for rooms that have a record. */
export function sanitizeRuns(runs: unknown, records: Records): Runs {
  const clean: Record<string, string> = {}
  if (typeof runs !== 'object' || runs === null) return clean
  for (const [room, run] of Object.entries(runs)) {
    if (typeof run === 'string' && /^[URDLurdlE.]*$/.test(run) && room in records) clean[room] = run
  }
  return clean
}

/** Keeps whole non-negative counts only; anything else in a room's stats reads as zero. */
export function sanitizeStats(stats: unknown): Stats {
  const clean: Record<string, RoomStats> = {}
  if (typeof stats !== 'object' || stats === null) return clean
  const count = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0)
  for (const [room, s] of Object.entries(stats)) {
    if (typeof s !== 'object' || s === null) continue
    const { attempts, caught } = s as { attempts?: unknown; caught?: unknown }
    clean[room] = { attempts: count(attempts), caught: count(caught) }
  }
  return clean
}

/** One more to a room's count. Pure. */
export function countIn(stats: Stats, room: string, field: keyof RoomStats): Stats {
  const now = stats[room] ?? NO_STATS
  return { ...stats, [room]: { ...now, [field]: now[field] + 1 } }
}

interface SaveV3 {
  readonly best: Record<string, number>
  readonly runs: Record<string, string>
  readonly stats: Record<string, RoomStats>
}

export interface RecordBook {
  /** The records as last loaded or set. */
  readonly records: () => Records
  /** The run that set a room's record, if it was kept. */
  readonly bestRun: (room: string) => string | null
  /** Records a win (and the run, encoded), and saves if it set a record. */
  readonly finish: (room: string, beats: number, run?: string) => Run
  /** Every room's attempts and catches so far. */
  readonly stats: () => Stats
  /** Counts an attempt begun in `room`, and saves. */
  readonly attempt: (room: string) => void
  /** Counts a catch in `room`, and saves. */
  readonly caught: (room: string) => void
}

/** Opens the record book and loads what was saved before. Never throws. */
export function openRecords(): RecordBook {
  let records: Records = {}
  let runs: Runs = {}
  let stats: Stats = {}
  const profile = createSaveProfile<SaveV3>({
    key: 'chaosbunny-stealth',
    version: 3,
    serialize: () => ({ best: { ...records }, runs: { ...runs }, stats: { ...stats } }),
    deserialize: (data) => {
      records = sanitize(data.best)
      runs = sanitizeRuns(data.runs, records)
      stats = sanitizeStats(data.stats)
    },
    migrate: (data, fromVersion) => {
      const old = (typeof data === 'object' && data !== null ? data : {}) as { best?: unknown; runs?: unknown }
      const best = sanitize(old.best)
      // Version 1 had no runs; version 2 kept them, and they must survive the step to 3.
      return { best: { ...best }, runs: fromVersion >= 2 ? { ...sanitizeRuns(old.runs, best) } : {}, stats: {} }
    },
  })
  readSave(profile)
  return {
    records: () => records,
    bestRun: (room) => runs[room] ?? null,
    finish: (room, beats, run) => {
      const result = recordRun(records, room, beats)
      if (result.isNew) {
        records = result.records
        // A record without its run must not keep an older run that no longer matches it.
        const { [room]: _stale, ...others } = runs
        runs = run !== undefined ? { ...others, [room]: run } : others
        writeSave(profile)
      }
      return result
    },
    stats: () => stats,
    attempt: (room) => {
      stats = countIn(stats, room, 'attempts')
      writeSave(profile)
    },
    caught: (room) => {
      stats = countIn(stats, room, 'caught')
      writeSave(profile)
    },
  }
}

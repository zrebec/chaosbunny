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
 * so a best can be watched again. Version 1 saves load with no runs.
 */
import { createSaveProfile, readSave, writeSave } from 'zx-kit'

export type Records = Readonly<Record<string, number>>
export type Runs = Readonly<Record<string, string>>

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

interface SaveV2 {
  readonly best: Record<string, number>
  readonly runs: Record<string, string>
}

export interface RecordBook {
  /** The records as last loaded or set. */
  readonly records: () => Records
  /** The run that set a room's record, if it was kept. */
  readonly bestRun: (room: string) => string | null
  /** Records a win (and the run, encoded), and saves if it set a record. */
  readonly finish: (room: string, beats: number, run?: string) => Run
}

/** Opens the record book and loads what was saved before. Never throws. */
export function openRecords(): RecordBook {
  let records: Records = {}
  let runs: Runs = {}
  const profile = createSaveProfile<SaveV2>({
    key: 'chaosbunny-stealth',
    version: 2,
    serialize: () => ({ best: { ...records }, runs: { ...runs } }),
    deserialize: (data) => {
      records = sanitize(data.best)
      runs = sanitizeRuns(data.runs, records)
    },
    migrate: (data) => {
      const old = (typeof data === 'object' && data !== null ? data : {}) as { best?: unknown }
      return { best: { ...sanitize(old.best) }, runs: {} }
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
  }
}

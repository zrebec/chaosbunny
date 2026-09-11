/**
 * The fewest beats each room has been left in, kept between visits with zx-kit's
 * save profiles (`localStorage`, a versioned envelope, typed failures).
 *
 * Losing a record is not worth an error on screen: storage that is disabled or
 * full leaves the game playing, and only the records forget. A record is keyed by
 * the room's `name`, so reordering rooms never moves one to the wrong room.
 */
import { createSaveProfile, readSave, writeSave } from 'zx-kit'

export type Records = Readonly<Record<string, number>>

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

export interface RecordBook {
  /** The records as last loaded or set. */
  readonly records: () => Records
  /** Records a win, and saves if it set a record. */
  readonly finish: (room: string, beats: number) => Run
}

/** Opens the record book and loads what was saved before. Never throws. */
export function openRecords(): RecordBook {
  let records: Records = {}
  const profile = createSaveProfile<{ best: Record<string, number> }>({
    key: 'chaosbunny-stealth',
    version: 1,
    serialize: () => ({ best: { ...records } }),
    deserialize: (data) => {
      records = sanitize(data.best)
    },
  })
  readSave(profile)
  return {
    records: () => records,
    finish: (room, beats) => {
      const run = recordRun(records, room, beats)
      if (run.isNew) {
        records = run.records
        writeSave(profile)
      }
      return run
    },
  }
}

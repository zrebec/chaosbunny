/**
 * Every word the prototype puts on screen, per language, picked once with
 * zx-kit's `pickLocale`. The canvas draws with the ROM font — 96 ASCII glyphs —
 * so the Slovak strings are written without diacritics, as in Minefield.
 * Every line must fit the 32 columns of the screen.
 */
import { pickLocale } from 'zx-kit'
import { LANGUAGE_CODE } from '../config.js'

export interface Strings {
  readonly earsUp: string
  readonly earsDown: string
  readonly carrots: (n: number) => string
  readonly beats: (n: number) => string
  readonly hints: string
  readonly aimHints: string
  readonly caught: string
  readonly won: string
  readonly wonBeats: (n: number) => string
  readonly par: (n: number) => string
  readonly onPar: string
  readonly room: (n: number) => string
  readonly again: string
  /** The command a Spectrum owner typed to load a tape — the same in every language. */
  readonly loadCommand: string
  readonly startPrompt: string
  readonly record: (n: number) => string
  readonly newRecord: string
  /** Win-screen hint: P replays this run, B the record run (when there is one). */
  readonly replayHint: (withBest: boolean) => string
  readonly replaying: string
}

const EN: Strings = {
  earsUp: 'EARS UP',
  earsDown: 'EARS DOWN',
  carrots: (n) => `CARROT ${n}`,
  beats: (n) => `BEAT ${n}`,
  hints: 'Z EARS X THROW SPC WAIT R RESET',
  aimHints: 'THROW: PICK A DIRECTION  X NO',
  caught: 'CAUGHT!',
  won: 'SLIPPED OUT',
  wonBeats: (n) => `IN ${n} BEATS`,
  par: (n) => `PAR ${n}`,
  onPar: 'ON PAR!',
  room: (n) => `R${n}`,
  again: 'ANY KEY: NEXT ROOM',
  loadCommand: 'LOAD ""',
  startPrompt: 'PRESS ANY KEY',
  record: (n) => `BEST ${n}`,
  newRecord: 'NEW BEST!',
  replayHint: (withBest) => (withBest ? 'P REPLAY  B BEST RUN' : 'P REPLAY'),
  replaying: 'REPLAY - ANY KEY STOPS',
}

const SK: Strings = {
  earsUp: 'USI HORE',
  earsDown: 'USI DOLE',
  carrots: (n) => `MRKVA ${n}`,
  beats: (n) => `BEAT ${n}`,
  hints: 'Z USI X HOD MEDZ CAKAJ R ZNOVA',
  aimHints: 'HOD: VYBER SMER SIPKOU  X NIE',
  caught: 'CHYTENY!',
  won: 'PREKLZOL SI',
  wonBeats: (n) => `ZA ${n} BEATOV`,
  par: (n) => `PAR ${n}`,
  onPar: 'NA PAR!',
  room: (n) => `M${n}`,
  again: 'KLAVESA: DALSIA MIESTNOST',
  loadCommand: 'LOAD ""',
  startPrompt: 'STLAC KLAVESU',
  record: (n) => `REKORD ${n}`,
  newRecord: 'NOVY REKORD!',
  replayHint: (withBest) => (withBest ? 'P ZNOVA  B REKORDNY BEH' : 'P ZNOVA POZRIET'),
  replaying: 'ZAZNAM - KLAVESA ZASTAVI',
}

export const STR: Strings = pickLocale(EN, { sk: SK }, LANGUAGE_CODE)

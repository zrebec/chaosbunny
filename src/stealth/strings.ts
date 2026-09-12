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
  /** Under `caught`: the two ways out of a lost room. */
  readonly caughtHint: string
  /** Toast after a beat is taken back. */
  readonly undone: string
  readonly won: string
  readonly wonBeats: (n: number) => string
  readonly par: (n: number) => string
  readonly onPar: string
  readonly room: (n: number) => string
  readonly again: string
  /** The command a Spectrum owner typed to load a tape — the same in every language. */
  readonly loadCommand: string
  readonly startPrompt: string
  /**
   * The screen before the first room: why Randy is down there, told for a cellar of
   * `rooms` rooms so the number is never a lie. Lines of at most 32.
   */
  readonly storyTitle: string
  readonly story: (rooms: number) => readonly string[]
  /** The screen after the last room, and the beats the whole cellar took. */
  readonly endingTitle: string
  readonly ending: (rooms: number) => readonly string[]
  readonly wholeCellar: (n: number) => string
  readonly record: (n: number) => string
  readonly newRecord: string
  /** Win-screen hint: P replays this run, B the record run (when there is one). */
  readonly replayHint: (withBest: boolean) => string
  readonly replaying: string
  /** The map between rooms: its title, and how to leave it. */
  readonly cellar: string
  readonly cellarHint: string
  /**
   * What each cellar is called, in the order they are played — the map and the line
   * over the room use it. A room with no name here shows its number alone.
   */
  readonly roomNames: readonly string[]
  /** Short lines that appear over the room for a moment. */
  readonly roomToast: (n: number) => string
  readonly musicOn: string
  readonly musicOff: string
}

const EN: Strings = {
  earsUp: 'EARS UP',
  earsDown: 'EARS DOWN',
  carrots: (n) => `CARROT ${n}`,
  beats: (n) => `BEAT ${n}`,
  hints: 'Z EARS X THROW SPC U UNDO M R',
  aimHints: 'THROW: PICK A DIRECTION  X NO',
  caught: 'CAUGHT!',
  caughtHint: 'U ONE BEAT BACK - ANY KEY AGAIN',
  undone: 'ONE BEAT BACK',
  won: 'SLIPPED OUT',
  wonBeats: (n) => `IN ${n} BEATS`,
  par: (n) => `PAR ${n}`,
  onPar: 'ON PAR!',
  room: (n) => `R${n}`,
  again: 'ANY KEY: NEXT ROOM',
  loadCommand: 'LOAD ""',
  startPrompt: 'PRESS ANY KEY',
  storyTitle: 'UNDER THE HILL',
  story: (rooms) => [
    'THE FOXES KEEP THEIR LARDER',
    'DEEP UNDER THE HILL. RANDY',
    'WENT IN FOR ONE CARROT AND',
    'THE DOOR SHUT BEHIND HIM.',
    '',
    `${rooms} CELLARS TO THE NIGHT AIR.`,
    'NOBODY MUST SEE HIM GO.',
  ],
  record: (n) => `BEST ${n}`,
  newRecord: 'NEW BEST!',
  replayHint: (withBest) => (withBest ? 'P REPLAY  B BEST RUN' : 'P REPLAY'),
  replaying: 'REPLAY - ANY KEY STOPS',
  endingTitle: 'THE NIGHT AIR',
  ending: (rooms) => [
    'RANDY CAME UP INTO THE GRASS',
    'BEHIND THE HILL.',
    `${rooms} QUIET CELLARS BELOW HIM -`,
    'AND THE CARROT HE NEVER FOUND.',
  ],
  wholeCellar: (n) => `THE WHOLE CELLAR: ${n} BEATS`,
  cellar: 'THE CELLAR',
  cellarHint: 'ANY KEY: ON',
  roomNames: [
    'THE PANTRY CORRIDOR', 'THE DARK CORRIDOR', 'THE JUNCTION', "THE BAT'S LARDER",
    "THE BAT'S HALL", 'THE SENTRY', 'THE LIT CORNER', 'THE PLANK',
    'THE HANDLE', 'THE LONG WAY ROUND', 'THE WINDOW', 'THE ROOST',
  ],
  roomToast: (n) => `ROOM ${n}`,
  musicOn: 'MUSIC ON',
  musicOff: 'MUSIC OFF',
}

const SK: Strings = {
  earsUp: 'USI HORE',
  earsDown: 'USI DOLE',
  carrots: (n) => `MRKVA ${n}`,
  beats: (n) => `BEAT ${n}`,
  hints: 'Z USI X HOD MEDZ U SPAT M R',
  aimHints: 'HOD: VYBER SMER SIPKOU  X NIE',
  caught: 'CHYTENY!',
  caughtHint: 'U BEAT SPAT - KLAVESA ZNOVA',
  undone: 'O BEAT SPAT',
  won: 'PREKLZOL SI',
  wonBeats: (n) => `ZA ${n} BEATOV`,
  par: (n) => `PAR ${n}`,
  onPar: 'NA PAR!',
  room: (n) => `M${n}`,
  again: 'KLAVESA: DALSIA MIESTNOST',
  loadCommand: 'LOAD ""',
  startPrompt: 'STLAC KLAVESU',
  storyTitle: 'POD KOPCOM',
  story: (rooms) => [
    'LISKY MAJU SPIZ HLBOKO POD',
    'KOPCOM. RANDY SIEL DNU PRE',
    'JEDNU MRKVU A DVERE SA ZA',
    'NIM ZAVRELI.',
    '',
    `${rooms} PIVNIC K NOCNEMU VZDUCHU.`,
    'NIKTO HO NESMIE VIDIET ODIST.',
  ],
  record: (n) => `REKORD ${n}`,
  newRecord: 'NOVY REKORD!',
  replayHint: (withBest) => (withBest ? 'P ZNOVA  B REKORDNY BEH' : 'P ZNOVA POZRIET'),
  replaying: 'ZAZNAM - KLAVESA ZASTAVI',
  endingTitle: 'NOCNY VZDUCH',
  ending: (rooms) => [
    'RANDY VYLIEZOL DO TRAVY ZA',
    `KOPCOM. POD NIM ${rooms} TICHYCH`,
    'PIVNIC - A JEDNA MRKVA, KTORU',
    'NIKDY NENASIEL.',
  ],
  wholeCellar: (n) => `CELA PIVNICA: ${n} BEATOV`,
  cellar: 'PIVNICA',
  cellarHint: 'KLAVESA: DALEJ',
  roomNames: [
    'SPIZOVA CHODBA', 'TMAVA CHODBA', 'KRIZOVATKA', 'NETOPIERIA KOMORA',
    'NETOPIERIA SIEN', 'STRAZNIK', 'OSVETLENY KUT', 'DOSKA',
    'PAKA', 'OKLUKA', 'OKNO', 'HNIEZDO',
  ],
  roomToast: (n) => `MIESTNOST ${n}`,
  musicOn: 'HUDBA ZAP',
  musicOff: 'HUDBA VYP',
}

/** Both tongues, for the tests that hold them to the same shape. */
export const LOCALES = { en: EN, sk: SK } as const

export const STR: Strings = pickLocale(EN, { sk: SK }, LANGUAGE_CODE)

/** A room's name, or its number when the cellar has grown past the names. */
export function roomLabel(str: Strings, index: number): string {
  const name = str.roomNames[index]
  return name ? `${index + 1} ${name}` : str.roomToast(index + 1)
}

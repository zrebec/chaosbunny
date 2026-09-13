/**
 * Every word the prototype puts on screen, per language, picked once with
 * zx-kit's `pickLocale`. The canvas draws with the ROM font — 96 ASCII glyphs —
 * so the Slovak strings are written without diacritics, as in Minefield.
 * Every line must fit the 32 columns of the screen.
 */
import { pickLocale } from 'zx-kit'
import { LANGUAGE_CODE } from '../config.js'
import type { Want } from './wants.js'

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
  /**
   * Under `caughtHint`, for a player caught three times in the same room: the verb the
   * room cannot be left without (`wants.ts`), or `none` for a room that wants no tool
   * at all. One line each, at most 32 columns, and never a step of the way through.
   */
  readonly wants: Readonly<Record<Want | 'none' | 'choice', string>>
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
  /** The rules screen: `H` on the loaded picture. One line a rule, in the order taught. */
  readonly rulesTitle: string
  readonly rules: readonly string[]
  /** The sound bench: its title, the name of each sound in key order, and how to leave. */
  readonly soundTitle: string
  readonly soundNames: readonly string[]
  readonly soundHint: string
  /** The map between rooms: its title, and how to leave it. */
  readonly cellar: string
  readonly cellarHint: string
  /**
   * What each cellar is called, in the order they are played — the map and the line
   * over the room use it. A room with no name here shows its number alone.
   */
  readonly roomNames: readonly string[]
  /**
   * The line shown the first time a fox notices Randy in a room. Being noticed is not
   * being caught — the next beat is, if it sees him again — and nothing else in the
   * game ever says so.
   */
  readonly spottedHint: string
  /** Said once, the first time Randy stands in the dark with his ears up. */
  readonly shadowHint: string
  /**
   * The first time he does the right thing and it does not work: ears down, standing in
   * shadow, and a lamp is lighting that very cell. Nothing else in the game says that a
   * lit shadow is not a shadow, and it is the one rule that looks like a bug.
   */
  readonly lampHint: string
  /** The first plank he stands on: the creak is a sound the player cannot see. */
  readonly boardHint: string
  /** The first handle he works: iron, and the guard is listening. */
  readonly leverHint: string
  /** Said once, the first time a roosting bat is close enough to hear him walk. */
  readonly batHint: string
  /** Said once, the first time he puts a foot in the water. */
  readonly waterHint: string
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
  hints: 'Z EARS X THROW U UNDO C MAP R H',
  aimHints: 'THROW: PICK A DIRECTION  X NO',
  caught: 'CAUGHT!',
  caughtHint: 'U ONE BEAT BACK - ANY KEY AGAIN',
  wants: {
    dark: 'THIS ROOM WANTS YOUR EARS DOWN',
    carrot: 'THIS ROOM WANTS A CARROT THROWN',
    lampOut: 'THIS ROOM WANTS THE LAMP OUT',
    lever: 'THIS ROOM WANTS THE LEVER',
    water: 'THIS ROOM WANTS WET FEET',
    none: 'THIS ROOM WANTS ONLY TIMING',
    choice: 'THIS ROOM HAS MORE THAN ONE WAY',
  },
  undone: 'ONE BEAT BACK',
  won: 'SLIPPED OUT',
  wonBeats: (n) => `IN ${n} BEATS`,
  par: (n) => `PAR ${n}`,
  onPar: 'ON PAR!',
  room: (n) => `R${n}`,
  again: 'ANY KEY: THE CELLAR MAP',
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
  rulesTitle: 'WHAT THE CELLAR KNOWS',
  rules: [
    'EARS UP: YOU SEE THE CONES',
    'EARS DOWN: THE DARK HIDES YOU',
    'AND ONLY FOR TWO STEPS',
    'A ? IS A WARNING. A SECOND',
    'SIGHTING IN A ROW IS THE END',
    'A CRATE HIDES LOWERED EARS ONLY',
    'A CARROT FLIES 3, IS HEARD 5',
    'LIGHT KILLS SHADOW',
    'A BOARD CREAKS EITHER WAY',
    'A BAT HEARS EARS-UP STEPS',
    'WATER COSTS TWO BEATS A STEP',
  ],
  soundTitle: 'THE SOUND BENCH',
  soundNames: [
    'STEP', 'EARS', 'THROW', 'CARROT LANDS', 'LAMP OUT', 'CREAK',
    'LEVER', 'PICKUP', 'SPOTTED', 'CAUGHT', 'BAT', 'ESCAPED', 'WADING',
  ],
  soundHint: 'M THE HUM - ESC BACK',
  cellar: 'THE CELLAR',
  cellarHint: 'ARROWS PICK - ENTER IN - ESC OUT',
  roomNames: [
    'THE PANTRY CORRIDOR', 'THE CROSSING', 'THE DARK STEP', 'THE SHADOW SHELF',
    'THE DARK CORRIDOR', 'THE JUNCTION', "THE BAT'S LARDER",
    "THE BAT'S HALL", 'THE SENTRY', 'THE LIT CORNER', 'THE PLANK',
    'THE HANDLE', 'THE LONG WAY ROUND', 'THE WADE', 'THE FLOOD', 'THE FORK', 'THE ROOST',
    'THE WINDOW',
  ],
  spottedHint: 'SPOTTED - HIDE THIS BEAT',
  shadowHint: 'THE DARK HIDES EARS DOWN ONLY',
  lampHint: 'A LIT SHADOW HIDES NOBODY',
  boardHint: 'A BOARD CREAKS EITHER WAY',
  leverHint: 'THE HANDLE IS HEARD TOO',
  batHint: 'THE BAT HEARS EARS-UP STEPS',
  waterHint: 'WADING COSTS TWO BEATS A STEP',
  roomToast: (n) => `ROOM ${n}`,
  musicOn: 'MUSIC ON',
  musicOff: 'MUSIC OFF',
}

const SK: Strings = {
  earsUp: 'USI HORE',
  earsDown: 'USI DOLE',
  carrots: (n) => `MRKVA ${n}`,
  beats: (n) => `BEAT ${n}`,
  hints: 'Z USI X HOD U SPAT C MAPA R H',
  aimHints: 'HOD: VYBER SMER SIPKOU  X NIE',
  caught: 'CHYTENY!',
  caughtHint: 'U BEAT SPAT - KLAVESA ZNOVA',
  wants: {
    dark: 'TATO IZBA CHCE SKLOPENE USI',
    carrot: 'TATO IZBA CHCE HOD MRKVOU',
    lampOut: 'TATO IZBA CHCE ZHASNUTU LAMPU',
    lever: 'TATO IZBA CHCE PAKU',
    water: 'TATO IZBA CHCE MOKRE NOHY',
    none: 'TATO IZBA CHCE LEN NACASOVANIE',
    choice: 'TATO IZBA MA VIAC CIEST',
  },
  undone: 'O BEAT SPAT',
  won: 'PREKLZOL SI',
  wonBeats: (n) => `ZA ${n} BEATOV`,
  par: (n) => `PAR ${n}`,
  onPar: 'NA PAR!',
  room: (n) => `M${n}`,
  again: 'KLAVESA: MAPA PIVNICE',
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
  rulesTitle: 'CO VIE PIVNICA',
  rules: [
    'USI HORE: VIDIS KUZELE',
    'USI DOLE: TMA TA SKRYJE,',
    'ALE LEN NA DVA KROKY',
    '? JE VAROVANIE. DRUHE ZBADANIE',
    'HNED PO NOM JE KONIEC',
    'DEBNA KRYJE LEN SKLOPENE USI',
    'MRKVA LETI 3, POCUT JU NA 5',
    'SVETLO RUSI TIEN',
    'DOSKA VRZGNE TAK CI TAK',
    'NETOPIER POCUJE USI HORE',
    'VODA STOJI DVA BEATY ZA KROK',
  ],
  soundTitle: 'SKUSOBNA ZVUKOV',
  soundNames: [
    'KROK', 'USI', 'HOD', 'DOPAD MRKVY', 'SKLO LAMPY', 'VRZGNUTIE',
    'PAKA', 'ZOBRAL MRKVU', 'VSIMOL SI TA', 'CHYTENY', 'NETOPIER', 'PREKLZOL', 'BRODENIE',
  ],
  soundHint: 'M HUKOT - ESC SPAT',
  cellar: 'PIVNICA',
  cellarHint: 'SIPKY - ENTER DNU - ESC VON',
  roomNames: [
    'SPIZOVA CHODBA', 'PRECHOD', 'KROK V TME', 'TIENISTA POLICA',
    'TMAVA CHODBA', 'KRIZOVATKA', 'NETOPIERIA KOMORA',
    'NETOPIERIA SIEN', 'STRAZNIK', 'OSVETLENY KUT', 'DOSKA',
    'PAKA', 'OKLUKA', 'BROD', 'ZAPLAVA', 'RAZCESTIE', 'HNIEZDO', 'OKNO',
  ],
  spottedHint: 'VSIMOL SI TA - SKRY SA HNED',
  shadowHint: 'TIEN SKRYJE LEN SKLOPENE USI',
  lampHint: 'OSVETLENY TIEN NESKRYJE NIKOHO',
  boardHint: 'DOSKA VRZGNE TAK CI TAK',
  leverHint: 'PAKU TIEZ POCUT',
  batHint: 'NETOPIER POCUJE KROKY S USAMI',
  waterHint: 'BRODENIE STOJI DVA BEATY',
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

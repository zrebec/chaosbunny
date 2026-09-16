/**
 * Every word the prototype puts on screen, per language, picked once with
 * zx-kit's `pickLocale`. The canvas draws with the ROM font — 96 ASCII glyphs —
 * so the Slovak strings are written without diacritics, as in Minefield.
 * Every line must fit the 32 columns of the screen.
 */
import { pickLocale } from 'zx-kit'
import { LANGUAGE_CODE } from '../config.js'
import type { CaughtReason } from './caught.js'
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
   * Under `caught`, every time: what just went wrong (`caught.ts`). One line each, at
   * most 32 columns, saying what happened and never what to do next.
   */
  readonly caughtWhy: Readonly<Record<CaughtReason, string>>
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
  /** Win screen: escaped over par, but within a quarter of it (`score.ts` medal `near`). */
  readonly nearPar: (par: number) => string
  /** Points: a room's on the win screen and the map, the whole cellar's on the map and the ending. */
  readonly score: (n: number) => string
  /** On the map, under a room that stays shut until the one before it is escaped. */
  readonly locked: (before: number) => string
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
  /**
   * The screen after the loaded picture: every key, one line each, the key padded to
   * eight columns. It is where the sound bench and the rules are found.
   */
  readonly controlsTitle: string
  readonly controls: readonly string[]
  /** Under the keys: what a key does from here. */
  readonly controlsPrompt: string
  /** On the map, for the marked room: attempts begun and catches, from the save. */
  readonly attempts: (n: number) => string
  readonly timesCaught: (n: number) => string
  /** On the map while every room is open for testing (`?dev`). */
  readonly devMark: string
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
  /**
   * The bench's three AY voices, on F, G and H. Three voices written blind cannot be
   * judged together \u2014 the only way to hear whether the drip is too loud is to hear
   * the drip alone \u2014 so the bench can mute each one while it plays.
   */
  readonly voiceNames: readonly [string, string]
  /** The map between rooms: its title, the same cellar mirrored, and how to leave it. */
  readonly cellar: string
  readonly cellarMirror: string
  /** Said when `T` walks between the cellar and its mirror (`mirror.ts`). */
  readonly mirrorOn: string
  readonly mirrorOff: string
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
  /**
   * The first time cover is the difference: a fox is looking straight at him and would
   * not be, had his ears been down. Standing behind a crate with the ears up is the
   * quietest way the game says no.
   */
  /**
   * The first throw a fox actually reacts to. The aim overlay already draws how far a
   * carrot flies; how far it is *heard* is a second number, twice as big, and nothing
   * on screen ever shows it.
   */
  readonly carrotHint: string
  readonly crateHint: string
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
  /**
   * What `L` says when it walks the cellar's darkness. Three looks rather than two,
   * because how dark a cellar should be is not an argument anybody wins on paper.
   */
  readonly ambience: Readonly<Record<'bright' | 'off' | 'dim' | 'dark', string>>
  /**
   * The first two rooms show the next best move (`guide.ts`). One line each, in place
   * of the key row — in a room that is teaching you, what the keys are called matters
   * less than what to do with them.
   */
  readonly guide: Readonly<Record<'step' | 'throw' | 'earsDown' | 'earsUp' | 'wait', string>>
  /**
   * Said in the taught rooms every time a fox notices Randy, not once a session like
   * {@link Strings.spottedHint}. It carries the half of the rule that sentence leaves
   * out and that room two is entirely built on: being noticed is not being caught.
   */
  readonly guideSpotted: string
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
  caughtWhy: {
    front: 'NOTHING HIDES YOU RIGHT IN FRONT',
    litShadow: 'THE LAMP LIGHTS YOUR SHADOW',
    earsDownOpen: 'EARS DOWN HIDE ONLY IN SHADOW',
    earsUpShadow: 'IN SHADOW, EARS UP SHOW YOU',
    earsUpCover: 'OVER THE CRATE, EARS UP SHOW',
    seenAgain: 'SEEN AGAIN RIGHT AFTER THE ?',
    bumped: 'YOU AND A FOX MET ON ONE CELL',
    batFlight: 'A BAT FLEW THROUGH YOUR CELL',
    batBumped: 'YOU WALKED INTO A BAT',
  },
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
  nearPar: (n) => `NEAR PAR (${n})`,
  score: (n) => `SCORE ${n}`,
  locked: (n) => `LOCKED: ESCAPE ROOM ${n} FIRST`,
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
  controlsTitle: 'THE KEYS',
  controls: [
    'ARROWS  STEP - EVERYONE MOVES',
    'Z       EARS UP / DOWN',
    'X       AIM, AN ARROW THROWS',
    'SPACE   WAIT A BEAT',
    'U       ONE BEAT BACK',
    'R       START THE ROOM AGAIN',
    'C       THE CELLAR MAP',
    'H       WHAT THE CELLAR KNOWS',
    'M       MUSIC ON / OFF',
    'L       HOW THE CELLAR IS LIT',
    'S       THE SOUND BENCH',
    'P  B    AFTER A WIN: REPLAYS',
    'T       THE CELLAR MIRRORED',
    'PAD: A THROW START EARS Y WAIT',
  ],
  controlsPrompt: 'ANY KEY: CHOOSE A ROOM',
  attempts: (n) => `TRIES ${n}`,
  timesCaught: (n) => `CAUGHT ${n}`,
  devMark: 'DEV',
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
    'THE HANDLE IS HEARD TOO',
    'A BAT HEARS EARS-UP STEPS',
    'WATER COSTS TWO BEATS A STEP',
  ],
  soundTitle: 'THE SOUND BENCH',
  soundNames: [
    'STEP', 'EARS', 'THROW', 'CARROT LANDS', 'LAMP OUT', 'CREAK',
    'LEVER', 'PICKUP', 'SPOTTED', 'CAUGHT', 'BAT', 'ESCAPED', 'WADING',
  ],
  soundHint: 'M HUM  J ALL VOICES - ESC BACK',
  voiceNames: ['DRONE', 'AIR'],
  cellar: 'THE CELLAR',
  cellarMirror: 'THE CELLAR MIRRORED',
  mirrorOn: 'MIRRORED - ITS OWN RECORDS',
  mirrorOff: 'THE CELLAR AS IT WAS',
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
  carrotHint: 'IT FLIES 3 AND IS HEARD 5',
  crateHint: 'A CRATE HIDES LOWERED EARS ONLY',
  boardHint: 'A BOARD CREAKS EITHER WAY',
  leverHint: 'THE HANDLE IS HEARD TOO',
  batHint: 'THE BAT HEARS EARS-UP STEPS',
  waterHint: 'WADING COSTS TWO BEATS A STEP',
  roomToast: (n) => `ROOM ${n}`,
  musicOn: 'MUSIC ON',
  musicOff: 'MUSIC OFF',
  ambience: { bright: 'LIGHT: BRIGHT LAMPS', off: 'LIGHT: AS IT WAS', dim: 'LIGHT: CELLAR', dark: 'LIGHT: DEEP CELLAR' },
  guide: {
    step: 'GO TO THE MARK',
    throw: 'THROW A CARROT AT THE MARK',
    earsDown: 'PUT YOUR EARS DOWN',
    earsUp: 'PUT YOUR EARS UP',
    wait: 'WAIT A BEAT',
  },
  guideSpotted: 'A ? IS NOT A CATCH - HIDE NOW',
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
  caughtWhy: {
    front: 'TESNE PRED LISKOU NIC NESKRYJE',
    litShadow: 'LAMPA SVIETI NA TVOJ TIEN',
    earsDownOpen: 'SKLOPENE USI SKRYJU LEN V TIENI',
    earsUpShadow: 'V TIENI TA PREZRADILI USI HORE',
    earsUpCover: 'USI HORE TRCALI SPOZA DEBNY',
    seenAgain: 'ZBADANY ZNOVA HNED PO ?',
    bumped: 'STRETOL SI LISKU NA JEDNEJ BUNKE',
    batFlight: 'NETOPIER TI PRELETEL CEZ BUNKU',
    batBumped: 'VOSIEL SI DO NETOPIERA',
  },
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
  nearPar: (n) => `BLIZKO PARU (${n})`,
  score: (n) => `BODY ${n}`,
  locked: (n) => `ZAMKNUTA: PREJDI IZBU ${n}`,
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
  controlsTitle: 'OVLADANIE',
  controls: [
    'SIPKY   KROK - POHNU SA VSETCI',
    'Z       USI HORE / DOLE',
    'X       MIERIT A HODIT MRKVU',
    'MEDZERA POCKAT BEAT',
    'U       O BEAT SPAT',
    'R       IZBA ODZNOVA',
    'C       MAPA PIVNICE',
    'H       CO VIE PIVNICA',
    'M       HUDBA ZAP / VYP',
    'L       SVETLO V PIVNICI',
    'S       SKUSOBNA ZVUKOV',
    'P  B    PO VYHRE: ZAZNAMY',
    'T       PIVNICA NAOPAK',
    'PAD: A HOD  START USI  Y CAKAT',
  ],
  controlsPrompt: 'KLAVESA: VYBER IZBU',
  attempts: (n) => `POKUSY ${n}`,
  timesCaught: (n) => `CHYTENY ${n}`,
  devMark: 'DEV',
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
    'PAKU TIEZ POCUT',
    'NETOPIER POCUJE USI HORE',
    'VODA STOJI DVA BEATY ZA KROK',
  ],
  soundTitle: 'SKUSOBNA ZVUKOV',
  soundNames: [
    'KROK', 'USI', 'HOD', 'DOPAD MRKVY', 'SKLO LAMPY', 'VRZGNUTIE',
    'PAKA', 'ZOBRAL MRKVU', 'VSIMOL SI TA', 'CHYTENY', 'NETOPIER', 'PREKLZOL', 'BRODENIE',
  ],
  soundHint: 'M HUKOT  J HLASY - ESC SPAT',
  voiceNames: ['HUKOT', 'VZDUCH'],
  cellar: 'PIVNICA',
  cellarMirror: 'PIVNICA NAOPAK',
  mirrorOn: 'NAOPAK - S VLASTNYMI REKORDMI',
  mirrorOff: 'PIVNICA AKO BOLA',
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
  carrotHint: 'LETI 3, ALE POCUT JU NA 5',
  crateHint: 'DEBNA KRYJE LEN SKLOPENE USI',
  boardHint: 'DOSKA VRZGNE TAK CI TAK',
  leverHint: 'PAKU TIEZ POCUT',
  batHint: 'NETOPIER POCUJE KROKY S USAMI',
  waterHint: 'BRODENIE STOJI DVA BEATY',
  roomToast: (n) => `MIESTNOST ${n}`,
  musicOn: 'HUDBA ZAP',
  musicOff: 'HUDBA VYP',
  ambience: { bright: 'SVETLO: BRIGHT LAMPY', off: 'SVETLO: AKO PREDTYM', dim: 'SVETLO: PIVNICA', dark: 'SVETLO: HLBOKA PIVNICA' },
  guide: {
    step: 'CHOD NA ZNACKU',
    throw: 'HOD MRKVU NA ZNACKU',
    earsDown: 'SKLOP USI',
    earsUp: 'ZDVIHNI USI',
    wait: 'POCKAJ BEAT',
  },
  guideSpotted: '? NIE JE CHYTENIE - SKRY SA',
}

/** Both tongues, for the tests that hold them to the same shape. */
/**
 * The rules the game says out loud at the beat they first bite (`main.ts` `hint`), as
 * against the ones a player only meets on the `H` screen. Named here because two
 * documents count them in prose and a doc test holds those counts to this list.
 */
export const SPOKEN_RULES = [
  'spottedHint', 'shadowHint', 'crateHint', 'carrotHint', 'lampHint', 'boardHint', 'leverHint',
  'batHint', 'waterHint',
] as const

export const LOCALES = { en: EN, sk: SK } as const

export const STR: Strings = pickLocale(EN, { sk: SK }, LANGUAGE_CODE)

/** A room's name, or its number when the cellar has grown past the names. */
export function roomLabel(str: Strings, index: number): string {
  const name = str.roomNames[index]
  return name ? `${index + 1} ${name}` : str.roomToast(index + 1)
}

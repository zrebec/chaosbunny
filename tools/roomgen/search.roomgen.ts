/**
 * The search: walk a range of seeds, mark every candidate, keep the ones where the
 * thing being looked for is the reason the room is hard.
 *
 * ```bash
 * KIND=ladder npm run roomgen              # mark the rooms that ship, in play order,
 *   and print the table — the numbers in docs/stealth-design.md come from here
 * npm run roomgen                          # general rooms that need the ears
 * KIND=gentle npm run roomgen              # a short room whose only lesson is that a
 *   `?` is survivable: it must be seen exactly once, and needs neither ears nor carrot
 * KIND=dribble npm run roomgen             # the next step after that: the ears are
 *   needed and nothing else is — no carrot in the room, one guard, short
 * KIND=lamp N=4000 npm run roomgen         # rooms a lamp makes impossible
 * KIND=decision npm run roomgen            # rooms with two plans that cost the same
 * KIND=lampboard npm run roomgen           # rooms where a lamp AND a plank are both load-bearing
 * KIND=fork GATES=open FORK=dark,board npm run roomgen  # two ways to the door, a gate
 *   on each (GATES is the chain that leads up to the fork; `open` is a plain corridor):
 *   the decision room, measured by the two halves of its plans
 * KIND=route GATES=grate,board npm run roomgen  # a planned route, one gate per corridor
 *   gates: grate (a lever to find), board (a plank a guard hears), dark (a lit shadow
 *   with the guard walled in behind the lamp), bat (a corridor to cross in silence),
 *   sentry (a corridor open only on the beats a turning guard looks away),
 *   water (a corridor that costs two beats a step and that no fox will follow you down)
 * KIND=board GAIN=5 npm run roomgen        # rooms a creaky board changes
 * KIND=lever  npm run roomgen             # rooms where a grate has to be opened
 * KIND=sentry npm run roomgen              # rooms a sentry's turning opens
 * KIND=bat npm run roomgen                 # rooms that need silence
 * ```
 *
 * `FROM` first seed, `N` how many, `BUDGET` milliseconds, `MIN_PAR`/`MAX_PAR` the
 * length of room wanted, `OUT` where the report goes. It is a vitest file only
 * because vitest is what this repo has to run TypeScript; it asserts nothing.
 *
 * **The report holds layouts and numbers, never a way through.**
 */
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'vitest'
import { generate, withTiles, type Candidate } from './gen.js'
import { generateRoute, type Gate } from './route.js'
import { line, mark, sheet, type Marks } from './metrics.js'
import { parseRoom, type RoomSource } from '../../src/stealth/room.js'
import { ROOM_SOURCES } from '../../src/stealth/rooms/index.js'
import { HEARING, nextStepToward } from '../../src/stealth/patrol.js'

type Kind = 'ladder' | 'plain' | 'gentle' | 'dribble' | 'lamp' | 'board' | 'sentry' | 'bat' | 'lever' | 'decision' | 'lampboard' | 'route' | 'fork'

const KIND = (process.env.KIND ?? 'plain') as Kind
const FROM = Number(process.env.FROM ?? 1000)
const N = Number(process.env.N ?? 2000)
const BUDGET_MS = Number(process.env.BUDGET ?? 600_000)
const MIN_PAR = Number(process.env.MIN_PAR ?? 16)
const MAX_PAR = Number(process.env.MAX_PAR ?? 40)
const GAIN = Number(process.env.GAIN ?? 5)
const MAX_STATES = Number(process.env.MAX_STATES ?? 120_000)
const OUT = process.env.OUT ?? path.join(import.meta.dirname, 'out', `${KIND}.txt`)
const GATES = (process.env.GATES ?? 'grate,board').split(',') as Gate[]
const FORK = (process.env.FORK ?? 'dark,board').split(',') as [Gate, Gate]

interface Hit { readonly src: RoomSource; readonly marks: Marks; readonly score: number; readonly note: string }

const fits = (m: Marks): boolean => m.par !== null && m.par >= MIN_PAR && m.par <= MAX_PAR

/** Cells worth trying a lamp or a board on: floor, off every route, near a guard. */
function spots(src: RoomSource, within: number): [number, number][] {
  const room = parseRoom(src)
  const onRoute = new Set(room.patrols.flatMap((p) => p.route.map((c) => `${c.x},${c.y}`)))
  const near = (x: number, y: number): boolean =>
    room.patrols.some((p) => p.route.some((c) => Math.abs(c.x - x) + Math.abs(c.y - y) <= within))
  const out: [number, number][] = []
  for (let y = 1; y < room.rows - 1; y++) {
    for (let x = 1; x < room.cols - 1; x++) {
      if (src.rows[y]![x] === '.' && !onRoute.has(`${x},${y}`) && near(x, y)) out.push([x, y])
    }
  }
  return out
}

/** Every room worth marking for this kind, from one candidate. */
function variants(kind: Kind, c: Candidate): RoomSource[] {
  const src = c.src
  if (kind === 'lampboard') {
    // A lamp beside a shadow, and a plank within earshot of a guard: both placed at
    // once, because a room only counts if neither can be taken away.
    const lamps = spots(src, 6).filter(([x, y]) =>
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => src.rows[y + dy]?.[x + dx] === 's'))
    const boards = spots(src, 3)
    const out: RoomSource[] = []
    for (const lamp of lamps.slice(0, 4)) {
      for (const board of boards.slice(0, 6)) {
        if (lamp[0] === board[0] && lamp[1] === board[1]) continue
        out.push({
          ...src,
          name: `${src.name}@lamp${lamp[0]},${lamp[1]}+board${board[0]},${board[1]}`,
          rows: withTiles(withTiles(src.rows, 'L', [lamp]), '~', [board]),
        })
      }
    }
    return out
  }
  if (kind === 'lamp' || kind === 'decision') {
    return spots(src, 6)
      .filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => src.rows[y + dy]?.[x + dx] === 's'))
      .map(([x, y]) => ({ ...src, name: `${src.name}@lamp${x},${y}`, rows: withTiles(src.rows, 'L', [[x, y]]) }))
  }
  if (kind === 'board') {
    const cells = spots(src, 3)
    const single = cells.map(([x, y]) => ({ ...src, name: `${src.name}@board${x},${y}`, rows: withTiles(src.rows, '~', [[x, y]]) }))
    const pairs: RoomSource[] = []
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i]!
        const b = cells[j]!
        if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) continue
        pairs.push({ ...src, name: `${src.name}@board${a[0]},${a[1]}+${b[0]},${b[1]}`, rows: withTiles(src.rows, '~', [a, b]) })
      }
    }
    return [...single, ...pairs]
  }
  if (kind === 'lever') {
    const room = parseRoom(src)
    const out: RoomSource[] = []
    // A grate is only interesting where it cuts the room in two: a corridor cell with
    // exactly two open neighbours, opposite each other. The lever then goes somewhere
    // a guard can watch — the search finds out whether that is worth the walk.
    const open = (x: number, y: number): boolean => '.s~'.includes(src.rows[y]?.[x] ?? '#')
    const chokes: [number, number][] = []
    for (let y = 1; y < room.rows - 1; y++) {
      for (let x = 1; x < room.cols - 1; x++) {
        if (src.rows[y]![x] !== '.') continue
        const h = open(x - 1, y) && open(x + 1, y)
        const v = open(x, y - 1) && open(x, y + 1)
        if (h !== v && !open(x - (h ? 0 : 1), y - (h ? 1 : 0)) && !open(x + (h ? 0 : 1), y + (h ? 1 : 0))) {
          chokes.push([x, y])
        }
      }
    }
    for (const grate of chokes) {
      for (const lever of spots(src, 6)) {
        if (lever[0] === grate[0] && lever[1] === grate[1]) continue
        out.push({
          ...src,
          name: `${src.name}@grate${grate[0]},${grate[1]}+lever${lever[0]},${lever[1]}`,
          rows: withTiles(withTiles(src.rows, '+', [grate]), '/', [lever]),
        })
      }
    }
    return out
  }
  return [src]
}

/** Whether the room's new thing is load-bearing, and how strongly. */
function judge(kind: Kind, src: RoomSource, m: Marks): Hit | null {
  if (!fits(m)) return null
  if (kind === 'lamp') {
    // The room must be impossible with the lamp left burning.
    return m.lampsOn === null ? { src, marks: m, score: m.par!, note: 'the lamp is the room' } : null
  }
  if (kind === 'board') {
    const plain = mark({ ...src, name: `${src.name} (plain floor)`, rows: src.rows.map((r) => r.split('~').join('.')) }, MAX_STATES)
    if (!plain?.par) return null
    const gain = m.par! - plain.par
    const noticedMore = m.fewest !== null && plain.fewest !== null && m.fewest > plain.fewest
    if (gain < GAIN && !noticedMore) return null
    return { src, marks: m, score: gain * 10 + (noticedMore ? 5 : 0), note: `plain floor is par ${plain.par} (+${gain}), fewest? ${plain.fewest}` }
  }
  if (kind === 'decision') {
    // Every way out either leaves the lamp burning or puts it out, so those two pars
    // are the two plans. A room where they are within a beat or two of each other has
    // a decision in it; one where they are far apart has a right answer and a wrong one.
    const lit = m.lampsOn
    const dark = m.dark
    if (lit === null || dark === null) return null
    const spread = Math.abs(lit - dark)
    if (spread > 2 || m.noThrow !== null) return null
    // A choice with nothing at stake is not a choice: the room must also press, by
    // needing the ears or by noticing even the most careful player.
    const pressure = m.noEars === null || (m.fewest ?? 0) >= 1
    if (!pressure) return null
    return {
      src,
      marks: m,
      score: 100 - spread * 10 + (m.noEars === null ? 20 : 0) + (m.fewest ?? 0) * 5,
      note: `lit ${lit} against dark ${dark}: two plans, ${spread} beats apart`,
    }
  }
  if (kind === 'fork' && src.rows.join('').includes('w')) {
    // A wet way and a dry way. The question is whether staying dry is worth its walk:
    // far apart and the room has an answer, close and it has a choice.
    if (m.dry === null || m.par === null) return null
    const spread = m.dry - m.par
    if (spread < 1 || spread > 3) return null
    // And the flood must actually be paid for: drain it and the room has to get
    // cheaper, or the water is scenery the best line never touches.
    const drained = mark({ ...src, name: `${src.name} (drained)`, rows: src.rows.map((r) => r.split('w').join('.')) }, MAX_STATES)
    if (!drained?.par || drained.par >= m.par) return null
    return {
      src,
      marks: m,
      score: 100 - spread * 10 + (m.par - drained.par) * 5 + (m.fewest ?? 0) * 5,
      note: `wet ${m.par}, dry ${m.dry}, drained ${drained.par}`,
    }
  }
  if (kind === 'fork') {
    // Two ways, and the lamp tells them apart: every plan either leaves it burning
    // (so it went the other way) or puts it out (so it went through the dark).
    const lit = m.lampsOn
    const dark = m.dark
    if (lit === null || dark === null) return null
    const spread = Math.abs(lit - dark)
    if (spread > 2) return null
    return { src, marks: m, score: 100 - spread * 10 + (m.fewest ?? 0) * 5, note: `lit ${lit} against dark ${dark}, ${spread} apart` }
  }
  if (kind === 'route') {
    // Every gate on a planned route is a bridge by construction, so the question is
    // only whether the room the plan produced is worth playing: long enough, and each
    // gate still paying for itself once the solver has had its say.
    const room = parseRoom(src)
    if (room.grates.length && mark({ ...src, name: `${src.name} (walled)`, rows: src.rows.map((r) => r.split('+').join('#').split('/').join('.')) }, MAX_STATES)?.par !== null) return null
    if (room.lamps.length && m.lampsOn !== null) return null
    let note = ''
    if (src.patrols.some((p) => p.turns)) {
      // A sentry earns its place only if its turning is the way through: freeze every
      // one of them on its first facing and the room must close.
      const frozen = mark({
        ...src,
        name: `${src.name} (frozen)`,
        patrols: src.patrols.map((p) => (p.turns ? { route: p.route, facing: p.turns[0] } : p)),
      }, MAX_STATES)
      if (!frozen || frozen.par !== null) return null
      note += 'frozen it shuts; '
    }
    if (src.bats?.length) {
      const quiet = mark({ ...src, name: `${src.name} (no bat)`, bats: [] }, MAX_STATES)
      if (!quiet?.par) return null
      const gain = m.par! - quiet.par
      if (gain < GAIN && quiet.noEars !== null) return null
      note += `without the bat par ${quiet.par}, noEars ${quiet.noEars ?? 'NONE'}; `
    }
    if (src.rows.join('').includes('~')) {
      const silent = mark({ ...src, name: `${src.name} (silent)`, rows: src.rows.map((r) => r.split('~').join('.')) }, MAX_STATES)
      if (!silent?.par || m.par! - silent.par < GAIN) return null
      note = `silent floor is par ${silent.par}; `
    }
    return { src, marks: m, score: m.par! + (m.noEars === null ? 20 : 0) + (m.fewest ?? 0) * 5, note: `${note}gates ${GATES.join('+')}` }
  }
  if (kind === 'lampboard') {
    // Both must carry the room: burning, the lamp makes it impossible; and with the
    // plank turned to silent floor it is markedly shorter.
    if (m.lampsOn !== null) return null
    const silent = mark({ ...src, name: `${src.name} (silent)`, rows: src.rows.map((r) => r.split('~').join('.')) }, MAX_STATES)
    if (!silent?.par) return null
    const gain = m.par! - silent.par
    if (gain < GAIN) return null
    return { src, marks: m, score: gain * 10 + (m.fewest ?? 0), note: `silent floor is par ${silent.par} (+${gain})` }
  }
  if (kind === 'sentry') {
    if (!src.patrols.some((p) => p.turns)) return null
    const frozen = mark({
      ...src,
      name: `${src.name} (frozen)`,
      patrols: src.patrols.map((p) => (p.turns ? { route: p.route, facing: p.turns[0] } : p)),
    }, MAX_STATES)
    return frozen && frozen.par === null ? { src, marks: m, score: m.par!, note: 'frozen, the room is impossible' } : null
  }
  if (kind === 'lever') {
    // The grate must be the room: wall it off and there is no way out, so the lever
    // is not a detour but the door. And the room must still be worth walking.
    const walled = mark({ ...src, name: `${src.name} (walled)`, rows: src.rows.map((r) => r.split('+').join('#').split('/').join('.')) }, MAX_STATES)
    if (!walled || walled.par !== null) return null
    const open = mark({ ...src, name: `${src.name} (open)`, rows: src.rows.map((r) => r.split('+').join('.').split('/').join('.')) }, MAX_STATES)
    if (!open?.par) return null
    // A room that is eight beats long with the grate open is a fetch, not a room: the
    // detour has to be dangerous, not merely long. So it must also carry stealth
    // pressure — the ears are needed, or even the most careful player is noticed.
    if (open.par < 12) return null
    // And the pull must be heard by somebody who can walk to it, or the loudest thing
    // in the game costs nothing and the lever is just a long errand.
    const room = parseRoom(src)
    const lever = room.levers[0]!
    const heard = room.patrols.some((p) => p.route.some((c) =>
      Math.abs(c.x - lever.x) + Math.abs(c.y - lever.y) <= HEARING && nextStepToward(room, c, lever) !== null))
    if (!heard) return null
    const gain = m.par! - open.par
    const pressure = m.noEars === null || (m.fewest ?? 0) >= 1
    if (gain < GAIN || !pressure) return null
    return {
      src,
      marks: m,
      score: gain * 10 + (m.noEars === null ? 20 : 0) + (m.fewest ?? 0) * 5,
      note: `already open it is par ${open.par} (+${gain}), fewest? ${open.fewest}`,
    }
  }
  if (kind === 'bat') {
    if (!src.bats?.length) return null
    const quiet = mark({ ...src, name: `${src.name} (no bat)`, bats: [] }, MAX_STATES)
    if (!quiet?.par) return null
    const gain = m.par! - quiet.par
    if (gain < GAIN && quiet.noEars !== null) return null
    return { src, marks: m, score: gain * 10, note: `without the bat par ${quiet.par}, noEars ${quiet.noEars ?? 'NONE'}` }
  }
  if (kind === 'dribble') {
    // The room between "you will be seen" and the dark corridor: the ears are the only
    // thing it wants. No carrot in it, one guard, and short enough to be learned.
    if (m.noEars !== null) return null
    if ((src.carrots ?? 0) > 0 || src.rows.join('').includes('c')) return null
    if (src.patrols.length !== 1) return null
    if ((m.fewest ?? 9) > 1) return null
    return { src, marks: m, score: 100 - m.par!, note: 'the ears, and nothing else' }
  }
  if (kind === 'gentle') {
    // The teaching room between the first and the second: one sighting is forced, and
    // nothing else is. No carrot to find, no dribble to learn — only the rule that a
    // guard which has noticed you lets go again if the next beat gives it nothing.
    if (m.fewest !== 1) return null
    if (m.noEars === null || m.noEars !== m.par) return null // the ears must buy nothing
    // No carrot in the room at all, so the lesson cannot be confused with the first
    // room's: this one is only about a guard that has noticed you.
    if ((src.carrots ?? 0) > 0 || src.rows.join('').includes('c')) return null
    return { src, marks: m, score: 100 - m.par!, note: 'one sighting forced, nothing else' }
  }
  // plain: a room that cannot be walked with the ears up is already worth a look.
  return m.noEars === null ? { src, marks: m, score: m.par!, note: 'the ears are needed' } : null
}

/** Marks the shipped ladder and prints it as a table. Numbers, never a way through. */
function markLadder(): string {
  const rows = ROOM_SOURCES.map((src, i) => {
    const m = mark(src, 500_000)
    if (!m) return `| ${i + 1} | ${src.name} | — | — | could not be marked |`
    const needs = [
      m.noEars === null ? 'ears' : '',
      m.noThrow === null && (src.carrots ?? 0) + (src.rows.join('').split('c').length - 1) > 0 ? 'carrot' : '',
      m.lamps > 0 && m.lampsOn === null ? 'the dark' : '',
    ].filter(Boolean)
    return `| ${i + 1} | ${src.name} | ${m.par} | ${m.fewest} | ${needs.join(' + ') || '—'} |`
  })
  return [
    `The ladder as the solver sees it, ${new Date().toISOString().slice(0, 10)}.`,
    '',
    '| # | id | par | fewest ? | cannot be done without |',
    '|---|---|---:|---:|---|',
    ...rows,
  ].join('\n')
}

test(`roomgen: ${KIND}`, () => {
  if (KIND === 'ladder') {
    const report = markLadder()
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, report)
    console.log(report)
    return
  }
  const t0 = Date.now()
  const hits: Hit[] = []
  let seen = 0
  let marked = 0
  for (let seed = FROM; seed < FROM + N && Date.now() - t0 < BUDGET_MS; seed++) {
    const c = KIND === 'fork'
      ? generateRoute(seed, { gates: [...GATES, FORK[0]], fork: FORK })
      : KIND === 'route'
      ? generateRoute(seed, { gates: GATES })
      : generate(seed, { sentries: KIND === 'sentry', bats: KIND === 'bat' })
    if (!c || c.src.patrols.length > 2) continue
    seen++
    // A candidate the solver cannot even walk is not worth dressing up.
    const base = mark(c.src, 60_000)
    if (!base?.par) continue
    for (const src of variants(KIND, c)) {
      if (Date.now() - t0 > BUDGET_MS) break
      marked++
      const m = mark(src, MAX_STATES)
      if (!m) continue
      const hit = judge(KIND, src, m)
      if (hit) hits.push(hit)
    }
  }
  hits.sort((a, b) => b.score - a.score)
  const report = [
    `roomgen ${KIND}: seeds ${FROM}..${FROM + N - 1}, ${seen} candidates, ${marked} rooms marked, ${hits.length} kept`,
    `par ${MIN_PAR}..${MAX_PAR}, ${Math.round((Date.now() - t0) / 1000)} s`,
    '',
    ...hits.slice(0, 12).map((h) => `${line(h.marks)} — ${h.note}`),
    '',
    ...hits.slice(0, 5).map((h) => `${sheet(h.src, h.marks)}\n  ${h.note}\n`),
  ].join('\n')
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, report)
  console.log(report.slice(0, 4000))
}, 3_600_000)

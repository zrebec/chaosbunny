# roomgen — how a stealth room gets designed

A design tool, not part of the game. It builds 16×11 room candidates, hands each to
the solver, and keeps the ones where **the room's new thing is the reason the room is
hard**. The rooms that ship (`src/stealth/rooms/`) were all found this way.

```bash
npm run roomgen                        # general rooms that cannot be walked ears-up
KIND=gentle npm run roomgen            # a short room whose only lesson is that a `?` is survivable
KIND=lamp   N=4000 npm run roomgen     # rooms that are impossible with the lamp burning
KIND=board  GAIN=5 npm run roomgen     # rooms a creaky board really changes
KIND=sentry npm run roomgen            # rooms that open only when a sentry turns
KIND=bat    npm run roomgen            # rooms that need silence
KIND=route  GATES=grate,board npm run roomgen   # a planned route: a chain of chambers,
                                       # one gate per corridor, each a bridge by construction
KIND=fork   GATES=open FORK=dark,board npm run roomgen  # two ways to the door, a gate on
                                       # each — the decision room
```

The route kinds are the ones that work. `KIND=route` and `KIND=fork` plan the way through
first and dress it afterwards (`route.ts`), which is why they find in seconds what the
shape-rolling kinds above could not find in thousands of seeds.

Knobs, all optional: `FROM` first seed, `N` how many seeds, `BUDGET` milliseconds
(the search stops when it runs out, and still writes its report), `MIN_PAR` /
`MAX_PAR` how long a room to look for, `GAIN` how much shorter the room may be
without its new thing, `MAX_STATES` the solver's guard, `OUT` where the report goes
(default `tools/roomgen/out/<kind>.txt`, git-ignored).

## The rule

**No report, comment or commit message may contain a way through a room.** The tool
prints layouts and numbers; `solve()` returns an action list and nothing here may put
one on screen or on disk. A player finds the way; the solver only swears there is one.

## What the numbers mean

| Mark | Question it answers |
|---|---|
| `par` | the fewest beats out — `NONE` means there is no way out |
| `fewest?` | how often even the most careful player is noticed (`0` = a clean sneak exists) |
| `noEars` | par with the ears kept up — `NONE` means the ears are needed |
| `noThrow` | par with the carrot never thrown |
| `lampsOn` | par with every lamp left burning — `NONE` means the lamp is the room |

Each `KIND` adds its own ablation: `board` compares the room with its planks turned to
plain floor, `sentry` freezes every sentry on its first facing, `bat` takes the bat away.

## When a search finds nothing

That is a result, not a failure — but it should say why. `generateRoute` takes an
`onFail` callback and calls it with a word for every shape it threw away; count them and
the answer is usually obvious (too little wall for a guard's pocket, two ways that are
really one, a gate cell that can be walked round). The fork was built by reading that
tally: it said `fork-way-is-a-bridge` a thousand times, which turned out to be a bug in
the check itself — it did not count the door as somewhere Randy can stand, so it had
been passing every shape for nothing.

## Using what it finds

1. Copy the layout and its patrols into a new `src/stealth/rooms/roomNN.ts`, **exactly
   as it came**. The file name is an id, not a place: `rooms/index.ts` holds the order,
   and records are filed under the name, so a room slipped into the middle keeps its own. Tuning a layout "so it plays better" quietly draws your own solution
   into it; the numbers are what make the room fair, not the picture.
2. Add it to `src/stealth/rooms/index.ts`.
3. Write `tests/stealth/roomNN.tests.ts`: it can be left, `par` equals the solver's
   own answer, and the ablation the room was chosen for. **State the claims, never the
   path** — see `room07.tests.ts`.
4. If the tool found a piece the room does not need (a guard that changes no number),
   take it out. A guard the player must respect while the room does not need it is a lie.

## Checking the game agrees with the solver

`play.roomgen.ts` writes the keys that play a room, for a browser driver to press:

```bash
OUT=/some/scratch/play.json ROOMS=room3b,room13 \
  npx vitest run --config tools/roomgen/vitest.config.ts tools/roomgen/play.roomgen.ts
```

It exists because the solver and the game are two implementations of one rulebook and
have disagreed before — the solver counted actions while the game counted beats, and
nothing noticed until water made a step cost two. No test can catch that: a test asks
`beat.ts` the same question twice. The real page is the only second opinion, and the
win screen's beat count is the answer.

`OUT` is required and must be **outside the repository**. This is the one thing here
that writes a way through a room down, and the rule above still holds: the file is
scratch, the driver reads it, and what comes back is a number.

The driver is a dozen lines of Playwright and lives in scratch too (the game has no
browser-test dependency and does not need one for this). What it has to get right:

- **Reaching a room:** the digits jump absolutely (`1`–`9`, `0` for the tenth) and `]`
  steps on, and they work from any phase the room is in, won or caught. Navigating the
  cellar map instead means guessing where the cursor is.
- **Pacing:** one key per beat with ~450 ms between them. The game buffers a single
  keypress during the ~150 ms tween, so faster than that silently drops beats and the
  run desynchronises three rooms later.
- **Reading the answer:** the win banner is drawn *after* the dim overlay, so pure green
  (`0,255,0`) in the nine pixel rows at y=56 is the banner and nothing else — a door
  tile in the same rows has been dimmed and no longer matches. Counting green over the
  whole screen does not work: the dim takes the door's green away at the same moment the
  banner adds its own, and the totals cancel.

## Why it is a vitest file

Vitest is what runs TypeScript in this repo, so the search is a `*.roomgen.ts` file
with its own config (`tools/roomgen/vitest.config.ts`). It asserts nothing and never
joins `npm test` — the main config excludes `tools/`.

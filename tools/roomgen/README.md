# roomgen — how a stealth room gets designed

A design tool, not part of the game. It builds 16×11 room candidates, hands each to
the solver, and keeps the ones where **the room's new thing is the reason the room is
hard**. The rooms that ship (`src/stealth/rooms/`) were all found this way.

```bash
npm run roomgen                        # general rooms that cannot be walked ears-up
KIND=lamp   N=4000 npm run roomgen     # rooms that are impossible with the lamp burning
KIND=board  GAIN=5 npm run roomgen     # rooms a creaky board really changes
KIND=sentry npm run roomgen            # rooms that open only when a sentry turns
KIND=bat    npm run roomgen            # rooms that need silence
```

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

## Using what it finds

1. Copy the layout and its patrols into a new `src/stealth/rooms/roomNN.ts`, **exactly
   as it came**. Tuning a layout "so it plays better" quietly draws your own solution
   into it; the numbers are what make the room fair, not the picture.
2. Add it to `src/stealth/rooms/index.ts`.
3. Write `tests/stealth/roomNN.tests.ts`: it can be left, `par` equals the solver's
   own answer, and the ablation the room was chosen for. **State the claims, never the
   path** — see `room07.tests.ts`.
4. If the tool found a piece the room does not need (a guard that changes no number),
   take it out. A guard the player must respect while the room does not need it is a lie.

## Why it is a vitest file

Vitest is what runs TypeScript in this repo, so the search is a `*.roomgen.ts` file
with its own config (`tools/roomgen/vitest.config.ts`). It asserts nothing and never
joins `npm test` — the main config excludes `tools/`.

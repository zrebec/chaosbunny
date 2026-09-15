# Retrospective — 2026-09-13

## The verdict

The owner, the evening this landed on `master`:

> „chaosbunny dostal sloveso a je z toho hra čo chcem hrať, keďže pokusy predtým
> mali už peknú vymazlenú grafiku ale stále to nebola hra čo chcem hrať. Toto už
> áno, hoc grafiku má zatiaľ otrasnú."
>
> *(chaosBunny got a verb, and it turned into a game I want to play. The earlier
> attempts already had lovely, fussed-over graphics and still were not a game I
> wanted to play. This one is — even though its graphics are terrible so far.)*

That sentence is the whole retrospective and the reason this file exists. Everything
below is evidence for it.

## The thing that was actually wrong for a year

chaosBunny was never short of craft. It had pixel-perfect masks, a 15-colour ZX
palette, four switchable playfield looks including authentic attribute clash,
organically pulsing torchlight, AY music, a reachability linter, ~96 % coverage on the
engine underneath it. Read `docs/retrospective-2026-06-01.md` and it is a list of
things done well.

And it was not a game anybody wanted to play.

Twice we tried to fix that with **more craft** — the charge-jump, then the fall — and
twice it failed, for the same reason both times: they were attempts to make the
*existing* verb feel better. The verb was "climb". Climbing is not interesting. No
amount of dithering makes it interesting.

What fixed it was not a feature. It was answering a different question: **what does
the player DO?** The answer — *slip past* — arrived on 2026-09-11 and the game was
recognisable within a day.

**The lesson, stated as bluntly as it deserves: polish cannot rescue a missing verb,
and a verb does not need polish to be felt.** The prototype that won is 16×11 flat
tiles, four sprites and a beeper. The one that lost was beautiful.

## What the verb bought, in order

Everything below follows from "slip past". None of it was designed in advance; each
piece is what the verb turned out to require.

1. **Beats instead of seconds.** A real-time stealth prototype would have been another
   game about reflexes, and reflexes were exactly what we had got wrong twice. A beat
   is *legible* — you can point at the cell where you went wrong.
2. **A solver, which made beats worth having.** Because time is discrete and the rules
   are countable, a breadth-first search over the whole state space is possible. That
   turned into the guarantee the whole cellar rests on: **a room that ships has a
   proved solution, and a test says so** — the same promise Minefield's generator gives
   its fields.
3. **A generator, because the solver made rooms cheap.** `tools/roomgen` throws out
   hundreds of plans; the solver marks each one by `par`, `fewestSightings`, and by
   *ablation* — take the new verb away and see whether the room collapses. A room ships
   only if it **cannot** be done without the thing it is teaching.
4. **A verb ladder.** Eighteen rooms, each adding exactly one thing and testing the one
   before it. See `docs/stealth-design.md`.
5. **Teaching, because a proved room is not a playable one.** A real player got stuck
   in a room that was provably passable, and the cause was not a rule he did not know
   but an *idea* he had not had. Hence: nine rules said once at the beat they first
   bite, twelve on one screen (`H`), and — after three catches — the verb the room
   cannot be left without, read off the solver by `wants.ts` and held to it by a test
   so it names the tool and never the hand.
6. **Senses, last** (this session). See below.

The ordering matters and is the opposite of how the cave climber was built. There,
presentation came first and the verb never came at all.

## What shipped in this session

The rules were finished and proved; the senses were not. Everything the cellar knew,
it said in text.

- **`RULES.md` + `tests/stealth/rulebook.tests.ts`** — every rulebook constant pinned,
  with a loud red message saying what changing it just cost, because almost every
  "small improvement" to a rule silently rewrites all eighteen pars. Written at the
  owner's request: *"zakáž mi akékoľvek nápady, ktoré by rozbili hru"*. Three rules
  that had only ever been comments are tests now — water is not a noise a fox can
  hear, a catch needs `forward === 1 && lateral === 0`, and `beat()` is pure.
- **Sound.** A beat used to fire every event at once, so the `?` that cost you the room
  arrived under four other blips. A beat now says at most three things, loudest first —
  the rule the hints always had, that only one sentence fits in a beat. A warning ducks
  the hum through the loop's own mixer. Every noise is panned to the cell it came from,
  measured from Randy. The `?` is a rising minor third struck twice instead of two
  identical ticks, which read as a clock rather than an alarm.
- **The border answers** — yellow on a `?`, red on a capture, green on the way out. The
  one thing a Spectrum could change in a single frame.
- **Three levels of light instead of two**, so a lamp's reach is an island with a
  visible edge rather than something you could only see where it fell on shadow.
- **The lamp is a choice you can see** — aiming at one marks the shadow cells putting it
  out would give back. It gives away no more than "a carrot flies 3 and is heard 5",
  which the game already says out loud.
- **The opening pair of rooms show the next move**, driven by the solver from wherever
  the player actually is, so wandering off gets new advice rather than breaking a
  script. A test holds it to never naming a move that loses the room.

492 → 554 tests.

## What we learned

- **Polish cannot rescue a missing verb.** Said again because it cost a year.
- **A proved room is not a taught room.** The solver guarantees a way through; it says
  nothing about whether a human can find it. Every teaching feature in the cellar came
  from watching one real player get stuck, not from design.
- **Anything the game expects and never says is a bug in the teaching, not in the
  player.**
- **A check that cannot fail is not a check.** The planner's structural test had a bug
  that made it pass every shape; nothing shipped wrong, but nothing was being checked
  either.
- **Density is not free polish.** Fuller rooms are longer sightlines, and the cells you
  gain are cells a fox can watch — it trades against the one number this game promises
  a player.
- **Write the rules down where an agent will read them before the code.** `RULES.md`
  exists because the owner correctly predicted he would propose something
  game-breaking, and then did within the hour (a rule about foxes hearing water, which
  is deliberately not a rule).

## What it cost

Two nights and a day. The work reached `master` as a single squash commit
(**#22**, 117 files, ~11.9k lines) because merge commits are disabled on this repo and
"Rebase and merge" could not replay 134 commits over a `zx-kit` bump that had already
landed on `master` separately — the same change made twice, which git merges happily
and rebases not at all.

So **the 134 individual commit messages are not in `master`'s history.** They remain
readable on the PR. This document exists partly to carry what they said, and the
night-by-night detail lives in `retro/docs/sk/chaosbunny-noc-2026-09-12.md` and
`-13.md`.

## Open / next

- **Sound and light, judged by an ear and an eye.** Still the one thing nobody but the
  owner can do. `S` on the loaded picture is the bench; `L` walks the darkness levels.
- **The graphics are, in the owner's own word, terrible** — and that is now a *safe*
  problem, because the game underneath them is one he wants to play. Art can be made to
  serve a verb that exists. It could not invent one.
- **The ambient dim technique is unsettled.** Dithering adds black to a floor tile that
  already has black in it. The better idea is probably the Spectrum's own: use the
  BRIGHT bit — lamplit floor in `B_BLUE`, ordinary floor exactly as today — so rooms
  without a lamp do not change at all.
- Whether to release, and where. `docs/ROADMAP.md` S5.

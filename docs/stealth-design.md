# Tile stealth: the verb ladder, and where the rooms go next

> State on 2026-09-12, after a night on the `proto/stealth-*` branches. This is a
> **design** document, not a reference — the rules live in the module headers
> (`src/stealth/beat.ts` is the rulebook); this is the *why* and the *next*.
> **No room's solution appears here**, and none ever may: solvability is proved by
> the solver in the tests, never by prose. (A Slovak working copy sits next to this
> file as `stealth-design.sk.md`, git-ignored like every other `.sk.md`.)

## 1. What the game is

One screen is one room: 16×11 tiles of 16 px. Time is not seconds but **beats** —
every action you take (step, throw, ears, wait) moves the whole world one step.
Nobody dies: a fox picks Randy up by the jacket and the room starts again.

The verb is **slip past**. Not kill, not jump — get through as if you had not been there.

Why beats and not real time: a real-time prototype would be another game about
reflexes, and reflexes are exactly what we got wrong twice (charge-jump, the fall).
A beat is **legible** — you can point at the cell where you went wrong. It also makes
a solver possible, and the solver is a **guarantee of solvability**, the same promise
Minefield's generator gives its fields.

## 2. The verb ladder

Every room adds **exactly one** new thing and tests the one before it. Each room's
test proves the new thing is **load-bearing** by ablation: switch it off and the room
either cannot be finished or collapses to something much shorter.

| # | Name | New verb | Ablation in its test |
|---|---|---|---|
| 1 | the pantry corridor | throw a carrot, hide behind a crate | no carrot: impossible |
| 2 | the crossing | **a `?` is a warning, not a capture** | it cannot be walked unseen, and nothing else in it is needed |
| 3 | the dark corridor | the dribble (2 steps with the ears down) | no ears: impossible |
| 4 | the junction | two cones at once | — |
| 5 | the bat's larder | silence: a bat hears ears-up steps | without the bat, ears are unnecessary |
| 6 | the bat's hall | a bat and two foxes | without the bat, par 22 |
| 7 | the sentry | the window when a sentry looks away | freeze the sentry: impossible |
| 8 | the lit corner | **the lamp: light kills shadow** | leave the lamp burning: impossible |
| 9 | the plank | **the creaky board**: a noise the ears cannot hide | wall the plank off: no way out; plain floor: par 21 against 35 |
| 10 | the handle | **a lever and a grate**: a switch that changes the room elsewhere | wall the grate up: no way out; open from the start: par 13 against 27 |
| 11 | the long way round | **two gates on one route**: a grate and a plank | wall the grate up: no way out; silent floor: par 21 against 28 |
| 12 | the window | **everything at once**: grate, lamp, carrot, ears | take any one away and there is no way out |
| 13 | the roost | **a bat over the lamp room**: dark is no help against ears | without the bat, par 24 against 33 |

Where the ladder should go next (a proposal, not a promise):

10. **A decision**: two plans that cost the same — a room with no single "right"
    answer. The search for it now exists and has not found one yet; see below.

## 3. The rules that already hold, one line each

| Thing | Rule | Why it is that way |
|---|---|---|
| ears up | you see every cone and each fox's next two steps | information is the reward for risk |
| ears down | you see none of that, but shadow hides you | fear as a mechanic, not as an effect |
| the dribble (`SNEAK_STEPS = 2`) | ears down buys 2 steps, then they must go up | the owner's basketball analogy; 0 makes ears a freeze, ∞ makes them invisibility |
| cover (crate) | blocks sight only with the ears down | the ears stick out over it — and you can see that |
| shadow | hides ears-down Randy, never right in front of a fox | so shadow is not a safe |
| carrot | flies 3 cells, heard 5 away (through walls) | the only ranged verb in the game |
| fox | cone 1 then 3 wide to 4; `?` on the first sighting, `!` on the second | two chances, never one |
| bat | blind; hears the carrot and **ears-up steps** | forces the dark even where there is light |
| sentry | stands and turns, 2 beats a facing | time as a passage, not as an obstacle |
| lamp | lights 3 steps out; **light kills shadow**; a carrot puts it out for good | one carrot, two uses, never both |
| lever and grate | a grate is a wall Randy sees through and a fox never fits through; stepping on the lever works every grate, and works them back | the first thing that changes the room somewhere you are not |
| creaky board | creaks under Randy's step, ears up or down; heard 3 away, nothing there to find | the first thing the dribble cannot save you from |
| listening | a fox that hears a creak stands still one beat, then comes | the noise is under Randy's own foot: without the pause it would be one chance, not two |

## 4. How a room actually gets designed

1. **The generator** (`tools/roomgen`, `npm run roomgen`) throws out hundreds of
   plans from rectangles and corridors, sprinkling shadow, crates, boards and patrols.
2. **The solver** marks each candidate: `par` (the shortest way out), `fewest ?` (how
   often the most careful player is noticed), and the ablations — no carrot, no ears,
   lamp kept on, sentry frozen, planks turned to silent floor.
3. **Choose by the ablations, not by the picture**: a good room is one that *cannot*
   be done without its new thing.
4. **Keep the plan as it came.** Tuning a layout "so it works" quietly draws my own
   solution into it.
5. The solver's `par` is written into the room and pinned by its test: change a rule
   and the test fails until the numbers are recomputed. (That is exactly what caught
   the move to `SNEAK_STEPS = 2`.)

**The decision room, and why there is not one yet.** Every way out either leaves the
lamps burning or puts one out, so `solve({lamps: false})` and `solve({lampsOut: true})`
are the two halves of a room's plans and their pars say what it really offers: far
apart is a right answer and a wrong one, close together is a choice. `KIND=decision`
keeps rooms where they tie within two beats and the carrot is needed at all.

Searched: 2500 seeds with the extra requirement that the room also **press** (need the
ears, or notice even the most careful player) — nothing. Two rooms tie without pressing;
a thin room is worse than none, so neither shipped. One hand-drawn attempt failed for a
reason worth keeping: **putting a lamp out is a noise, and the noise pulls the very
guard the dark was meant to hide you from**. A room where darkening is a real option
has to give that guard somewhere else to be, or give Randy somewhere to be while it
comes and looks.

**Two things at once is rarer still — until you stop rolling dice.** `KIND=lampboard`
asks for a room where the lamp makes it impossible *and* the plank costs four beats or
more: 3000 seeds, nothing. Each requirement alone is about one room in a few thousand,
so their intersection is out of reach of a generator that throws shapes and hopes.

So the second generator goes the other way about (`tools/roomgen/route.ts`,
`KIND=route`): lay a **chain** of chambers from Randy to the door, join each pair with
exactly one corridor, and the map is a path — every corridor is a bridge, and cutting
it really does cut the room. The property a mechanic needs is then true **by
construction**. Twelve rooms in three hundred seeds, in thirteen seconds, each with two
load-bearing gates. room10 is the first of them.

**The dark gate took two goes, and the second one is a rule worth keeping.** The first
`GATES=dark` laid a shadow corridor, a guard watching a run of it and a lamp lighting
exactly that run — and every room it made was still walkable with the light on, because
*the carrot lures the guard away*. **A lamp only matters when the guard behind it cannot
be bought off.** room07 has that by accident: its guard sits in a corner it cannot leave,
because what separates the corner from the shaft is **the lamp itself** — solid to a fox,
transparent to its eyes and its light.

`carveLampPocket` now builds that on purpose: a pocket beside a corridor's end with the
lamp as its only window, the pocket checked to be sealed against fox pathing, and the
corridor running three cells past the lamp — the third is out of the cone (a cone reaches
four) and still within a carrot's throw (three), which is where Randy has to stand to put
the light out. room11 came out of it, and is the first room that needs every verb the
game has.

Its lesson generalises: **the expensive part of room design was never the search, it
was the shape.** A generator that plans the route can also plan where the player will
be standing when a noise goes off — which is what the decision room still needs.

**Lessons that cost time:**
- More than **two moving** foxes means hundreds of thousands of states (every `?`
  shifts every fox's phase). Hence standing guards and short routes.
- An open room is more expensive for the solver than a hard one; tight corridors are
  both cheap and good.
- Pruning throws nobody hears changes no answer (a test holds it to that) and cuts
  the tree by an order of magnitude.

## 5. Ideas, ranked by what they give against what they cost

Two of these are now built — kept in the table with what they actually cost, so the
next estimate has something to stand on.

| Idea | What it adds | The beat rule | Cost | The ablation that would prove it |
|---|---|---|---|---|
| ~~**Creaky board** `~`~~ **built** | routes get planned; shadow stops being universal | stepping on it is a noise, ears down or not | XS as estimated — one tile, one branch, plus the listening beat play needed | without it, par drops by five or more |
| ~~**Undo**~~ **built** | the prototype plays like a puzzle, not a reflex game | outside the rules — a stack of worlds in `main.ts` | XS as estimated | — (not a mechanic) |
| ~~**Lever and grate**~~ **built** | the first switch that changes the room elsewhere | a world bit like the lamps; a shut grate is wall | S as estimated — two tiles, a bit of world, a `KIND=lever` search | wall the grate up: impossible |
| **Two carrots, two lamps** | a decision instead of a puzzle | no new rule at all, only design | S | both plans cost the same par |
| **Ceiling spider** | punishes long straight corridors taken ears-up | drops when you pass under it with the ears up | S | without it the straight way works |
| **A candle a fox relights** | the dark is not forever: pressure on tempo | a patrol passing brings the lamp back in N beats | M (lamp state becomes a timer, more states) | without relighting, par drops |
| **A chain of rooms (the escape)** | the prototype becomes a game: carrots carry over | the world carries `carrots` between rooms | M (records, replay, saves) | — |
| **A dog on the scent** | a chase; punishes standing still | walks your own cells N beats behind | L (state grows a trail; the solver pays) | — |

My own view was **board → undo → lever**, and all three are now done. What the lever
opens is a class of rooms rather than a single trick: a grate that shuts behind you,
two grates on one handle, a handle a guard walks past. None of those need new code.

## 6. What is missing before this is a game

1. ~~**Getting from room to room**~~ — there is a cellar map now, and it is also how a
   room is chosen: the arrows walk the chain, Enter goes in, and it opens on the first
   cellar you have not beaten. It is the save file drawn, so it costs no new state. What is still missing is a *reason* for the
   chain — see below.
2. ~~**A reason**~~ — there is a screen before the first room now: the foxes' larder is
   under the hill, Randy went in for one carrot, the door shut. Eleven cellars to the
   night air — and, once the last one is behind him, the grass, with the beats the whole
   cellar took.
3. **Sound heard by an actual ear** — every blip and the AY loop are still my guess.
   There is a bench for it now: `S` on the loaded picture puts all twelve sounds on
   twelve keys, so two can be heard back to back. Tuning is the numbers in
   `sound.ts`'s `playEvents` and `music.ts`'s three strings.
4. **Resolution** — staying at 256×192; hi-res is a question for a sports game, not
   for this one.
5. ~~**A generator that lives in the repo**~~ — done: `tools/roomgen`, `npm run roomgen`.

## 7. Where it all lives

- Logic: `src/stealth/` (`beat.ts` is the rulebook, `solver.ts` is the guarantee).
- Rooms: `src/stealth/rooms/room01..room07.ts` — each header says **what** its test
  proves, never **how**.
- Tests: `tests/stealth/*.tests.ts`, one file per room.
- Art: zx-art `art/chaosbunny/`, copied into `src/art/zx/`.
- The night's branch table: `retro/docs/sk/chaosbunny-noc-2026-09-12.md`.

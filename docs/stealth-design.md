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
| 3 | the dark step | **the dribble alone**: one shadow cell, one guard, no carrot | no ears: impossible, and nothing else in the room could be the lesson |
| 4 | the dark corridor | the dribble (2 steps with the ears down) | no ears: impossible |
| 5 | the junction | two cones at once | — |
| 6 | the bat's larder | silence: a bat hears ears-up steps | without the bat, ears are unnecessary |
| 7 | the bat's hall | a bat and two foxes | without the bat, par 22 |
| 8 | the sentry | the window when a sentry looks away | freeze the sentry: impossible |
| 9 | the lit corner | **the lamp: light kills shadow** | leave the lamp burning: impossible |
| 10 | the plank | **the creaky board**: a noise the ears cannot hide | wall the plank off: no way out; plain floor: par 21 against 35 |
| 11 | the handle | **a lever and a grate**: a switch that changes the room elsewhere | wall the grate up: no way out; open from the start: par 13 against 27 |
| 12 | the long way round | **two gates on one route**: a grate and a plank | wall the grate up: no way out; silent floor: par 21 against 28 |
| 13 | the wade | **water**: two beats a cell, and no fox will follow | drained, the room is three beats cheaper; dry, three dearer |
| 14 | the flood | **water as the only door**: not a choice but a tax with teeth | keep his feet dry: no way out; drained, the room is four beats cheaper |
| 15 | the fork | **a decision**: two ways to the door, one carrot | both ways are real and two beats apart, and the carrot is needed either way |
| 16 | the roost | **a bat over the lamp room**: dark is no help against ears | without the bat, par 24 against 33 |
| 17 | the window | **everything at once**: grate, lamp, carrot, ears | take any one away and there is no way out |

And the same ladder as the solver sees it — regenerate with `KIND=ladder npm run roomgen`
rather than editing by hand, because these numbers are the room, not the prose:

| # | room | id | par | fewest ? | cannot be done without |
|---|---|---|---:|---:|---|
| 1 | the pantry corridor | `room01` | 13 | 0 | carrot |
| 2 | the crossing | `room1b` | 15 | 1 | — |
| 3 | the dark step | `room2b` | 21 | 1 | ears |
| 4 | the shadow shelf | `room3b` | 18 | 0 | ears + carrot |
| 5 | the dark corridor | `room02` | 30 | 1 | ears + carrot |
| 6 | the junction | `room03` | 26 | 2 | ears + carrot |
| 7 | the bat's larder | `room04` | 28 | 0 | ears + carrot |
| 8 | the bat's hall | `room05` | 35 | 1 | ears + carrot |
| 9 | the sentry | `room06` | 28 | 2 | ears |
| 10 | the lit corner | `room07` | 22 | 2 | ears + carrot + the dark |
| 11 | the plank | `room08` | 35 | 0 | carrot |
| 12 | the handle | `room09` | 27 | 2 | ears + the lever |
| 13 | the long way round | `room10` | 28 | 1 | carrot + the lever |
| 14 | the wade | `room16` | 15 | 0 | — |
| 15 | the flood | `room13` | 20 | 0 | wet feet |
| 16 | the fork | `room14` | 19 | 0 | carrot |
| 17 | the roost | `room12` | 33 | 1 | ears + carrot + the dark |
| 18 | the window | `room11` | 32 | 1 | ears + carrot + the dark + the lever |

The number is the room's **place**, not its file: `rooms/index.ts` is the order and a
room's name is only the key its record is filed under, so the second room is `room1b`.

Where the ladder should go next: nothing is queued. Every idea in §5 that was worth
building is built, and the last of them — the decision room — took a change of shape
rather than another search. What is left is play: rooms are cheap now, so the next ones
should come from what the game turns out to need, not from what the generator can make.

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
| water | Randy wades it, no fox follows; a step in costs **two beats and two turns of the world** | the first rule about what a route is worth rather than who can sense you |
| water in sight | never built: a wade is two beats Randy cannot react in, so a cone over water is a capture with no warning | the promise is two chances, and a wade has none — the planner refuses such a room |
| water and bats | a wade with the ears up inside a bat's earshot is always a bite: it hears four cells away and covers two a flight, and a wade hands it two flights | fair because the ears answer it — down, it hears nothing — and the `~` over the bat is the warning |
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

**The decision room, and what it took.** Every way out either leaves the lamps burning
or puts one out, so `solve({lamps: false})` and `solve({lampsOut: true})` are the two
halves of a room's plans and their pars say what it really offers: far apart is a right
answer and a wrong one, close together is a choice.

Two searches for that on the shape-rolling generator found nothing in 2500 seeds, and a
hand-drawn attempt failed for a reason worth keeping: **putting a lamp out is a noise,
and the noise pulls the very guard the dark was meant to hide you from.** What finally
worked was neither — it was digging the last corridor **twice**, once round each corner,
so the room has two ways and neither is a bridge (`KIND=fork`). Six rooms in six thousand
seeds, in fourteen seconds; room14 is one of them.

The fork also caught a bug that had been hiding in plain sight: the planner's structural
check asked whether the door could still be reached with a cell cut, and its idea of a
walkable cell did not include the door. So it answered "no" for every room and passed
every shape. The chain rooms were bridges by construction and each one's test proves its
own ablation, so nothing that shipped was wrong — but **a check that cannot fail is not a
check**, and the fork could not be built until it worked.

**Two things at once is rarer still — until you stop rolling dice.** `KIND=lampboard`
asks for a room where the lamp makes it impossible *and* the plank costs four beats or
more: 3000 seeds, nothing. Each requirement alone is about one room in a few thousand,
so their intersection is out of reach of a generator that throws shapes and hopes.

So the second generator goes the other way about (`tools/roomgen/route.ts`,
`KIND=route`): lay a **chain** of chambers from Randy to the door, join each pair with
exactly one corridor, and the map is a path — every corridor is a bridge, and cutting
it really does cut the room. The property a mechanic needs is then true **by
construction**. Twelve rooms in three hundred seeds, in thirteen seconds, each with two
load-bearing gates. `room10` (played eleventh) is the first of them.

**The dark gate took two goes, and the second one is a rule worth keeping.** The first
`GATES=dark` laid a shadow corridor, a guard watching a run of it and a lamp lighting
exactly that run — and every room it made was still walkable with the light on, because
*the carrot lures the guard away*. **A lamp only matters when the guard behind it cannot
be bought off.** `room07` has that by accident: its guard sits in a corner it cannot leave,
because what separates the corner from the shaft is **the lamp itself** — solid to a fox,
transparent to its eyes and its light.

`carveLampPocket` now builds that on purpose: a pocket beside a corridor's end with the
lamp as its only window, the pocket checked to be sealed against fox pathing, and the
corridor running three cells past the lamp — the third is out of the cone (a cone reaches
four) and still within a carrot's throw (three), which is where Randy has to stand to put
the light out. `room11` (played last) came out of it, and is the first room that needs every verb the
game has.

Its lesson generalises: **the expensive part of room design was never the search, it
was the shape.** A generator that plans the route can also plan where the player will
be standing when a noise goes off — which is what the decision room still needs.

**What it costs to run.** Measured on 2026-09-12 in the browser: 16.7 ms a frame in a
plain room, and the same in the two rooms with a burning lamp — the glow is a downscale
and two `drawImage`s, so it is free at this size. Worst frame over two seconds: 17.6 ms.
The rule that earned this (`CLAUDE.md`) still holds: anything static that would be
redrawn per frame goes in a layer cache, and the room's cache is only rebuilt when the
room itself changes — a lamp going out, a grate opening.

**Lessons that cost time:**
- More than **two moving** foxes means hundreds of thousands of states (every `?`
  shifts every fox's phase). Hence standing guards and short routes.
- An open room is more expensive for the solver than a hard one; tight corridors are
  both cheap and good.
- Pruning throws nobody hears changes no answer (a test holds it to that) and cuts
  the tree by an order of magnitude.

## 5. Ideas, ranked by what they give against what they cost

**Water is in, and what it cost.** The proposal below was taken up the same day it was
written. Two things came out of building it that the proposal did not see:

- **The solver was counting actions, and the game counts beats.** Identical numbers for
  fifteen rooms, so nobody noticed; a step that costs two beats separates them at once.
  `solve` is now a bucket queue over the clock and `par` means what the HUD means. The
  fix was safe because every room's par is pinned: all fifteen came out unchanged.
- **The route generator cannot make a water room.** Both ways round a rectangle are the
  same length, so a flooded short way is never worth wading; flooding only part of it
  does not help either. Water pays only where the wet way is *genuinely* shorter, which
  needs a shape the planner does not draw — a straight run against a detour. room16 was
  drawn by hand and judged by the solver, which is the same discipline by other means.

**Water has a second face the ladder has not used.** On the only way through rather than
on a fork, a flood is not a choice but a **tax with teeth**: every cell of it moves the
world twice, so a patrol's timing shifts under Randy while he wades. The planner does
make those, and **one is shipped now**: "the flood" (`room13`, seed 1218 of
`KIND=route GATES=water,sentry GAIN=3`), three cells of flooded stair on the only way
out of the first chamber, par 20 against 16 drained. It is the first room in the cellar
that `solve(room, { wade: false })` calls impossible — which is why it was built. Water
had shipped as a rule the game teaches and no room ever demanded, and a rule like that
is a promise the cellar does not keep: the `wants` tally counted zero rooms wanting wet
feet, which is how it was noticed at all. It sits straight after the wade, so the pair
asks the two halves of one question — what a route is worth, and what it costs when
there is no other.

**What a second cellar would be built on.** Eighteen rooms is one cellar's worth, and
every verb in it is taught, combined and finished with. The paragraph that used to sit
here proposed water as the spine of a second one; water is built now, and the two rooms
it produced say something the proposal could not.

What water actually taught, once it existed:

- **The beat economy is a real second axis.** Every rule before it answers "can they see
  or hear me". Water answers "how much is this route worth", and the two rooms it made
  are the only two in the cellar whose question is arithmetic. That was the bet, and it
  paid.
- **But one tile is not a spine.** The wade is a choice between two prices and the flood
  is a tax you cannot refuse, and that is the whole of what a single tile can ask. A
  cellar needs a rule that keeps producing questions after the third room, and water
  produced two.
- **What made the pair work was not the tile but the clock.** A wade moves the world
  twice while Randy moves once, so what actually changes is *when* he arrives. The
  interesting half of water is the patrol phase it shifts, not the beats it spends.

So the candidate for a second cellar is no longer a tile but that clock, used on purpose.
And counting the shipped rooms turned that from a hunch into a hole:

> **Of the twenty-five guards in the cellar, five walk — and all five pace a line two
> cells long.** Everything else stands still or turns on the spot.

That is not a design decision anybody made. It is what the tool grew into: the shape-rolling
generator made walking patrols, the route planner that replaced it places `watcher`,
`turner` and `listener`, and every one of those returns a guard with a single waypoint.
The planner got better at building rooms and quietly stopped building the thing the game
is *about* — the ears show a fox's next two steps, and in most rooms both of them are the
cell it is already standing on.

So the planner has a `pace` gate now: the chamber past the corridor gets a guard walking
its whole perimeter, a ring of six to ten cells, and the ablation is the obvious one —
stand it still on the first cell of its round and the room must get at least three beats
cheaper, or the walking was scenery. Two rooms out of fifteen hundred seeds pass that and
the fairness cap together (par 18 and par 28, each forcing two sightings), which is few,
and the reason is worth writing down: **a walking guard is hard to build a room around
because it is the only piece that cannot be waited out.** A standing cone has a shape you
can learn in one look; a loop has a phase, and a room where the phase is wrong when you
arrive has no answer at all rather than a slow one. That is exactly why a cellar built on
it would feel different — and exactly why its rooms have to be found, not drawn.

Nothing else in the rulebook is needed: patrols already walk any closed loop and
`fewestSightings` already prices the answer.

Three of the ideas below are now built — kept in the table with what they actually cost,
so the next estimate has something to stand on. Water, the fourth, outgrew the table and
has the section above to itself.

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
   under the hill, Randy went in for one carrot, the door shut. So many cellars to the
   night air (the screen counts them, so a new room cannot make it lie) — and, once the
   last one is behind him, the grass, with the beats the whole cellar took.
3. ~~**The rules a player cannot see**~~ — four of them are now said once each, at the
   beat they first bite, and all of them are on one screen (`H`, from the picture or from inside a room —
   the beat you left is still there when you come back): a `?` is a warning and not a capture, the dark hides only
   lowered ears, a bat hears the ones that are up, and wading costs two beats a step. This list came from a real player
   stuck in a room that was provably passable: **anything the game expects and never
   says is a bug in the teaching, not in the player.**

   The same player's other half of the problem was not a rule he did not know but an
   *idea* he had not had — he was walking a room built on the dark. So a room now says
   what it **wants** after three catches: the verb it cannot be left without, one line,
   in yellow, under the caught banner, and the next want each further catch. Nothing
   about it is written by hand. `wants.ts` asks the solver to leave a verb out and reads
   the answer off whether the room still opens, and `tests/stealth/wants.tests.ts` holds
   every room's declaration to that in both directions — nothing claimed that is not
   true, nothing true left unclaimed. That is what makes it safe to show: a want names
   the tool and never the hand, and there are as many wrong ways to use the right verb
   as there ever were. The cellar as it stands wants
   the ears down in eleven rooms, a carrot in twelve, a lamp out in three, the lever in
   three, wet feet in one, and nothing but timing in two — a tally the doc test keeps
   true, since a new room would quietly age it.
4. **Sound heard by an actual ear** — every blip and the AY loop are still my guess.
   There is a bench for it now: `S` on the loaded picture puts all twelve sounds on
   twelve keys, so two can be heard back to back, and `M` there starts the cellar hum —
   because the real question is whether a `?` cuts through it. Tuning is the numbers in
   `sound.ts`'s `playEvents` and `music.ts`'s three strings; nothing else has to change.
5. **Resolution** — staying at 256×192 with 16 px tiles, decided again on 2026-09-12
   when it was put as a question. Three reasons, all of them about the verb: the rules
   are countable in cells (a cone 1 then 3 wide to 4, a throw of 3, hearing 5, a dribble
   of 2) and on a finer grid those numbers stop being countable at a glance; the solver
   is the design engine, and four times the cells turns proving a room from milliseconds
   into minutes, which kills the generator loop; and a 16 px tile is four attribute
   cells, so it can keep the hardware rule, while an 8 px tile *is* the attribute cell
   and clash becomes unavoidable. Hi-res belongs to the sports game, not to this one —
   when this one needs more room, it needs more rooms, and those are cheap now.
6. ~~**A generator that lives in the repo**~~ — done: `tools/roomgen`, `npm run roomgen`.

## 7. What this taught us about zx-kit

Building on the kit this hard turned up two things worth sending back to it (a silent
failure in the layer cache, and one action button for a game with four verbs) and a
longer list of things that worked first time. It is written up for the kit's owner in
`docs/zx-kit-findings.md`.

## 8. Where it all lives

- Logic: `src/stealth/` (`beat.ts` is the rulebook, `solver.ts` is the guarantee).
- Rooms: `src/stealth/rooms/*.ts`, in the order `rooms/index.ts` lists them — each
  header says **what** its test
  proves, never **how**.
- Tests: `tests/stealth/*.tests.ts`, one file per room.
- Art: zx-art `art/chaosbunny/`, copied into `src/art/zx/`.
- The night's branch table: `retro/docs/sk/chaosbunny-noc-2026-09-12.md`.

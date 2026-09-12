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
| 2 | the dark corridor | the dribble (2 steps with the ears down) | no ears: impossible |
| 3 | the junction | two cones at once | — |
| 4 | the bat's larder | silence: a bat hears ears-up steps | without the bat, ears are unnecessary |
| 5 | the bat's hall | a bat and two foxes | without the bat, par 22 |
| 6 | the sentry | the window when a sentry looks away | freeze the sentry: impossible |
| 7 | *(in progress)* | **the lamp: light kills shadow** | leave the lamp burning: impossible |

Where the ladder should go next (a proposal, not a promise):

8. **A decision**: two carrots, two lamps, and two plans that cost the same — a room
   with no single "right" answer.
9. **The creaky board**: noise even with the ears down, so a route has to be planned.
10. **A lever and a grate**: the first switch that changes the room somewhere else.

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

## 4. How a room actually gets designed

1. **The generator** (`night/gen.ts`, still in a scratchpad) throws out hundreds of
   plans from rectangles and corridors, sprinkling shadow, crates and patrols.
2. **The solver** marks each candidate: `par` (the shortest way out), `fewest ?` (how
   often the most careful player is noticed), and the ablations — no carrot, no ears,
   lamp kept on, sentry frozen.
3. **Choose by the ablations, not by the picture**: a good room is one that *cannot*
   be done without its new thing.
4. **Keep the plan as it came.** Tuning a layout "so it works" quietly draws my own
   solution into it.
5. The solver's `par` is written into the room and pinned by its test: change a rule
   and the test fails until the numbers are recomputed. (That is exactly what caught
   the move to `SNEAK_STEPS = 2`.)

**Lessons that cost time:**
- More than **two moving** foxes means hundreds of thousands of states (every `?`
  shifts every fox's phase). Hence standing guards and short routes.
- An open room is more expensive for the solver than a hard one; tight corridors are
  both cheap and good.
- Pruning throws nobody hears changes no answer (a test holds it to that) and cuts
  the tree by an order of magnitude.

## 5. Ideas, ranked by what they give against what they cost

| Idea | What it adds | The beat rule | Cost | The ablation that would prove it |
|---|---|---|---|---|
| **Creaky board** `~` | routes get planned; shadow stops being universal | stepping on it is a noise, ears down or not | XS (one tile + a line in step 2) | without it, par drops / ears unnecessary |
| **Undo** | the prototype plays like a puzzle, not a reflex game | outside the rules — a stack of worlds in `main.ts` | XS | — (not a mechanic) |
| **Lever and grate** | the first switch that changes the room elsewhere | a world bit like the lamps; a shut grate is wall | S | with the grate shut: impossible |
| **Two carrots, two lamps** | a decision instead of a puzzle | no new rule at all, only design | S | both plans cost the same par |
| **Ceiling spider** | punishes long straight corridors taken ears-up | drops when you pass under it with the ears up | S | without it the straight way works |
| **A candle a fox relights** | the dark is not forever: pressure on tempo | a patrol passing brings the lamp back in N beats | M (lamp state becomes a timer, more states) | without relighting, par drops |
| **A chain of rooms (the escape)** | the prototype becomes a game: carrots carry over | the world carries `carrots` between rooms | M (records, replay, saves) | — |
| **A dog on the scent** | a chase; punishes standing still | walks your own cells N beats behind | L (state grows a trail; the solver pays) | — |

My own view: **board → undo → lever**. The first two are cheap and change how the
game feels more than anything else; the lever opens a whole class of rooms (and it is
a Spectrum classic).

## 6. What is missing before this is a game

1. **Getting from room to room** — today it is `1`–`9` and "next room" after a win.
   There is no map of the cellar and no sense of escaping.
2. **A reason** — why Randy is down there and what is behind the door. One screen of
   text before the first room would do it.
3. **Sound heard by an actual ear** — every blip and the AY loop are still my guess.
4. **Undo** — without it, long rooms are played carefully rather than cleverly.
5. **Resolution** — staying at 256×192; hi-res is a question for a sports game, not
   for this one.

## 7. Where it all lives

- Logic: `src/stealth/` (`beat.ts` is the rulebook, `solver.ts` is the guarantee).
- Rooms: `src/stealth/rooms/room01..room07.ts` — each header says **what** its test
  proves, never **how**.
- Tests: `tests/stealth/*.tests.ts`, one file per room.
- Art: zx-art `art/chaosbunny/`, copied into `src/art/zx/`.
- The night's branch table: `retro/docs/sk/chaosbunny-noc-2026-09-12.md`.

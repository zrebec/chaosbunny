# chaosBunny — Roadmap & task board

> Source of truth for **what's next and in what order**. Kept up to date as we go.
> Design brief: [`CLAUDE.md`](../CLAUDE.md). What may not be changed:
> [`RULES.md`](../RULES.md). Latest retrospective:
> [`docs/retrospective-2026-09-13.md`](./retrospective-2026-09-13.md) — why the game
> changed shape, and what that cost.
> Controls table lives in [`README.md`](../README.md) (an in-game overlay is on the list).

**Legend:** ✅ done · 🔜 next · 🔲 planned · 💭 later / idea

## 2026-09-12 — the tile-stealth direction (read this first)

chaosBunny turned into a **beat-based tile stealth game** on 2026-09-11 (owner's call,
after the platformer's charge-jump failed twice). One screen is one room, 16×11 tiles;
every action moves the whole world one beat; the verb is **slip past**. It is not a
sketch any more: **eighteen rooms**, each proved solvable by a solver in its own test,
a cellar map that is also the room chooser, a story and an ending, records and replays.

- Where it lives: `src/stealth/` (`beat.ts` is the rulebook, `solver.ts` the guarantee),
  rooms in `src/stealth/rooms/` with the order in `rooms/index.ts`, the design tool in
  `tools/roomgen/` (`npm run roomgen`).
- What to read: **`docs/stealth-design.md`** — the verb ladder, how a room gets designed
  and what each of them costs. A Slovak copy sits beside it.
- Where the work is: local branches, newest last, each one a working state. The nights'
  diaries with the whole table are `retro/docs/sk/chaosbunny-noc-2026-09-12.md` and
  `-13.md` (the second night; the room numbers in the first one have since shifted).
- What a stuck player is told: four rules are said once at the beat they first bite, all
  twelve are on one screen (`H`, from the picture or mid-room), and after three catches
  the room names the verb it cannot be left without — read off the solver by `wants.ts`
  and held to it by a test, so it names the tool and never the way.
- Still open, and only the owner can close it: **the sound** — every blip and the AY
  loop are a guess. `S` on the loaded picture opens a bench that plays all twelve.
- Resolution: asked again on 2026-09-12 and answered the same way as below — **256×192
  stays**, and for the stealth game there is a further reason: its rules are countable
  in cells, and the solver that proves every room gets four times more expensive on a
  finer grid.

### Order of work — the stealth game

| # | Task | Why | Effort | Status |
|---|------|-----|--------|--------|
| S1 | **Play it and say what the sound is wrong about** | Every blip and the AY loop are a guess; `S` on the loaded picture plays all thirteen sounds against the hum. This is the only item nobody but the owner can do. **The mix underneath it is now built** (2026-09-13): a beat says at most three things and the loudest first, a warning ducks the hum, every noise is panned to the cell it came from, and the bench can mute the hum's voices one at a time (`F` `G`, `J` for all). What is left is the one thing that was always left — an ear. | S | 🔜 |
| S2 | **Rooms on demand** | `npm run roomgen` finds them in seconds (`KIND=route` with `shadow`, `lure`, `grate`, `board`, `water`, `sentry`, `bat` gates, plus `fork`, `gentle`, `dribble`). Eighteen is a cellar's worth. The two newest each answered a question rather than filling a gap: "the flood" because the wants tally showed water was a rule no room enforced, "the shadow shelf" because the step from par 21 to par 30 was where a real player fell off. The next one should be asked for the same way. | S each | 💭 |
| S3 | ~~**The pad cannot wait a beat**~~ | It can now: waiting borrows `consumeDebug` (Ctrl+Shift+B / gamepad **Y**), which this game has no debug overlay to spend. Four verbs on a pad, the cellar finishable with one. The kit item stands — three buttons all named after something else is the missing feature restated, and a game wanting both a debug overlay and a fourth verb has run out. See `docs/zx-kit-findings.md`. | done (kit: S) | ✅ |
| S4 | **A second cellar, built on the patrol clock** | Water was the candidate and is now finished: one room offers the wade, the next demands it, and that pair is the whole of what one tile can ask. What made that pair work was not the tile but the clock — a wade moves the world twice, so what changes is *when* Randy arrives. So the spine is guards on loops longer than a room is wide, where the question is "where will it be in six beats". Nothing new in the rulebook; the planner has a `pace` gate for it already, and `docs/stealth-design.md` §5 says what it costs (a walking guard cannot be waited out, so its rooms have to be found rather than drawn). | M | 💭 |
| S5 | **Publish?** | Minefield's route (itch.io) or GitHub Pages, whichever the owner wants; CI already deploys `master`. Owner's call, and only after S1. | S | 💭 |

**The platformer list below is untouched.** Nothing in it has been cancelled; it is
simply not what the game has been for the last day. Which of the two chaosBunny is, is
the owner's decision, not this document's.

## Recently done

- ✅ **2026-09-16 — A real tape, a mirrored cellar, and locks that mean something.**
  The tape's tone is read from the loading screen's **own bytes** (`sound.ts`
  `tapeToneAt`): attribute bytes repeat, so the colouring at the end settles into a
  steady ~1700 Hz while the bitmap warbles around ~1450 — which is what the owner
  remembered hearing and what the old seeded noise got wrong. Its length is a config
  value now (`STEALTH_TAPE_SPEED`, 1 = a real ~45 s load). `?dev` is the **only** opener
  of locked rooms, on the dev server too — a lock that is off while you develop is a lock
  nobody sees working. `Esc` in a room opens the map (and comes back to the same beat).
  **`T` mirrors the whole cellar** (`mirror.ts`): the same rooms left to right, with
  records, medals and locks of their own. All but three keep their par; those three move
  because a fox breaks a tie between two equally short ways in `DIRS` order — measured,
  pinned in `MIRROR_PARS`, and recomputed by `tests/stealth/mirror.tests.ts`, which also
  holds the fairness number and every room's wants to the real cellar's.
- 🔲 **The story deserves a picture.** It is text on black today; Minefield's screens are
  the model (a `.scr` or a drawn panel, and more than one screen). Owner's call, parked
  until the sprites settle.
- ✅ **2026-09-16 — The way in, the map as the hub, and why you were caught.** From the
  owner's play-through: the tape loads for a real load's length (~45 s, any key skips;
  pulses are scheduled a moment ahead instead of all at once); a key after the picture
  shows every key (the bench and the rules were findable nowhere); the next key opens
  the cellar map, which is now where a room is chosen, with the story kept for the first
  entry into room 1. The marked room's numbers moved to the top of the map — par, best,
  points, and from save version 3 attempts and catches — because one number under every
  box ran into the row below. `?dev` in the address opens every room in a deployed build.
  And every catch says why, in one line checked against the sight rules
  (`caught.ts`; a random-play test holds every catch in all the rooms to having a reason).
- ✅ **2026-09-15 — The drip is out of the hum.** The owner's first verdict on the sound:
  a short high blip every few seconds, from nowhere, on the map too — the AY loop's drip
  voice, heard as a beep that means nothing in a game where every beep means something.
  The hum is now two voices (drone and air), the bench mutes them on `F` `G`, and
  `music.tests.ts` holds any future tune to `HUM_MIN_NOTE_MS` (no note or envelope under
  250 ms), so a composed track cannot bring the blip back. Music per room is the bigger,
  still open question.
- ✅ **2026-09-15 — Randy redrawn: four facings, ears up and down, a hop.** A rounder,
  chubbier Randy in the owner's colours (`B_CYAN`, `B_MAGENTA`, `B_WHITE`), 16×24 as
  before: facing the camera, facing away, and side-on (left is the mirror), each with the
  ears up and laid back, each in two frames — standing and mid-hop. Twelve rasters drawn
  by hand and validated with the `zx-spectrum-screen` skill (`src/art/zx/randy-td-*.json`).
  Which way he faces is picture only (`view.ts` `faceAfter`, kept with U and replays in
  `main.ts`); `World` never learns it, so no par moves. A step lifts him two pixels on an
  arc (`hopLift`). The move animation is slower: 150 → 220 ms a beat (foxes too), replay
  260 → 330 ms.
- ✅ **2026-09-15 — Score, medals and rooms that open in order.** `src/stealth/score.ts`:
  a room is worth `round(1000 × par / beats)` (a ratio rather than the −50-a-beat
  countdown, so a finished room never scores zero), a medal for on par (`*`) and within
  a quarter of it (`+`), and a room opens once the one before it has a record. All of it
  is read off `records.ts` — no new save field. The win screen says the medal and the
  run's points, the map draws medals, locks and the cellar's total, the ending adds the
  score. The room keys (`1`…`0`, `[` `]`) and entering a locked room from the map are
  dev-only now (`STEALTH_ROOM_SKIP = import.meta.env.DEV`). Still open from the same
  proposal: the transfer code and the after-a-catch statistics.
- ✅ **2026-09-13 — The polish pass: sound, light, and the hand on the shoulder.**
  - **Sound (S1's half that is not an ear).** A beat used to fire every one of its
    events at once, so the `?` that cost you the room arrived under four other blips;
    it now says at most three things, loudest first (`sound.ts` `orderEvents`). A
    warning pulls the hum down for 220 ms (`music.ts` `duckMusic`, through the
    `LoopHandle` mixer, which survives the loop seam). Every noise is panned to the
    cell it came from, measured from Randy (`panFor`) — the plank that creaked on his
    left is heard on the left. The `?` itself is no longer two identical ticks (which
    read as a clock) but a rising minor third struck twice.
  - **The border answers.** `setBorder` used to run only while the tape loaded; it now
    flashes yellow on a `?`, red on a capture and green on the way out — the one signal
    a Spectrum could give in a single frame, and the one that reaches a player who is
    looking at his own rabbit.
  - **Three levels of light instead of two.** The cellar away from a lamp is dimmed
    into the room's layer cache, so a lamp's reach is finally an island you can see the
    edge of — on plain floor, not only where the light happened to fall on shadow. `L`
    walks the levels (as it was → the cellar → the deep cellar) so the amount can be
    judged by eye rather than argued. No rule moved: all 18 pars are unchanged.
  - **The lamp is a choice you can see.** Aiming at a burning lamp now marks the shadow
    cells that putting it out would give back (`light.ts` `shadowsWon`, in EARS-DOWN
    cyan). It gives away no more than "a carrot flies 3 and is heard 5" already does.
    The lamp also breathes, and its halo takes 220 ms to die instead of cutting.
  - **The opening pair of rooms show the next move.** Driven by the solver from wherever the
    player actually is (`guide.ts`; `solve` gained an optional start world), so
    wandering off gets new advice rather than breaking it. A test walks the advice in
    both of them and in a room deliberately played into a mess, and holds it to never
    naming a move that loses the room. There, a `?` now says *"a ? is not a catch"*
    every time — room two cannot be crossed unseen, so the guide walks the player into
    one on purpose.
  - **`RULES.md`** — what may not be changed without breaking every room, and
    `tests/stealth/rulebook.tests.ts`, which pins every rulebook constant and says so
    loudly. 492 → 554 tests.

- ✅ **2026-06-05 — Instant music control.** `M` (mute) and `N` (next) now react
  immediately instead of at the end of the ~9.6 s loop. Root fix in zx-kit:
  `playAY()` returns an `AYHandle` whose `stop()` silences scheduled voices at once
  (shipped `zx-kit@0.31.1`); chaosBunny wired in `src/audio/music.ts`.
- ✅ **2026-06-06 — Auto-shuffle background music.** After every `MUSIC_LOOPS_PER_TRACK`
  (=2) loops the game shuffles to another track — a seeded *shuffle-bag* (each track
  once per cycle, never twice in a row). `N` still skips manually. Added
  `tests/music.tests.ts` (picker + manual skip + auto-rotation).
- ✅ **2026-06-07 — Crouch-gates (#2).** Crouch became a real traversal verb: shorter
  collision box, crawl-only low overhangs, can't stand under a ceiling, no jump from a
  crouch. Two mandatory gates in the level (P2, P5), guarded by a reachability linter
  (clearance window + stand-up zone). Also fixed: music un-muted itself on the next
  keypress. See `docs/crouch-gates.md`.
- ✅ **2026-06-07 — Carrot shot at two heights (#1).** `muzzle()` fires from shoulder
  height standing and low along the ground crouched, so a low bat is only neutralisable
  from a crouch (a higher one only standing); crouch-shoot keeps the low pose. Tests pin
  the gap + "low bat hit only from a crouch". Resolves the gate bat fairness from #2.
- ✅ **2026-06-07 — `C` playfield-look cycle.** `C` now cycles four looks: full-colour
  bricks → black background → mono (no-clash) → authentic ZX attribute clash (zx-kit
  `attrscreen` via a new `attrPainter`; per-8×8-cell colour bleed). Black-bg is a free
  render-skip; clash stamps everything into an AttrScreen and flushes once. Tests: cycle
  order + `attrPainter` stamps/re-inks a cell + thread fill.
- ✅ **2026-06-07 — Clash polish: single-colour rabbit.** In `clash` the rabbit is drawn
  as one ink (the union silhouette `asset.bitmap`) so it no longer self-clashes, but still
  clashes with obstacles per cell. Colour is `CLASH_RABBIT_INK` (palette, in `config.ts`).
  No sprite rewrite, no zx-kit change. Tests: single ink across the rabbit's cells.
- ✅ **2026-06-12 — Screen redesign: sidebar HUD + narrow playfield.** Classic ZX
  layout: framed sidebar (80px, carrot border, LIVES/CARROTS/FLOOR/versions/FPS)
  + 176×192 playfield (22×24 cells), everything inside 256×192. Level rebuilt for
  20 playable columns with the **long-crawl centrepiece** (ladder-only entry,
  13-tile crouch crawl, 2-tile stand-up zone, reversal over the gate roof on a
  crumble platform). New enemy: **mouse** — stompable Mario-style (flees off-screen,
  never dies; side contact hurts), pixel-perfect like everything else. Mono/clash
  modes now collapse only the playfield — the sidebar keeps its colours (the
  authentic "B&W game, colour HUD" ZX look). See docs/screen-redesign.sk.md.
- ✅ **2026-06-11 — Fake biomes v1: depth strata.** `LEVEL.strata` colours ambient
  tiles (stone, moss) per depth band at build time — deep green cave → fungal
  mid-cave → moon-touched frost; colder toward the moon. Mechanic tiles (crumble,
  overhang lip, ladder) keep global signal inks in every stratum (readability rule).
  No runtime switching — inks are stamped into tiles by `buildRoomFromLevel`
  (strata are level data, defaults stay `THEME_*` constants). Tests guard per-stratum
  inks + that strata visibly differ. Real biomes (music, darkness moods, 50 floors)
  remain B14.
- ✅ **2026-06-10 — Smooth cave lighting (torches + moon).** Darkness is on by default
  with a smooth ambient overlay cut out around wall torches and the moon (dim until the
  exit opens — a goal signal). Rabbit and carrot shots don't illuminate the cave (the
  rabbit's light is reserved for the planned lantern tool). Torch light **pulses
  organically** — radius + intensity on two incommensurate sines, deterministic and
  covered by tests (`tests/lighting.tests.ts`).

## Order of work (next → later)

| # | Task | Why | Effort | Status |
|---|------|-----|--------|--------|
| 1 | **Lighten chaosBunny (config + dead-code cleanup)** | ✅ **Done.** The dead procedural generator (`generateCaveRoom`/`buildCaveRoom`, staircase consts `STEP_UP`/`PLAT_W_*`/`EDGE_GAP_*`/`LEDGE_*`, `tests/generate.tests.ts`) was removed once fixed levels won. Playfield inks → `THEME_*_INK` consts (2026-06-11). `CANVAS_SCALE` dropped for zx-kit `SCALE` (2026-06-14). `GAME_WIDTH/HEIGHT` kept (the game's own screen size — zx-kit doesn't own it). | S | ✅ |
| 2 | **Replace / retune track 2 "Crystal Drip"** | Owner dislikes it. Music-content task — do it in a dedicated music session. | S | 🔲 |
| 3 | **In-game controls overlay** | ✅ **Done 2026-06-11 as part of pause:** `B` (or `P` / gamepad Start) pauses the game — music stops, every update and time-driven visual freezes (`gameTime` clock, separate from wall time) — and a blinking PAUSED + the full key help renders over the frozen scene. | S | ✅ |
| 4 | **Testing push (targeted now, big later)** | Keep adding focused unit tests as features land; defer the 100% / headless-browser sweep until structurally stable. Coverage floor ~75–80 % on logic modules, not 100 % on canvas. | ongoing / L | 💭 |
| 5 | **ZX dither lighting (opt-in, restore + tune)** | The `'zx'` mode was removed 2026-06-10 when smooth won as default. Last implementation (zx-kit `lighting` + depth gradient `MAX_DARKNESS`/`SURFACE_LIGHT_FACTOR`) lives in git history on `master`; `docs/lighting-archive.md` only has the older pre-zx-kit snapshot. Restore behind `LIGHTING_MODE` if a biome wants the authentic blocky look. | S–M | 💭 |

## Before new content — geometry first

Three things define the game's geometry and must land **before** new levels/biomes
(the level gets rebuilt once): **screen layout** (✅ sidebar + 22 cols), **rabbit
redraw** (silhouette-first — changes `RABBIT_BOX`, and thus platform spacing), and
**charge-jump** (hold-to-charge height — changes `JUMP_APEX_PX` and the reachability
linter). Author more floors / biomes only after those land, or every spacing gets
re-tuned twice.

## Parking lot / notes

- ✅ **Resolution — decided: keep 256×192** (a future hi-res *remaster* only, never this
  engine). Full cost/identity analysis in `docs/resolution.sk.md` (local, Slovak).
- 💭 **Mono vs clash:** keep both — mono = clean no-clash readability, clash = authentic
  bleed; together they show zx-kit's range. Not redundant.
- More music arrives with more levels → the shuffle-bag scales automatically (N tracks).
- Earlier perf & colour-clash history and rationale: `CLAUDE.md`, `docs/retrospective-2026-06-01.md`.
- Each item is its own small, checkpointed commit (playtest between steps).

# Crouch-gates — crouch-only low passages (design + plan)

> Roadmap item #2. Some lower overhangs the rabbit can only pass **crouched** — a
> second traversal verb beside jump and ladder. Goal: get the fixed level tip-top
> *before* biomes / 100 floors, so we encode the fairness rule (below) as a tested
> linter and never author a trap. See [`CLAUDE.md`](../CLAUDE.md) (non-cruel +
> reachability-is-tested) and [`ROADMAP.md`](./ROADMAP.md).

## The hard invariant (read twice)

**You cannot jump from a crouch.** So a crouch-under overhang must always leave a
**stand-up zone**: a stretch of its *supporting platform* that protrudes past the
overhang, where the rabbit can stand to full height and then **either jump or grab
a ladder** to the next platform. ⇒ **the overhang must be narrower than the
platform beneath it.**

### ✅ Valid — platform P protrudes past overhang O, exits by jump *or* ladder

```
                          ████████   N  (next platform — up & to the side, or via a ladder)
        ▒▒▒▒▒▒▒▒                      O  (low overhang: crouch to pass under)
   ██████████████████████            P  (supporting platform)
   └ crawl under O ┘└ stand ┘
                     └ jump / ladder to N ┘
```

### ❌ Invalid — overhang spans the whole standing surface = trap

```
   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒            O  (as wide as / wider than P)
   ██████████████████████            P   → can never stand → can never leave
```
The linter must reject this.

## Technical solution

**Crouch = shrink the collision box's height** (bottom/feet stay put, top drops to
`feet − CROUCH_BOX.h`). Then "crawling under" falls out of the *existing* tile
collision (`box(p)` → `resolveRectX/Y` in `player.ts`): the tall standing box hits
the overhang like a wall; the short crouch box passes beneath it. No new collision
code — just the box swap, plus three rules:

1. **Crawl** — movement allowed while crouched, at `physics.crouchSpeed` (slow).
2. **Can't un-crouch under a ceiling** — releasing Down stands only if the headroom
   above the crouch box is clear (`canStand`); otherwise stay crouched until clear.
3. **No jump from a crouch** — jump is gated by `!p.crouching` (this is *why* the
   invariant exists).

**Geometry (derived — no magic numbers).** Clearance under an overhang (platform
row `Py`, overhang row `Oy`) = `(Py − Oy − 1)·CELL`. A valid crouch-gate has
```
CROUCH_BOX.h ≤ (Py − Oy − 1)·CELL < RABBIT_BOX.h
```
so the standing rabbit bonks and the crouched one fits. Boxes derive from the art
(`rabbit.ts`); the crouch sprite is already authored bottom-aligned (feet on the
ground line) so **no render offset is needed**. The exact valid row offset is left
to the linter, not hard-coded — same philosophy as `STEP_UP`.

## Implementation steps (checkpointed — playtest after each)

- [x] **Step 1 — Crouch mechanic** ✅ **DONE 2026-06-07.** `rabbit.ts`: `CROUCH_BOX`
  derived from the crouch art (bottom-aligned to standing feet). `player.ts`:
  `p.crouching` state; `box(p)` returns the crouch box when crouched; crawl at
  `physics.crouchSpeed`; `canStand` head-bump (stay crouched under a ceiling); jump
  disabled while crouched. `config.ts`: `physics.crouchSpeed`. Playtest confirmed
  (can't jump while crouching); smoke tests in `tests/crouch.tests.ts`. **Measured:**
  `RABBIT_BOX` 13×20, `CROUCH_BOX` 13×12 → a valid crouch-gate overhang sits exactly
  **3 rows above its platform (16px clearance)**; d=2 (8px) too low, d=4 (24px) walkable.
- [x] **Step 2 — Overhang data + tile + mandatory gate.** ✅ **DONE 2026-06-07.**
  `room.ts` `LevelData.overhangs:{x,y,w,h?}` laid as a solid block (bottom = cyan lip
  tile, rows above = stone cap so a tall gate can't be jumped over); `OVERHANG_TILE`
  in `sprites.ts` + `atlas.ts`. `level.ts`: widened **P5** + a **mandatory** crouch-gate
  `{x:18,y:24,w:3,h:5}` — land on P5's right (from P4), crawl left under the lip to the
  stand-up zone, jump to P6 (no other route); carrot at (20,31) collected on the crawl.
  Playtest: passable (bat below P5 feels a touch unfair until the crouch-shot in #1; you
  can retreat a platform to dodge, so not a dead-end). Smoke tests in `tests/crouch.tests.ts`
  (can't-stand-under-ceiling, overhang built solid). **Also fixed:** music un-muted itself
  on the next keypress (audio-unlock `startMusic()` ignored mute) — added a `muted` flag +
  `isMusicPlaying()`, test in `tests/music.tests.ts`.
- [x] **Step 3 — Reachability linter.** ✅ **DONE 2026-06-07.** `tests/level.tests.ts`:
  `jumpReachable` now requires a *standable* takeoff column (not under an overhang) —
  models "no jump from a crouch". Two crouch-gate tests assert every overhang is a
  valid gate (clearance window `[CROUCH_BOX.h, RABBIT_BOX.h)`) **and** leaves a
  stand-up zone (narrower than its platform) — else fail and name it. Verified it
  bites: a full-width trap overhang failed both reachability + stand-up-zone (named
  the offender), then reverted. 50 tests pass.
- [x] **Step 4 — Author passages.** ✅ **DONE 2026-06-07** (playtest: both gates
  passable). Two mandatory gates: Gate 1 over **P2** (crawl right past a carrot → jump
  to P3) and Gate 2 over **P5** (crawl left → jump to P6). Both linter-green (clearance
  window + stand-up zone validated). Known: bat1 chases into both crawls; fairness lands
  with roadmap #1 (carrot shot at ≥2 heights).

**✅ Crouch-gates feature COMPLETE** (Steps 1–4). Step 5 (visual-cue polish) stays
optional/deferred. Next: roadmap **#1 — carrot shot at ≥2 heights**, which also makes
a low bat only neutralisable from a crouch (add a unit test pinning exactly that).
- [ ] **Step 5 — (optional) visual cue / polish.**

## Open questions / caveats

- Crouched at a platform *edge* then stepping off reverts to the standing box for
  one airborne frame — keep gates away from fall-off edges (or refine later).
- Distinct overhang tile art (stalactite / low lip) so the passage reads fairly
  without trial-and-error.
- Keep first gates simple — one mechanic at a time (no crumble/ladder combos yet).

# Crouch-gates — crouch-only low passages (DRAFT / design note)

> Status: **draft, not implemented.** Roadmap item. Capturing the design — and
> especially the *hard invariant* — now so we don't author traps that would be
> painful to fix after biomes / 100 floors. See [`CLAUDE.md`](../CLAUDE.md)
> (non-cruel + reachability-is-tested) and [`ROADMAP.md`](./ROADMAP.md).

## Concept

Some **lower overhangs** force the rabbit to **crouch** to pass under them — a
second traversal verb beside jump and ladder. Not all platforms: a *few*, placed
deliberately, to make the fixed level richer before we go wide (biomes, depth).

This pairs with the carrot-shot-while-crouched fix (ROADMAP #1): crouch becomes a
real, useful state, not just a pose.

## The hard invariant (read this twice)

**You cannot jump from a crouch.** So a crouch-under overhang must always leave a
**stand-up zone**: a stretch of its *supporting platform* that sticks out past the
overhang, where the rabbit can stand to full height and take off.

Concretely: **the overhang must be narrower than the platform beneath it**, and
positioned so the platform protrudes on the exit side.

### ✅ Valid — platform P protrudes past overhang O

```
                          ████████   N  (next platform — up & to the side)
        ▒▒▒▒▒▒▒▒                      O  (low overhang: crouch to pass under)
   ██████████████████████            P  (supporting platform)
   └ crawl under O ┘└ stand ┘
                     └ jump to N ┘
```
The rabbit crouches under `O`, comes out onto the part of `P` beyond `O`, stands,
and jumps to `N`. Reachable.

### ❌ Invalid — overhang covers the whole standing surface = a trap

```
   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒            O  (as wide as / wider than P)
   ██████████████████████            P
```
The rabbit can never stand on `P` (always under `O`) → can never jump out → stuck.
**This is the case the linter must reject.**

## Mechanics this needs

1. **Low-clearance level data** — a way to author an overhang whose underside sits
   *below standing head height but above crouch head height* (i.e. clearance
   between `CROUCH_BOX.h` and `RABBIT_BOX.h`). Probably solid tiles placed at a
   sub-`STEP_UP` height, or a tagged "low ceiling" cell.
2. **Can't un-crouch under a low ceiling** — when the player releases crouch, only
   stand if there's full head clearance above; otherwise stay crouched. (Head-bump
   check on stand-up, mirroring the existing anti-head-bonk jump logic.)
3. **No jump from crouch** — jump is disabled while crouched; the player must stand
   first. (Confirm/enforce in `updatePlayer`.) This is *why* the invariant exists.
4. **Crouched horizontal speed** — already have `state==='crouch'`; ensure movement
   under a ceiling works at crouch height (collision box swap).

## Reachability linter (the safety net — do this with the feature)

`tests/level.tests.ts` already floods from the floor and asserts every platform is
reachable by jump (with head clearance) or ladder. Extend it to understand crouch:

- Model the **crouch box height** as a second agent profile.
- A cell is *passable crouched* if it has ≥ `CROUCH_BOX.h` clearance even when it
  lacks full standing clearance.
- For every crouch-gate, assert a reachable **stand-up zone** exists on the
  supporting platform (full standing clearance) from which the onward jump lands a
  reachable platform. If not → fail the test and **name the offending overhang**.

Everything stays derived from the rabbit's boxes (`src/rabbit.ts`) — no magic
numbers — so resizing the sprite re-tunes clearances automatically (same rule the
project already follows for `STEP_UP` etc.).

## Open questions

- Visual cue for "you can crouch under here" (e.g. a distinct low-ceiling tile or
  drip/stalactite hint) so it reads fairly without trial-and-error?
- Do crouch-gates ever combine with crumble tiles or ladders? (Keep the first ones
  simple — one mechanic at a time.)
- Author 1–2 example passages in `src/world/level.ts` once the linter is in.

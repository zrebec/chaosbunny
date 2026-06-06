# chaosBunny — Roadmap & task board

> Source of truth for **what's next and in what order**. Kept up to date as we go.
> Design brief: [`CLAUDE.md`](../CLAUDE.md). Latest retrospective:
> [`docs/retrospective-2026-06-01.md`](./retrospective-2026-06-01.md).
> Controls table lives in [`README.md`](../README.md) (an in-game overlay is on the list).

**Legend:** ✅ done · 🔜 next · 🔲 planned · 💭 later / idea

## Recently done

- ✅ **2026-06-05 — Instant music control.** `M` (mute) and `N` (next) now react
  immediately instead of at the end of the ~9.6 s loop. Root fix in zx-kit:
  `playAY()` returns an `AYHandle` whose `stop()` silences scheduled voices at once
  (shipped `zx-kit@0.31.1`); chaosBunny wired in `src/audio/music.ts`.
- ✅ **2026-06-06 — Auto-shuffle background music.** After every `MUSIC_LOOPS_PER_TRACK`
  (=2) loops the game shuffles to another track — a seeded *shuffle-bag* (each track
  once per cycle, never twice in a row). `N` still skips manually. Added
  `tests/music.tests.ts` (picker + manual skip + auto-rotation).

## Order of work (next → later)

| # | Task | Why | Effort | Status |
|---|------|-----|--------|--------|
| 1 | **Carrot shot at ≥ 2 heights (crouch shot)** | **Fairness bug.** A bat flying low near the floor can't be neutralised today — the shot always leaves at one height, even when crouched. House rule: every threat must have counterplay. | S | 🔜 next |
| 2 | **Background toggle: bricks → black** | Cheap visual variety; sprites pop on black (arcade/ZX feel) while keeping colour. Keep all three modes: bricks / black / mono. | XS–S | 🔲 |
| 3 | **Opt-in dither lighting (re-enable + tune)** | Modern-ZX atmosphere; infra already exists (`LIGHTING_MODE`, zx-kit `lighting`). Real work = fairness in the dark — add a rabbit-centred light so you can always see around you. | S–M | 🔲 |
| 4 | **`C` cycles 3 playfield modes: modern → mono → authentic clash** | Today `C` is a 2-state mono toggle; make it a 3-way cycle. Adds zx-kit's `attrscreen` (true per-cell attribute clash) the game currently skips — opt-in "museum" authenticity that shows off the engine. The 2×3-cell rabbit looks rough clashed (why mono is the default) — fine as opt-in. `clash.ts` already has the `Painter` abstraction (`ctxPainter`/`monoPainter`); add an `attrPainter`. | S–M | 🔲 |
| 5 | **Replace / retune track 2 "Crystal Drip"** | Owner dislikes it. Music-content task — do it in a dedicated music session. | S | 🔲 |
| 6 | **In-game controls overlay (`?` / `H`)** | Keybindings keep growing; show them in-game. README table already exists. | S | 💭 |
| 7 | **Testing push (targeted now, big later)** | Keep adding focused unit tests as features land; defer the 100% / headless-browser sweep until the game is structurally stable. Coverage floor ~75–80 % on logic modules, not 100 % on canvas. | ongoing / L | 💭 |

## Parking lot / notes

- More music arrives with more levels → the shuffle-bag scales automatically (N tracks).
- Earlier perf & colour-clash history and rationale: `CLAUDE.md`, `docs/retrospective-2026-06-01.md`.
- Each item is its own small, checkpointed commit (playtest between steps).

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

## Order of work (next → later)

| # | Task | Why | Effort | Status |
|---|------|-----|--------|--------|
| 1 | **Lighten chaosBunny (config + dead-code cleanup)** | The codebase is accreting cruft. Biggest win: remove the **dead procedural generator** (`generateCaveRoom`, `buildCaveRoom`, the staircase constants `STEP_UP`/`PLAT_W_*`/`EDGE_GAP_*`/`LEDGE_*`, and `tests/generate.tests.ts`) — unused since fixed levels won; `room.ts` ~halves. Colours from the palette, not hex (`CARROT_INK` → `C.B_YELLOW`). Drop `CANVAS_SCALE` (duplicates zx-kit `SCALE`). Keep `GAME_WIDTH/HEIGHT` (the game's own screen size — zx-kit doesn't own it). | S | 🔜 next |
| 2 | **Opt-in dither lighting (re-enable + tune)** | Modern-ZX atmosphere; infra exists (`LIGHTING_MODE`, zx-kit `lighting`). Real work = fairness in the dark — add a rabbit-centred light so you can always see around you. | S–M | 🔲 |
| 3 | **Replace / retune track 2 "Crystal Drip"** | Owner dislikes it. Music-content task — do it in a dedicated music session. | S | 🔲 |
| 4 | **In-game controls overlay (`?` / `H`)** | Keybindings keep growing; show them in-game. README table already exists. | S | 💭 |
| 5 | **Testing push (targeted now, big later)** | Keep adding focused unit tests as features land; defer the 100% / headless-browser sweep until structurally stable. Coverage floor ~75–80 % on logic modules, not 100 % on canvas. | ongoing / L | 💭 |

## Parking lot / notes

- ✅ **Resolution — decided: keep 256×192** (a future hi-res *remaster* only, never this
  engine). Full cost/identity analysis in `docs/resolution.sk.md` (local, Slovak).
- 💭 **Mono vs clash:** keep both — mono = clean no-clash readability, clash = authentic
  bleed; together they show zx-kit's range. Not redundant.
- More music arrives with more levels → the shuffle-bag scales automatically (N tracks).
- Earlier perf & colour-clash history and rationale: `CLAUDE.md`, `docs/retrospective-2026-06-01.md`.
- Each item is its own small, checkpointed commit (playtest between steps).

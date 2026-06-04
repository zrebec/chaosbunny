# Retrospective — 2026-06-01

A session that turned chaosBunny from "a climber with a goal" into a game with
**polish, performance, and sound**, and grew **zx-kit** by two reusable modules
along the way.

## What we shipped

**zx-kit (engine):**
- **`lighting`** module (→ v0.26.0) — dithered cave darkness done fast: pre-baked
  per-level dither tiles + a per-cell *dirty* buffer + **one `drawImage`/frame**
  (no per-frame `putImageData`). Tests + README.
- **`music`** module (→ v0.27.0) — write AY music by **note name** (`noteToFreq`,
  `seq`) and **loop** it (`playAYLoop`). Tests + README.
- Both **additive**, so every game (minefield, iceroads, frogger, submarine,
  maxbeeper) bumped with **no rewrites**.

**chaosBunny:**
- **Perf**: the dungeon background was ~30k `fillRect`s/frame → pre-rendered once
  to an offscreen canvas, **one blit/frame**. GPU ~120% → ~60%, locked 60 fps.
- Lighting moved into zx-kit; the game keeps only the depth/brightness *policy*.
  Darkness is **off by default** for now (revisit with biomes).
- **Audio** unlock fixed (resume on every gesture; survived HMR).
- **HUD** polish: HP as hearts, inset past the border on black paper, FLOOR
  repositioned; a permanent **FPS** readout and a **`vX/zx-kit`** version line.
- **Versioning** started (0.2.0), shown in-game; **CHANGELOG** + **README** added.
- **CI/Pages** deploy workflow, gated to releasable commits (feat/fix/perf/break).
- **Background music**: an arrangement of **Scarborough Fair** (A-Dorian) with a
  bass drone + kick drum, looping; `M` mutes.

## What we learned

- **Profile before optimising.** We chased a "60% GPU" number that turned out to
  be fine — the game was locked at **60 fps**. The CPU bottleneck (`putImageData`)
  was real and worth fixing; the GPU% was a red herring on a 4K dev build.
- **Offscreen-cache is the pattern** for any static layer redrawn each frame
  (`drawBitmap`/`fillRect` per pixel is great for sprites, lethal in a full-screen
  per-frame loop).
- **Engine over workaround.** Lighting and music belong in zx-kit, not patched
  per-game — and kept *additive* so a version bump never breaks an existing game.
- **Fixed, hand-authored levels** (earlier) + **reachability as a test** keep the
  climb learnable and provably beatable; the rabbit's collision box drives the
  spacing so resizing it doesn't need re-tuning.

## Open / next

- Music: longer/biome-specific loops (transcribe more public-domain tunes —
  ABC from thesession.org, classical from Mutopia/IMSLP). Instant mute would need
  a small zx-kit extension (current mute lands at the loop boundary).
- **Biomes**: per-area darkness mood + music; tune `MAX_DARKNESS` / `SURFACE_LIGHT_FACTOR`.
- A dedicated **climb sprite** for the rabbit; more level content toward 50 floors.

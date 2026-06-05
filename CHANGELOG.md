# Changelog

All notable changes to **chaosBunny** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project aims at [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Background music** — a looping arrangement of the traditional **Scarborough
  Fair** (A-Dorian, ~9.6 s): melody + low bass drone + a heavy kick drum per bar,
  built on zx-kit's new `music` helpers (note-name composing + a looping player).
  Press **`M`** to mute / unmute.
- In-game **version readout** now shows the game version too: `vX.Y.Z/<zx-kit>`.
- **CI deploy gate** — GitHub Pages deploys only on releasable commits
  (`feat` / `fix` / `perf` / breaking); docs, refactor, chore… are skipped.

### Changed
- **Cached tile rendering (perf)** — the whole tile layer now renders once to an
  offscreen canvas and blits a camera window each frame (via zx-kit's new
  `createLayerCache`), invalidated only when a platform crumbles/respawns or the
  level resets. Replaces per-frame, per-pixel `fillRect` tile drawing — the main
  remaining GPU cost. Requires a `zx-kit` build with the `cache` module.
- CI deploys from the `master` branch.

## [0.2.0] — 2026-06-01

### Added
- **Collect-to-escape goal** — gather every carrot to open the moon-lit exit,
  then reach it to win. The moon stays dim until the last carrot is collected.
- **Crumbling platforms** (`kind: 'crumble'`) that collapse a beat after you
  stand on them and respawn shortly after — tension, never cruel. Covered by
  `tests/crumble.tests.ts`.
- **Cave-darkness toggle** (`L` key) and **depth-scaled** dithered darkness
  (brightest near the moon, darkest at the floor), via zx-kit's new `lighting`
  module.
- **HUD**: HP shown as hearts; a permanent **FPS** readout (bottom-right) and the
  real running **zx-kit version** (bottom-left, read from the installed package).
- **GitHub Pages deploy** workflow (`.github/workflows/ci-deploy.yml`) and a
  project **README**.

### Changed
- Lighting now lives in **zx-kit** (`lighting` module); chaosBunny keeps only the
  depth/brightness *policy*. Darkness is **OFF by default** for now — we'll tune
  it (depth, `MAX_DARKNESS`, per-area moods) when we build **biomes**.
- HUD inset past the stone border and drawn on a black paper — readable over the
  bricks/stone, no more clipped `C` in `CARROTS`.

### Fixed
- **Audio** went silent after a hot reload: `ensureAudio` now resumes the
  `AudioContext` on every gesture (gated on the real context state, not a
  one-shot flag that survived Vite HMR while the context was suspended).

### Performance
- **Dungeon background** pre-rendered once to an offscreen canvas — one
  `drawImage` per frame instead of ~30,000 `fillRect`s. Firefox GPU dropped from
  ~120% to ~60% (4K), with a locked 60 fps.
- **Lighting** renders cached per-level dither tiles into a per-cell dirty buffer
  and blits once — no per-frame `putImageData`.

## [0.1.0] — 2026-05-31

### Added
- First playable vertical slice: a cute-rabbit cave climber on
  [zx-kit](https://www.npmjs.com/package/zx-kit) — hand-authored fixed levels,
  ladders, jump / crouch / carrot-shot, spiders & bats, pixel-perfect collisions,
  and a win/lose flow.

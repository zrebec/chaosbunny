# 1.0.0 (2026-06-11)


### Bug Fixes

* **audio:** keep music muted across audio-unlock gestures ([0cce11e](https://github.com/zrebec/chaosbunny/commit/0cce11e939eca8b397b2956fbb2e8e32d49f4736))
* **audio:** switch and mute AY music instantly via zx-kit AYHandle ([efeda80](https://github.com/zrebec/chaosbunny/commit/efeda80b8114b019f449cb72d053068c34208b12))
* guard against a negative first-frame dt (black-screen crash) ([4cc9c6b](https://github.com/zrebec/chaosbunny/commit/4cc9c6b84661112009797c0dff386c270c95c42f))
* **release:** valid GitHub repository URL in package.json ([725ffc3](https://github.com/zrebec/chaosbunny/commit/725ffc3ea62bd5dbc44a515293d93a8db274ba0f))


### Features

* **audio:** auto-shuffle background music every 2 loops ([5690468](https://github.com/zrebec/chaosbunny/commit/56904686bea4911628606a5bb15f09c5b42a4f31))
* authentic ZX attribute clash as a 4th C-cycle mode ([6f6e07e](https://github.com/zrebec/chaosbunny/commit/6f6e07ef1297d7e67f394560958aa813eede4b8e))
* C cycles the playfield look (adds a black-background mode) ([e448bb4](https://github.com/zrebec/chaosbunny/commit/e448bb43c2ea20a626be804f6969ae06607d2bcc))
* carrot shot fires at two heights (crouch shoots low) ([8818e87](https://github.com/zrebec/chaosbunny/commit/8818e87218b05cb18fbe99a5758a34931964296b))
* collect-to-escape loop, crumbling platforms, zx-kit lighting + perf ([521cf8c](https://github.com/zrebec/chaosbunny/commit/521cf8c6fe823f9f880a3dd3311e1d3011a59bdc))
* crouch-gates — crouch-only low passages ([377dfbe](https://github.com/zrebec/chaosbunny/commit/377dfbedd6128ed655279b00c8616e99fa99748a))
* first commit ([d76709c](https://github.com/zrebec/chaosbunny/commit/d76709c44ded48b66a4b08f9be4ef7fcf9ffd897))
* **mono:** route the whole playfield through zx-kit MonoScreen in clash mode ([a6f6220](https://github.com/zrebec/chaosbunny/commit/a6f622089846c136fe09a9d06f97abb64c3dcd5e))
* **music:** added background music ([2b6bf7a](https://github.com/zrebec/chaosbunny/commit/2b6bf7acf3ceb80befabe0eb0269babdbd738dab))
* redesigned levels, added ledders ([a553d89](https://github.com/zrebec/chaosbunny/commit/a553d89fe7085ce75ff281b672ef1de4cecfb542))
* refresh chaosBunny ZX sprite direction ([b14833a](https://github.com/zrebec/chaosbunny/commit/b14833ae3c6df03eeeb307cab3f2d9887b34e3cc))
* single-colour rabbit in clash mode (no self-clash) ([5ad419b](https://github.com/zrebec/chaosbunny/commit/5ad419baf941a5d981a7292063f88d2da122a762))
* smooth torch lighting (off by default) + pause; release 0.3.0 ([d3c0193](https://github.com/zrebec/chaosbunny/commit/d3c0193c2ddfe9be60e0556c95b45359fe1092a5))
* **theme:** playfield colours from config — fake biomes ([1c036c5](https://github.com/zrebec/chaosbunny/commit/1c036c5d069412c941f4a72f2cc66434ce01b3dc))


### Performance Improvements

* **render:** cache the static scanline overlay offscreen ([cab7326](https://github.com/zrebec/chaosbunny/commit/cab7326f0812b50caf70c9aa5947f27a48e342ab))
* **render:** cache the tile layer offscreen (zx-kit createLayerCache) ([a9391aa](https://github.com/zrebec/chaosbunny/commit/a9391aa2f0d2df974632a8457633f41f72227274))

## [0.3.0] — 2026-06-11

### Added

**Smooth torch lighting — complete, but OFF by default** (reviewed + extended
Codex smooth-lighting branch):

- Smooth radial darkness (offscreen canvas + destination-out gradients); only
  wall torches and the moon emit light — the rabbit and carrot shots stay dark
  (rabbit light is reserved for the planned lantern tool).
- Organic torch pulse: two incommensurate sine waves drive radius and intensity
  together (`torchPulse`); tempo via `TORCH_PULSE_SPEED`.
- Light falloff as a pure curve (`lightFalloff`) with optional posterised rings
  (`TORCH_LIGHT_BANDS`) — the modern-vs-retro dial.
- Moon glow restored as the goal signal (dim until all carrots collected, full
  once the exit opens).
- Backdrop feel: worn-brick grit (`BG_GRIT`) + brick/deco inks, parallax and
  deco density extracted to config (`BG_*`).

> **NOTE:** the final cave look is an open question (smooth vs banded vs
> BRIGHT-bit — see `docs/new_feel.md`). Lighting ships complete but OFF by
> default (`LIGHTING_MODE = 'none'`); the `L` key turns it on in-game anytime.

**Pause + controls overlay:**

- `B` (or `P` / gamepad Start) freezes the whole game: music stops (resume
  respects the `M` mute), all updates skip, and the new `gameTime` clock halts
  torch pulse, moon breathing and particles mid-flicker.
- Blinking PAUSED + full key help (`PAUSE_HELP`) over the frozen scene; other
  toggles (`L`/`M`/`N`/`C`) are locked while paused.

**Shipped since 0.2.0 without a changelog entry (catch-up):**

- **Background music** — a looping arrangement of the traditional **Scarborough
  Fair** (A-Dorian, ~9.6 s) plus two original cave loops (*Crystal Drip*, *Deep
  Burrow*), built on zx-kit's `music` helpers. **`M`** mutes instantly and
  *stays* muted; **`N`** skips tracks; a seeded shuffle-bag auto-rotates after
  `MUSIC_LOOPS_PER_TRACK` loops.
- **Crouch as a real verb** — shorter crouch box, crawl-only crouch-gates, no
  standing under low ceilings, no jump from a crouch; fairness enforced by the
  reachability linter (see `docs/crouch-gates.md`).
- **Carrot shot at two heights** (`muzzle()`) — standing high, crouching low.
- **`C` cycles four playfield looks** — bricks → black → monochrome → authentic
  ZX attribute clash; the clash rabbit is a single ink so it never self-clashes.
- In-game **version readout** shows the game version too: `vX.Y.Z/<zx-kit>`.
- **CI deploy gate** — GitHub Pages deploys only on releasable commits
  (`feat` / `fix` / `perf` / breaking); docs, refactor, chore… are skipped.

### Changed

- **Cached offscreen rendering (perf)** — the tile layer and the static CRT
  scanline overlay each render once to an offscreen canvas and blit per frame
  (zx-kit `createLayerCache`); the tile cache is invalidated only when a
  platform crumbles/respawns or the level resets.
- **Dead procedural generator removed** — fixed hand-authored levels won;
  `world/clash.ts` renamed to `world/playfield.ts`.
- `index.html`: canvas scales to the monitor (drops the 1024px cap).
- zx-kit `^0.32.0`; torch pulse + light falloff covered by tests.
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

---

*Entries up to **0.3.0** were written by hand in the
[Keep a Changelog](https://keepachangelog.com/) style. From the next release on,
entries are generated automatically by
[semantic-release](https://github.com/semantic-release/semantic-release) from
Conventional Commits (`feat` → minor, `fix`/`perf` → patch; `chore`, `refactor`,
`docs`, `style`, `test`, `ci` → no release) and prepended above — newest first,
no title line (semantic-release owns the top of this file).*

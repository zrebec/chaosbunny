# zx-kit Stabilization, Documentation, and Reference Game Roadmap

**Audience:** Claude Code, Codex/AGENTS.md-compatible coding agents, and Martin/Fox as project owner.  
**Primary repositories:** `zrebec/zx-kit`, `zrebec/icehaul`, `zrebec/chaosbunny`, `zrebec/minefield`, `zrebec/Nautilus2K`, `zrebec/frogger`.

This document converts the product/code review discussion into a practical technical roadmap. It is not a raw transcript. It is intended to guide future coding-agent sessions when working on `zx-kit` or the reference games.

The current strategic preference is:

1. Stabilize and clean up `zx-kit` before adding more unrelated features.
2. Keep **IceHaul** and **ChaosBunny** actively using the latest `zx-kit`.
3. Use **IceHaul** as the traditional/disciplined Spectrum-style flagship.
4. Use **ChaosBunny** as the emotional/modern-Spectrum flagship.
5. Treat future game ideas as documented backlog, not immediate implementation work.

---

## 0. Executive Summary

`zx-kit` should be positioned as:

> **Spectrum-flavoured TypeScript primitives for modern browser games.**  
> Build ZX Spectrum-looking browser games in TypeScript. No emulator. No Z80 required. No runtime dependencies.

It should **not** be positioned as:

- a general-purpose game engine;
- a Phaser replacement;
- a fantasy console;
- a real ZX Spectrum toolchain;
- a ZX Spectrum emulator;
- a WebGL-first engine.

The strongest value proposition is:

> Use the ZX Spectrum visual and sonic language as an aesthetic constraint, while allowing modern browser-game conveniences: TypeScript, Canvas, Web Audio, save slots, deterministic RNG, gamepad support, tile scrolling, pixel-perfect collision, and modern deployment.

The project is technically promising already. The next step is to make it **trustworthy, understandable, easy to start with, and backed by polished reference games**.

---

## 1. Prioritized Roadmap

### Priority 0 — Do Not Break Existing Games Blindly

Before renaming, deprecating, or removing public APIs:

1. Search all reference games for usage:
   - `icehaul`
   - `chaosbunny`
   - `minefield`
   - `Nautilus2K`
   - `frogger`
2. Add compatibility wrappers where practical.
3. Mark old APIs as `@deprecated` first.
4. Update the reference games in separate commits.
5. Only remove old APIs after the migration has landed and the compatibility window is over.

A library becomes trustworthy not because it never changes, but because changes are discoverable, documented, and migratable.

### Priority 1 — Stabilize zx-kit Public Surface

Focus on:

- consistent naming;
- API status markers;
- deprecation policy;
- core/extras classification;
- README simplification;
- CHANGELOG cleanup;
- examples gallery;
- documentation split.

This should happen before WebGL, before a full editor, and before major new APIs.

### Priority 2 — Make zx-kit Easy to Adopt

Build:

- screenshot/hero showcase;
- public examples gallery;
- `create-zx-kit` starter package;
- cookbook pages;
- custom bitmap font support.

### Priority 3 — Polish Reference Games

Reference games must use the current `zx-kit` version and demonstrate distinct parts of the toolkit:

- **Minefield**: stable documentation/demo reference.
- **IceHaul**: flagship originality and traditional Spectrum-style micro-sim.
- **ChaosBunny**: emotional modern-Spectrum flagship.
- **Nautilus2K**: high-potential simulation reference after it gets a win/lose loop.
- **Frogger**: archive or de-emphasize unless redesigned into something original.

### Priority 4 — Future Experiments

Keep as future backlog:

- sprite/font studio;
- authentic/modern diagnostics;
- `@zx-kit/webgl` experimental backend;
- new reference game ideas such as **Ink & Paper Heist** and **Spectrum Terrarium**.

---

## 2. Stabilization Cycle

The stabilization cycle should be understood as **1-3 focused releases where the goal is to make the API understandable and dependable**, not to freeze creativity forever.

Suggested release flow:

```txt
0.28.x  cleanup + naming + API status + changelog cleanup
0.29.x  docs split + examples gallery + README hero/screenshots
0.30.x  create-zx-kit starter + template projects
0.31.x  custom bitmap fonts + renderer profile planning
```

Do not rush to `1.0` until public API categories and migration rules are clear.

---

## 3. Library Identity

### 3.1 Primary Identity

Use this consistently in README, docs, GitHub description, npm description, landing page, and social posts:

```txt
zx-kit is a zero-dependency TypeScript toolkit for building ZX Spectrum-looking browser games.
It provides Spectrum-style rendering, palette, font, audio, input, tilemap, collision, save/load, and game helpers without emulating the original machine.
```

### 3.2 Short Hero Pitch

```txt
Build ZX Spectrum-looking browser games in TypeScript.
No emulator. No Z80 required. No runtime dependencies.
```

### 3.3 Longer Hero Pitch

```txt
zx-kit lets you build browser games that look and sound like the ZX Spectrum, but run like modern TypeScript games. Use the Spectrum palette, ROM-style text, AY/beeper audio, tilemaps, sprites, collisions, save slots, gamepad input, and modern helper APIs without writing Z80 or emulating the original hardware.
```

### 3.4 What zx-kit Is Not

Document explicitly:

```md
## What zx-kit is not

- It is not a ZX Spectrum emulator.
- It is not a Z80 development toolchain.
- It is not a fantasy console.
- It is not a Phaser replacement.
- It is not intended to become a large all-purpose engine.
```

This prevents wrong expectations.

---

## 4. Public API Classification

Introduce API status in docs and JSDoc.

### 4.1 Status Levels

```ts
/**
 * Stable API.
 * Safe to use in games. Breaking changes only in major releases after v1.0.
 */
export function drawBitmap(...) {}

/**
 * @experimental
 * This API is useful and public, but its name, options, or behavior may change before v1.0.
 */
export function createDitherLightMap(...) {}

/**
 * @internal
 * Internal implementation detail. Do not export from package root.
 */
function packCellAttributes(...) {}
```

### 4.2 Recommended Module Categories

#### Core

These should become the stable identity of zx-kit:

```txt
palette
font
renderer
bitmap
audio
ay
input
tilemap
collision
```

#### Game Helpers

Useful and likely stable, but not the conceptual center:

```txt
sprite
animation
camera
scene
save
rng
i18n
```

#### Extras / Experimental

Powerful, but should be marked experimental until the design is validated by reference games:

```txt
particles
lighting
music helpers
instrumentation widgets
crt effects
tilescroll advanced helpers
```

### 4.3 Documentation Table

Add to docs:

```md
## API Stability

| Module | Status | Notes |
|---|---|---|
| palette | Stable | Spectrum color constants and types |
| font | Stable | ROM font rendering and helpers |
| renderer | Stable | Canvas renderer and bitmap drawing |
| audio | Stable | Beeper/audio context helpers |
| ay | Stable | AY-3-8912 style synthesis |
| input | Stable | Keyboard and gamepad helpers |
| tilemap | Stable | Tile map primitives |
| collision | Stable | AABB, tile, bitmap/pixel collision |
| save | Stable | Typed localStorage save/load |
| rng | Stable | Deterministic seeded RNG |
| particles | Experimental | Pixel effects API may evolve |
| lighting | Experimental | Renderer profile compatibility pending |
| instruments | Experimental | Cockpit/simulation widgets may be renamed |
| scene | Experimental | Game structure helper; validate in games |
```

---

## 5. Naming Cleanup

Naming should be consistent and boring. Boring names are good API names.

### 5.1 Fix Typos and Ambiguous Names

Known cleanup targets:

```txt
raw writter  -> raw writer
lightning    -> lighting, if it means light/darkness
lighting     -> keep for illumination/darkness
lightning    -> reserve only for lightning bolts/storm flashes
```

### 5.2 Renderer Vocabulary

Decide and document:

```txt
Sprite:
  Legacy/simple 8x8 bitmap-style object or game entity visual.

Bitmap:
  Arbitrary-size pixel mask/image used by renderer and collision.

AttrMap:
  Per-cell ink/paper attributes for Spectrum-style color clash behavior.

Ink:
  Foreground/solid pixel color.

Paper:
  Background cell color.

Ink-only:
  Rendering mode where only solid pixels are drawn and paper/background is preserved.
```

### 5.3 Audio Vocabulary

Avoid confusing terms:

```txt
audio:
  general audio context, beeper, master volume, resume/init helpers

ay:
  AY-3-8912 / Melodik-style square channels, noise, envelopes

music:
  convenience sequencing/pattern APIs, optional higher-level helpers
```

### 5.4 UI Vocabulary

Consider split:

```txt
ui:
  boxes, frames, panels, progress bars, text UI

instruments:
  dial, tank, compass, segmented bar, cockpit/simulation widgets
```

If `instruments` is introduced, keep old `ui` exports as deprecated aliases for at least two minor releases.

---

## 6. Deprecation Policy

### 6.1 Simple Policy Before v1.0

```md
## Deprecation Policy

Before v1.0, zx-kit may still change public APIs. However:

- Renamed APIs will remain available as deprecated aliases for at least two minor releases when practical.
- Deprecated APIs will be marked with `@deprecated` JSDoc.
- The CHANGELOG will include migration notes for renamed or removed APIs.
- Reference games will be migrated before deprecated APIs are removed.
```

### 6.2 Policy After v1.0

```md
After v1.0:

- Breaking changes only happen in major versions.
- Deprecated APIs remain available for at least one minor release cycle.
- Every breaking change must include a migration section.
```

### 6.3 Deprecation Wrapper Example

```ts
/**
 * Draws an 8x8 sprite.
 *
 * @deprecated Use drawBitmap() for new code. This helper will remain available until v1.0.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: Uint8Array,
  x: number,
  y: number,
  ink: SpectrumColor,
  paper?: SpectrumColor,
): void {
  const bitmap = createBitmap(8, 8, rows)
  drawBitmap(ctx, bitmap, x, y, ink, paper)
}
```

### 6.4 Why Compatibility Matters

Existing games may import old names directly:

```ts
import { drawSprite, drawText, setupCanvas } from 'zx-kit'
```

If an exported function is renamed and the old export disappears:

- TypeScript build fails immediately.
- Vite dev server fails.
- GitHub Pages build may fail.
- Old deployed games may still work only if bundled with older dist, but future builds break.
- Users lose trust because a minor update becomes destructive.

Therefore:

1. Add new API.
2. Keep old API as alias.
3. Mark old API deprecated.
4. Update all reference games.
5. Release notes explain migration.
6. Remove only later, preferably at v1.0 or major version.

---

## 7. Impact on Existing Reference Games

Before each API cleanup, run this checklist in every reference game.

### 7.1 Repositories to Check

```txt
../zx-kit
../icehaul
../chaosbunny
../minefield
../Nautilus2K
../frogger
```

### 7.2 Basic Commands

In each game repository:

```bash
npm install
npm run build
npm test
```

If no tests exist:

```bash
npm run build
npm run dev
```

Then manually open the game.

### 7.3 Migration Checklist

For each renamed/deprecated API:

```bash
grep -R "oldFunctionName" src examples docs -n
grep -R "from 'zx-kit'" src -n
grep -R "from \"zx-kit\"" src -n
```

Then update imports and usage.

### 7.4 Game-Specific Risk

#### IceHaul

Risk areas:

- input handling;
- instrumentation widgets;
- RNG/procedural road;
- renderer/tilemap;
- audio;
- save/progress if added.

Because IceHaul should represent the traditional disciplined side of zx-kit, avoid too many modern effects. Prefer deterministic systems, clear UI, and Spectrum-flavoured constraints.

#### ChaosBunny

Risk areas:

- renderer;
- collision;
- lighting/darkness;
- animation;
- particles;
- tilemap/camera;
- platforming physics.

ChaosBunny is allowed to use modern style features. It can intentionally demonstrate `modern` renderer profile later.

#### Minefield

Risk areas:

- renderer;
- font/text;
- input;
- board logic;
- tile rendering.

Minefield should remain stable and simple. It is the best documentation reference, so keep it updated and buildable.

#### Nautilus2K

Risk areas:

- instruments;
- text UI;
- audio/sonar;
- scene state;
- input.

It should be migrated later after its win/lose loop is clarified.

#### Frogger

Risk areas:

- scene/input/collision.

Not a priority unless it is revived or reimagined.

---

## 8. Documentation Architecture

### 8.1 Current Problem

README is strong but overloaded. It currently acts as:

- landing page;
- pitch;
- tutorial;
- API guide;
- examples list;
- module overview;
- audio explanation.

This is too much for first-time visitors.

### 8.2 Target Structure

```txt
README.md
docs/
  index.md
  api-stability.md
  tutorials/
    first-game.md
    top-down-movement.md
    platformer-basics.md
    ay-music.md
  api/
    renderer.md
    bitmap.md
    palette.md
    font.md
    audio.md
    ay.md
    input.md
    tilemap.md
    collision.md
    save.md
    rng.md
    particles.md
    lighting.md
  cookbook/
    title-screen.md
    loading-screen.md
    pause-menu.md
    save-slots.md
    pixel-collision.md
    color-clash.md
    custom-font.md
    tilemap-camera.md
    gamepad-input.md
  assets/
    screenshots/
      minefield.webp
      icehaul.webp
      chaosbunny.webp
      nautilus2k.webp
    hero/
      zx-kit-showcase.webp
examples/
  index.html
  ay-music/
  pixel-collision/
  particles/
  i18n-runtime/
  bitmap-attrs/
  save-slots/
  lighting/
```

### 8.3 README Should Contain

```md
# zx-kit

> Build ZX Spectrum-looking browser games in TypeScript.
> No emulator. No Z80 required. No runtime dependencies.

[hero screenshot/GIF/WebP]

## Install

npm install zx-kit

## Quick Start

30-40 lines maximum.

## Why zx-kit?

Short explanation.

## Features

Only the top features, grouped.

## Live Demos

Cards or table.

## Documentation

- First game tutorial
- API reference
- Cookbook
- Examples gallery

## What zx-kit is not

Clarify boundaries.

## License
```

Move the long tutorial out of README into `docs/tutorials/first-game.md`.

---

## 9. Screenshot / Showcase Strategy

### 9.1 README Cannot Have Real JS Carousel

GitHub Markdown does not allow custom JavaScript in README. Use one of these:

1. Static screenshot grid/table.
2. HTML image row.
3. Animated WebP/GIF showcase.

### 9.2 Recommended Repo Layout

```txt
docs/assets/screenshots/
  minefield.webp
  icehaul.webp
  chaosbunny.webp
  nautilus2k.webp

docs/assets/hero/
  zx-kit-showcase.webp
```

Use optimized WebP images. Keep them small enough for README.

### 9.3 Static Screenshot Row

```md
<p align="center">
  <a href="https://zrebec.github.io/minefield/">
    <img src="docs/assets/screenshots/minefield.webp" width="260" alt="Minefield screenshot">
  </a>
  <a href="https://zrebec.github.io/icehaul/">
    <img src="docs/assets/screenshots/icehaul.webp" width="260" alt="IceHaul screenshot">
  </a>
  <a href="https://zrebec.github.io/chaosbunny/">
    <img src="docs/assets/screenshots/chaosbunny.webp" width="260" alt="ChaosBunny screenshot">
  </a>
</p>
```

### 9.4 Animated Showcase

Best hero asset:

```md
<p align="center">
  <img src="docs/assets/hero/zx-kit-showcase.webp" alt="zx-kit game showcase" width="720">
</p>
```

Suggested sequence:

```txt
0-2s   Minefield
2-4s   IceHaul
4-6s   ChaosBunny
6-8s   Nautilus2K
8-10s  examples gallery / particles / AY
```

### 9.5 Where to Host Images

Preferred:

1. Inside repo under `docs/assets/`.
2. On GitHub Pages if a separate landing page exists.
3. Release assets only for versioned downloads.
4. Avoid relying on random GitHub issue/comment upload URLs as primary assets.

---

## 10. Public Examples Gallery

### 10.1 Meaning of "Gallery"

The examples already exist as static pages. A "gallery" means a single public index page that presents them visually.

Add:

```txt
examples/index.html
```

It should show cards:

```txt
[AY Music]             Play | Source | Shows audio channels and beeper
[Pixel Collision]      Play | Source | Shows AABB vs pixel masks
[Particles]            Play | Source | Shows allocation-free pixel effects
[Bitmap Attributes]    Play | Source | Shows AttrMap, mirroring, inkOnly, color clash
[Save Slots]           Play | Source | Shows typed save/load, slots, throttling
[Lighting]             Play | Source | Shows dithered cave darkness
```

### 10.2 Card Data Model

Use a simple JS/TS array:

```ts
const examples = [
  {
    id: 'ay-music',
    title: 'AY Music',
    description: 'Three AY channels plus beeper SFX.',
    path: './ay-music/',
    source: 'https://github.com/zrebec/zx-kit/tree/main/examples/ay-music',
    screenshot: '../docs/assets/screenshots/examples-ay-music.webp',
  },
]
```

### 10.3 Gallery Requirements

- Static HTML/CSS/JS.
- No framework required.
- Keyboard accessible.
- Works from GitHub Pages.
- Does not depend on local build tooling after `dist` exists.
- Each card should say what API it demonstrates.

---

## 11. CHANGELOG Cleanup

### 11.1 Goal

`CHANGELOG.md` should be useful for users, not just a dump of release automation. It should explain meaningful changes, migration notes, deprecations, and user-facing fixes.

### 11.2 Use Conventional Commits

Commit message style:

```txt
feat(renderer): add ink-only bitmap rendering
fix(renderer): avoid stale border flash timer
docs(readme): add getting started tutorial
test(collision): cover pixel mask overlap edge cases
refactor(audio): split beeper and AY helpers
chore(release): keep changelog and package lock in sync
```

### 11.3 What Should Not Dominate CHANGELOG

Avoid noisy standalone entries such as:

```txt
test automatic release after sync
test token
automated versioning fixed for npm
enable trusted publishing OIDC
keep package lock and changelog in sync
```

These can be grouped under:

```md
### Maintenance

- Stabilized npm publishing pipeline and release automation.
```

### 11.4 Recommended CHANGELOG Format

Use a curated Keep-a-Changelog-like structure:

```md
# Changelog

All notable user-facing changes to `zx-kit` are documented here.

This project uses Conventional Commits. The public API is still pre-1.0, so breaking changes are possible, but they must be documented with migration notes.

## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Migration Notes

## [0.27.0] — 2026-06-01

### Added

- Added documentation notes for low-level AY raw writer usage.

### Notes

- No renderer, input, tilemap, collision, or save API changes.

## [0.26.0] — 2026-06-01

### Added

- Added Spectrum-style lighting/darkness support for atmospheric scenes.

### Notes

- Lighting is considered experimental until renderer profiles are finalized.

## [0.25.0] — 2026-05-31

### Added

- Added `inkOnly` support to `drawBitmap()` and `drawBitmapAttrs()`.

## [0.24.0] — 2026-05-29

### Added

- Added allocation-free particle pools for sparks, smoke, puffs, and explosions.
- Added seeded deterministic RNG based on `mulberry32`.
- Added pixel-smooth tile-map scrolling.

### Fixed

- Improved particle examples with separate pools and keyboard controls.

## [0.23.0] — 2026-05-28

### Added

- Added `createBitmapFromRows(rows)` for readable pixel-art definitions.

## [0.22.0] — 2026-05-27

### Added

- Added pixel-precise collision helpers:
  - `bitmapPixelMask()`
  - `masksOverlap()`
  - `pixelSolidCount()`
```

### 11.5 How to Release Changelog Rewrite Without New Version

The user specifically wants this as a docs-only change that does not trigger a new semantic-release version.

Use a commit like:

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): rewrite changelog for readability"
git push
```

If semantic-release is configured with standard rules, `docs(...)` should not create a new npm release. Confirm release rules before pushing.

If the pipeline still triggers on every push but does not publish for docs commits, this is fine. If it publishes unexpectedly, adjust `.releaserc` / semantic-release config.

Suggested agent instruction:

```txt
When rewriting CHANGELOG.md, use only a docs(changelog) commit. Do not modify package.json, package-lock.json, dist files, or public API. This change should not create a new zx-kit version.
```

### 11.6 Agent Task: Changelog Rewrite

1. Open current `CHANGELOG.md`.
2. Preserve version numbers and dates.
3. Rewrite noisy entries into user-facing language.
4. Fix typos:
   - `writter` -> `writer`
   - `lightning` -> `lighting` if the feature is actually lighting/darkness
5. Add an `[Unreleased]` section.
6. Add a short note explaining pre-1.0 API stability.
7. Do not alter `package.json`.
8. Commit as:

```bash
git commit -m "docs(changelog): rewrite changelog for readability"
```

---

## 12. create-zx-kit Starter

### 12.1 Purpose

Make it possible to start a zx-kit game with:

```bash
npm create zx-kit@latest my-game
```

or:

```bash
npx create-zx-kit my-game --template tilemap
```

### 12.2 Package Name

Create a separate package:

```txt
create-zx-kit
```

Npm maps `npm create zx-kit` to `create-zx-kit`.

### 12.3 Directory Structure

```txt
create-zx-kit/
  package.json
  bin/
    create-zx-kit.js
  templates/
    minimal/
      package.json
      index.html
      src/
        main.ts
        style.css
    tilemap/
      package.json
      index.html
      src/
        main.ts
        map.ts
        style.css
    platformer/
      package.json
      index.html
      src/
        main.ts
        player.ts
        level.ts
        style.css
    ay-music/
      package.json
      index.html
      src/
        main.ts
        style.css
```

### 12.4 Starter Package package.json

```json
{
  "name": "create-zx-kit",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "create-zx-kit": "./bin/create-zx-kit.js"
  },
  "files": [
    "bin",
    "templates"
  ],
  "license": "MIT"
}
```

### 12.5 Minimal CLI Script

```js
#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const targetName = process.argv[2] ?? 'my-zx-game'
const templateName = process.argv.includes('--template')
  ? process.argv[process.argv.indexOf('--template') + 1]
  : 'minimal'

const root = process.cwd()
const targetDir = path.join(root, targetName)
const templateDir = path.join(__dirname, '..', 'templates', templateName)

if (!fs.existsSync(templateDir)) {
  console.error(`Unknown template: ${templateName}`)
  process.exit(1)
}

if (fs.existsSync(targetDir)) {
  console.error(`Target directory already exists: ${targetName}`)
  process.exit(1)
}

copyDir(templateDir, targetDir)

const pkgPath = path.join(targetDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.name = toPackageName(targetName)
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`Created ${targetName}`)
console.log('')
console.log('Next steps:')
console.log(`  cd ${targetName}`)
console.log('  npm install')
console.log('  npm run dev')

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)

    if (entry.isDirectory()) {
      copyDir(src, dest)
    } else {
      fs.copyFileSync(src, dest)
    }
  }
}

function toPackageName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-zx-game'
}
```

### 12.6 Template Requirements

Every template must:

- use Vite + TypeScript;
- import from `zx-kit`;
- have no path alias to local zx-kit;
- include `npm run dev`;
- include `npm run build`;
- use a full-screen centered canvas;
- contain short comments;
- be small enough for beginners.

Example template `package.json`:

```json
{
  "name": "my-zx-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "zx-kit": "^0.27.0"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vite": "^6.0.0"
  }
}
```

---

## 13. Sprite and Font Studio

### 13.1 Purpose

Create a separate web tool, not runtime zx-kit code.

Possible names:

```txt
zx-kit-sprite-studio
zx-kit-tools
tools/sprite-studio
```

### 13.2 Scope

This tool helps users draw and export Spectrum-style assets.

It should be a static Vite + TypeScript web app.

### 13.3 Features

Minimum useful version:

- 8x8, 16x16, 24x24, 32x32 canvas grid;
- ZX palette;
- left click draw, right click erase;
- mirror X/Y;
- shift up/down/left/right;
- invert;
- preview at 4x/8x scale;
- export to `createBitmapFromRows`;
- export to `Uint8Array`;
- export PNG/WebP preview;
- localStorage autosave.

Later:

- font editor mode;
- sprite sheet import;
- palette validation;
- AttrMap export;
- loading screen converter;
- ordered dithering preview.

### 13.4 Export Example

```ts
import { createBitmapFromRows } from 'zx-kit'

export const RABBIT_IDLE = createBitmapFromRows([
  '....XX....',
  '...XXXX...',
  '..X.XX.X..',
  '..XXXXXX..',
  '...XXXX...',
  '..X.XX.X..',
  '.X..XX..X.',
  '..........',
])
```

### 13.5 Why This Should Not Be in Core zx-kit

`zx-kit` should stay a runtime library. The editor is a tool. It may use zx-kit, but zx-kit should not depend on it.

---

## 14. Custom Bitmap Fonts

### 14.1 Why Add This

The ROM font is authentic, but many old games used custom fonts. Current reference games can look too similar because all text uses the same ROM-style font.

Custom fonts are more important than WebGL right now because they improve game identity immediately.

### 14.2 Proposed API

```ts
export type BitmapFont = {
  charW: number
  charH: number
  glyphs: Record<string, Bitmap>
  fallback?: Bitmap
}
```

```ts
export function createBitmapFont(options: {
  charW: number
  charH: number
  glyphs: Record<string, Bitmap | string[]>
  fallback?: Bitmap | string[]
}): BitmapFont
```

```ts
export function drawTextWithFont(
  ctx: CanvasRenderingContext2D,
  font: BitmapFont,
  text: string,
  x: number,
  y: number,
  ink: SpectrumColor,
  paper?: SpectrumColor,
): void
```

```ts
export function measureTextWithFont(
  font: BitmapFont,
  text: string,
): { width: number; height: number }
```

### 14.3 Usage Example

```ts
const TITLE_FONT = createBitmapFont({
  charW: 8,
  charH: 8,
  glyphs: {
    A: [
      '..XX....',
      '.XXXX...',
      'XX..XX..',
      'XXXXXX..',
      'XX..XX..',
      'XX..XX..',
      '........',
      '........',
    ],
  },
})

drawTextWithFont(ctx, TITLE_FONT, 'CHAOS BUNNY', 16, 24, C.B_WHITE, C.BLACK)
```

### 14.4 Migration Impact

No breaking change required. Add this as new API.

Existing `drawText()` remains the ROM font function.

Potential naming:

```txt
drawText()           -> existing ROM font
drawTextWithFont()   -> custom bitmap font
createBitmapFont()   -> font object
```

Avoid renaming `drawText()` for now.

---

## 15. Authentic vs Modern Renderer Profiles

### 15.1 Goal

Allow games to explicitly choose their visual philosophy.

```txt
authentic:
  closer to Spectrum-style constraints

modern:
  Spectrum-inspired, but allowed to use modern conveniences/effects
```

### 15.2 Proposed API

```ts
type SpectrumProfile = 'authentic' | 'modern'
type DiagnosticLevel = 'off' | 'warn' | 'throw'

type RendererOptions = {
  profile?: SpectrumProfile
  diagnostics?: DiagnosticLevel
}
```

```ts
const ctx = setupCanvas(canvas, 4, {
  profile: 'authentic',
  diagnostics: 'warn',
})
```

or future renderer object:

```ts
const renderer = createRenderer(canvas, {
  scale: 4,
  profile: 'modern',
  diagnostics: 'warn',
})
```

### 15.3 Diagnostics Behavior

Do not block by default. Warn once per issue type.

```txt
[zx-kit/authentic] Smooth alpha lighting is a modern effect. Use dithered lighting or profile: "modern".
```

### 15.4 Authentic Diagnostics

Warn or throw when:

- color is not from the Spectrum palette;
- canvas scale is not an integer;
- image smoothing is enabled;
- subpixel rendering is used;
- smooth alpha lighting is used;
- gradients/blurs are used;
- more than two colors appear in an 8x8 attribute cell;
- WebGL shader effects are used;
- particle effects use too many colors or alpha fading.

### 15.5 Modern Profile

Modern profile allows:

- smooth lighting;
- particles;
- subpixel camera;
- modern UI transitions;
- larger sprites;
- richer movement;
- mouse/gamepad-heavy controls.

### 15.6 Mapping to Reference Games

```txt
IceHaul:
  profile: authentic or authentic-ish
  traditional disciplined Spectrum micro-sim

ChaosBunny:
  profile: modern
  atmospheric effects, smooth/dithered darkness, particles, richer movement

Minefield:
  profile: authentic
  stable simple reference

Nautilus2K:
  profile: authentic-modern hybrid
  instruments can be modern but visual language should remain Spectrum-like
```

---

## 16. WebGL Support

### 16.1 Decision

Do not add WebGL to core now.

### 16.2 Why Not Core

WebGL would:

- double the renderer backend surface;
- require texture atlases, batching, context-loss handling, and shader decisions;
- increase test complexity;
- blur the project identity;
- distract from documentation and reference-game polish;
- provide limited immediate value for 256x192 Spectrum-style Canvas games.

### 16.3 Possible Future Shape

If explored later, make it separate:

```txt
@zx-kit/webgl
```

or:

```txt
packages/
  zx-kit/
  zx-kit-webgl/
```

Example:

```ts
import { createWebGLRenderer } from '@zx-kit/webgl'

const renderer = createWebGLRenderer(canvas, {
  virtualWidth: 256,
  virtualHeight: 192,
  palette: C,
  profile: 'modern',
})
```

### 16.4 Rule

Canvas 2D remains the primary backend until zx-kit core is stable and documented.

---

## 17. Loading Screens and Graphics Workflow

### 17.1 Problem

The project owner is a programmer, not a trained pixel artist. This should not block good presentation.

### 17.2 Recommended Workflow

For each game:

1. Describe a strong poster-like composition in words.
2. Generate or sketch a high-resolution concept image.
3. Crop to 4:3.
4. Resize to 256x192.
5. Convert to ZX palette.
6. Apply dithering.
7. Manually clean up important pixels.
8. Add title text with a custom bitmap font.
9. Export:
   - PNG/WebP for README/landing page;
   - optional bitmap/tile data for in-game loading screen.

### 17.3 ImageMagick Prototype

```bash
magick input.png \
  -resize 256x192^ \
  -gravity center \
  -extent 256x192 \
  -dither FloydSteinberg \
  output-zx.png
```

This is only a start. A dedicated ZX palette converter would be better.

### 17.4 Future Tool

Add to Sprite Studio later:

```txt
Image Import / Loading Screen Converter

- upload image
- crop 4:3
- resize 256x192
- convert to Spectrum palette
- choose dithering mode
- preview
- export PNG/WebP
- export source data if needed
```

### 17.5 Cookbook Page

Create:

```txt
docs/cookbook/loading-screen.md
```

It should explain:

- how to design a title/loading screen;
- how to convert to Spectrum palette;
- how to add title text;
- how to display the image in zx-kit;
- how to reuse it in README screenshot row.

---

## 18. Reference Game Strategy

Reference games are not just side projects. They prove that the toolkit works.

### 18.1 Ranking

```txt
1. IceHaul       -> flagship originality / traditional micro-sim
2. Minefield     -> stable documentation reference
3. ChaosBunny    -> emotional modern-Spectrum flagship
4. Nautilus2K    -> future simulation reference after loop is complete
5. Frogger       -> archive/de-emphasize unless redesigned
```

### 18.2 General Rule

Every reference game should answer:

```txt
Which part of zx-kit does this game prove?
```

If a game does not prove anything unique, it should not be promoted.

---

## 19. IceHaul Roadmap

### 19.1 Role

IceHaul should be the flagship "traditional" zx-kit reference.

Pitch:

```txt
A ZX Spectrum-flavoured ice-road trucking micro-sim.
Manage traction, gears, fuel, damage, road hazards, and frozen surfaces in a compact procedural run.
```

### 19.2 Why It Matters

IceHaul shows that zx-kit is not just nostalgia or clones. It can support a modern procedural micro-simulation while remaining visually disciplined.

### 19.3 Priority Features

#### P1 — Update to Latest zx-kit

- Update dependency to latest zx-kit.
- Fix API migrations.
- Build and manually test.
- Confirm GitHub Pages deployment still works.

#### P1 — Manual Gearbox and Slow Acceleration

This is a high-impact gameplay feature.

Controls:

```txt
Up/W       throttle
Down/S     brake
Left/A     steer left
Right/D    steer right
Q          gear down
E          gear up
Space      handbrake
```

State:

```ts
type Gear = 0 | 1 | 2 | 3 | 4 | 5

type Truck = {
  speed: number
  rpm: number
  gear: Gear
  throttle: number
  traction: number
  engineDamage: number
}
```

Rules:

```txt
Gear 1:
  high torque, low top speed, useful for snow and careful starts

Gear 2-3:
  normal driving

Gear 4-5:
  higher top speed, weak acceleration, dangerous on bad surfaces

Too high gear at low speed:
  engine bogs down, low acceleration

Too low gear at high speed:
  high RPM, possible engine stress

Hard throttle on ice:
  wheel slip, traction loss

Hard braking on ice:
  slide risk

Cracked ice:
  aggressive acceleration/braking increases break risk
```

UI:

```txt
GEAR: 2
RPM:  █████░░░
TRAC: ████░░░
DMG:  12%
```

This can use instrumentation widgets.

#### P2 — Surface Personality

Each surface should feel different:

```txt
Clear ice:
  low grip, high slide

Packed snow:
  more grip, slower speed

Slush:
  unstable, random drag

Cracked ice:
  risk zone, avoid sudden force

Asphalt/shore:
  safe but rare
```

#### P2 — Short Run Loop

IceHaul should be playable in 3-6 minute runs.

Win:

```txt
Deliver cargo to the end station.
```

Lose:

```txt
Truck destroyed, fuel empty, cargo lost, fell through ice.
```

#### P3 — Presentation

- Title/loading screen.
- Screenshot for README carousel.
- Short gameplay GIF.
- Add "Built with zx-kit" badge/link.

### 19.4 Avoid

Do not turn IceHaul into ETS2. Keep it compact.

Avoid:

- complex economy;
- huge career mode;
- too many vehicle upgrades;
- realistic physics beyond what improves gameplay.

---

## 20. ChaosBunny Roadmap

### 20.1 Role

ChaosBunny should be the emotional, modern-Spectrum reference game.

Pitch:

```txt
A vertical cave climber where a tiny rabbit follows the scent of carrots through darkness.
Master rhythm hops, open your ears to glide, and spend carrots to recover from falls.
```

### 20.2 Why It Matters

ChaosBunny is personal and distinctive. It should represent the owner’s love for rabbits and show the modern side of zx-kit: atmosphere, darkness, particles, smoother feel, richer movement, and emotional presentation.

### 20.3 Current Identity Problem

It began as "something with a rabbit", then became a platformer, then a vertical climber similar to Jump King. However, without charge jump or strong fall punishment, it lacks a central tension mechanic.

### 20.4 Recommended Core Mechanics

#### P1 — Bunny Rhythm Jump

Short press:

```txt
small hop
```

Hold:

```txt
higher hop
```

Perfect timing after landing:

```txt
bonus jump strength / better control
```

Bad timing:

```txt
normal weak jump
```

This makes the rabbit feel alive without copying Jump King directly.

#### P1 — Ears Glide

Hold a key while falling:

```txt
ears open
fall speed reduced
horizontal control increased
wind affects rabbit more
```

Visual requirement:

- rabbit sprite must clearly show ears open/closed;
- falling should look cute and readable.

#### P2 — Carrots as Courage / Recovery

Carrots should not be only score.

Options:

```txt
Carrot = checkpoint energy
Carrot = temporary light
Carrot = panic recovery after fall
Carrot = unlock gate
```

Recommended:

```txt
If the rabbit falls far, spend one carrot to respawn at the last safe ledge.
Without carrots, the rabbit falls normally and must climb again.
```

#### P2 — Scent Trails in Darkness

Carrots emit visible scent particles or dither trails.

This uses:

- particles;
- lighting/darkness;
- RNG;
- modern renderer profile.

#### P2 — Room-Based Vertical Cave

Avoid one huge frustrating tower at first.

Structure:

```txt
Room 1: basic hop
Room 2: rhythm jump
Room 3: ears glide
Room 4: moving platform
Room 5: spider
Room 6: darkness + scent trail
Room 7: carrot gate
```

Each room teaches one mechanic.

### 20.5 Renderer Profile

ChaosBunny should intentionally use:

```ts
profile: 'modern'
```

Allowed:

- smooth/dithered darkness;
- particles;
- richer animations;
- larger sprites;
- atmospheric transitions.

### 20.6 Presentation

Create a dramatic loading/title image:

```txt
A small rabbit at the mouth of a tall dark cave.
Glowing carrots in the distance.
Spider silhouettes on walls.
Limited Spectrum-style palette.
Bold high-contrast composition.
```

Use this for:

- game title screen;
- README carousel;
- landing page.

### 20.7 Avoid

Avoid making it a generic platformer.

Do not add random mechanics unless they reinforce:

```txt
rabbit movement
a vertical cave
darkness
carrots
scent
cute fear
```

---

## 21. Minefield Roadmap

### 21.1 Role

Minefield is the stable documentation reference.

Pitch:

```txt
A complete ZX Spectrum-style Minesweeper built with zx-kit.
```

### 21.2 Why It Matters

Minefield is easy to understand and good for case studies. It can show:

- board logic;
- renderer;
- font;
- input;
- tile drawing;
- simple audio;
- tests/property checks if present.

### 21.3 Priority

#### P1 — Update to Latest zx-kit

- Update dependency to latest zx-kit.
- Ensure build passes.
- Update README version references.
- Add screenshot.

#### P2 — Case Study Page

Create:

```txt
docs/case-studies/minefield.md
```

Explain:

- how zx-kit renderer is used;
- how input works;
- how tile cells map to board cells;
- how color/palette are used;
- what was tested.

### 21.4 Avoid

Do not overcomplicate Minefield. Its value is simplicity.

---

## 22. Nautilus2K Roadmap

### 22.1 Role

Future simulation/instrumentation reference.

Pitch:

```txt
A ZX Spectrum-style submarine command micro-sim with sonar, depth, energy, hull pressure, mines, and a recovery objective.
```

### 22.2 Main Missing Piece

It needs a clear win/lose loop.

### 22.3 Proposed "Black Box" Objective

Goal:

```txt
Locate and recover a lost black box / Gaia Stone / probe.
Return to safe zone.
```

Obstacles:

```txt
mines
pressure
oxygen
battery
sonar noise
hull damage
darkness
```

Win:

```txt
Object recovered and submarine returns to safe depth / base zone.
```

Lose:

```txt
Hull collapse
oxygen empty
battery empty
mine impact
lost beyond recovery
```

### 22.4 zx-kit Features Demonstrated

- instrumentation widgets;
- text UI;
- AY sonar pings;
- warning alarms;
- scene state;
- save/checkpoint;
- palette-limited cockpit.

### 22.5 Priority

Not urgent. Park until zx-kit cleanup and IceHaul/ChaosBunny updates are underway.

---

## 23. Frogger Roadmap

### 23.1 Role

Currently low priority.

### 23.2 Problem

As a known clone, it does not strongly help zx-kit’s originality.

### 23.3 Options

#### Option A — Archive / De-emphasize

Keep repo available but do not feature it as a major reference game.

#### Option B — Reimagine

Turn it into something original:

```txt
Attribute Frog:
  Frog changes ink/paper states to survive.

Time Frog:
  Lanes rewind every few seconds.

Toxic Marsh:
  Procedural chemical swamp with color-coded hazards.

Mouse Frog:
  Player draws safe lily paths with mouse.
```

### 23.4 Recommendation

Archive/de-emphasize for now.

---

## 24. Next Reference Games Backlog

These are not urgent. Keep them as future ideas when the owner asks for a new reference game.

### 24.1 Ink & Paper Heist

#### Concept

A stealth puzzle game where ZX Spectrum color clash becomes the central mechanic.

#### Core Mechanic

- Rooms are divided into 8x8 attribute cells.
- Each cell has `ink` and `paper`.
- The player’s visibility depends on contrast.
- Guards detect strong contrast.
- Player can change selected cells or temporarily invert attributes.
- Hiding is not about darkness only; it is about becoming part of the cell’s color language.

#### Why It Is Strong

This is the most zx-kit-specific game idea. It uses a famous ZX limitation as gameplay.

#### zx-kit Features Demonstrated

- AttrMap;
- palette;
- color clash;
- tilemap;
- collision;
- stealth state;
- custom font;
- small UI.

#### Possible Pitch

```txt
A stealth game where color clash is not a bug — it is your disguise.
```

### 24.2 Spectrum Terrarium

#### Concept

A small procedural ecosystem in a 32x24 Spectrum grid.

#### Core Mechanic

The player uses mouse input to add water, shade, light, seeds, or barriers. Plants, insects, and small creatures follow simple deterministic rules.

#### Why It Is Strong

It demonstrates modern browser interactions inside a Spectrum-style world.

#### zx-kit Features Demonstrated

- mouse input;
- deterministic RNG;
- save/load;
- tile updates;
- particles;
- palette;
- simple simulation.

#### Possible Pitch

```txt
A tiny living Spectrum garden where every pixel creature follows simple rules.
```

### 24.3 Signal Cartographer

#### Concept

A procedural cave/planet mapping game. The player cannot see the full map directly and must place signal beacons to infer the world.

#### Features Demonstrated

- procedural generation;
- mouse input;
- lighting/dither;
- tile scrolling;
- save/load;
- UI instruments.

### 24.4 Lighthouse Has 32 Rooms

#### Concept

A roguelite puzzle game in a lighthouse that rearranges every night. The beam of light reveals only dithered cones.

#### Features Demonstrated

- scene manager;
- lighting;
- procedural rooms;
- particles;
- save slots.

### 24.5 Mouse Miner

#### Concept

A mining game where the player draws tunnels with the mouse and guides a delayed robot through procedural underground terrain.

#### Features Demonstrated

- mouse input;
- procedural tilemap;
- particles;
- collision;
- save/load.

---

## 25. Landing Page Strategy

### 25.1 Goal

The landing page must explain the project visually in 3 seconds.

### 25.2 Hero Section

```txt
Build ZX Spectrum-looking browser games in TypeScript.
No emulator. No Z80 required. No runtime dependencies.

[Play Demo] [Docs] [GitHub] [npm]
```

Include an embedded canvas demo or animated WebP.

### 25.3 Sections

```txt
1. Hero
2. What is zx-kit?
3. Not an emulator
4. Core features
5. Live demos / reference games
6. Code snippet
7. Examples gallery
8. Docs links
9. License / GitHub / npm
```

### 25.4 Comparison Table

```md
| | zx-kit | Emulator | Phaser | PICO-8/TIC-80 |
|---|---|---|---|---|
| npm package | yes | not the point | yes | no |
| TypeScript-first | yes | no | partial | no |
| ZX-style visuals | yes | yes | no | no |
| Modern browser game logic | yes | limited | yes | limited |
| Real hardware accuracy | no | yes | no | no |
| Zero runtime dependencies | yes | varies | no | no |
```

### 25.5 Social / Community Promotion

Only after README, gallery, and at least two polished demos exist.

Suggested posts:

- "Color clash as a feature, not a bug."
- "AY + beeper audio in a browser TypeScript toolkit."
- "Pixel-perfect collision vs AABB in Spectrum-style games."
- "A procedural ice-road trucking game in 256x192."
- "Build a ZX Spectrum-looking browser game in 30 lines."

Places:

```txt
X/Twitter
Reddit: r/zxspectrum, r/gamedev, r/typescript, r/javascript, r/indiegamedev
Itch.io demo collection
Show HN after landing page is polished
```

---

## 26. Package Metadata Improvements

### 26.1 Current Good Signs

Keep:

- ESM package;
- `exports`;
- TypeScript declarations;
- `sideEffects: false`;
- MIT license;
- no runtime dependencies;
- Vitest;
- semantic-release.

### 26.2 Suggested Keywords

Add more npm keywords:

```json
"keywords": [
  "zx-spectrum",
  "spectrum",
  "retro",
  "retro-gaming",
  "game",
  "game-engine",
  "typescript",
  "canvas",
  "canvas2d",
  "pixel-art",
  "web-audio",
  "chiptune",
  "ay-3-8912",
  "beeper",
  "tilemap"
]
```

### 26.3 GitHub Topics

Set repository topics:

```txt
zx-spectrum
typescript
canvas
game-engine
retro-gaming
pixel-art
web-audio
chiptune
tilemap
browser-game
```

---

## 27. Testing and Quality

### 27.1 Keep Unit Tests Strong

Continue testing:

- renderer helpers;
- bitmap creation;
- collision;
- tilemap;
- input state transitions;
- save/load migrations;
- RNG determinism;
- particles pool behavior.

### 27.2 Add Visual Regression Later

For renderer confidence:

```txt
tests/visual/
  draw-bitmap.snap.png
  attr-map.snap.png
  text-rom-font.snap.png
  dither-light.snap.png
```

Test by comparing canvas pixel buffer.

### 27.3 Add No-Allocation Tests for Hot Paths

For particles/collision/tile scrolling:

```txt
Assert no per-frame array allocations where possible.
```

This is optional but fits the project’s identity.

### 27.4 CI Badges

Add README badges:

- npm version;
- license;
- CI;
- coverage if available;
- zero dependencies if using a badge or custom line.

---

## 28. Agent Working Rules

### 28.1 General

When an agent works on this project:

1. Read this document first.
2. Identify whether the task is:
   - zx-kit core cleanup;
   - docs;
   - reference game migration;
   - new feature;
   - future experiment.
3. Avoid unrelated feature creep.
4. Prefer small, reviewable commits.
5. Run tests/builds where available.
6. Update docs when public API changes.
7. Update reference games if public API changes.

### 28.2 Commit Style

Use Conventional Commits.

Examples:

```txt
docs(changelog): rewrite changelog for readability
docs(readme): add screenshot showcase
feat(font): add custom bitmap font renderer
feat(create): add minimal starter template
fix(renderer): avoid repeated authentic diagnostics
refactor(ui): split instrumentation widgets from core ui
test(collision): cover edge-aligned bitmap masks
```

### 28.3 Branch Names

Suggested:

```txt
docs/changelog-cleanup
docs/readme-showcase
feat/create-zx-kit
feat/custom-fonts
feat/renderer-profiles
game/icehaul-gearbox
game/chaosbunny-rhythm-hop
```

### 28.4 Pull Request Template

```md
## Purpose

What does this change improve?

## Type

- [ ] core API
- [ ] docs
- [ ] example
- [ ] reference game
- [ ] tooling
- [ ] experimental

## API Impact

- [ ] no public API change
- [ ] new API only
- [ ] deprecated API
- [ ] breaking change

## Reference Game Impact

- [ ] IceHaul checked
- [ ] ChaosBunny checked
- [ ] Minefield checked
- [ ] Nautilus2K checked
- [ ] Frogger checked

## Tests

- [ ] npm run build
- [ ] npm test
- [ ] manual browser test
```

---

## 29. Suggested Immediate Work Sessions

### Session A — Changelog Cleanup

Goal:

```txt
Rewrite CHANGELOG.md into a curated user-facing changelog.
```

Steps:

1. Open current CHANGELOG.
2. Add `[Unreleased]`.
3. Fix typos.
4. Group maintenance noise.
5. Add pre-1.0 stability note.
6. Do not modify package version.
7. Commit:

```bash
git commit -m "docs(changelog): rewrite changelog for readability"
```

### Session B — README Showcase

Goal:

```txt
Make README visually convincing.
```

Steps:

1. Add `docs/assets/screenshots/`.
2. Add 3-5 optimized screenshots.
3. Add hero screenshot row or animated WebP.
4. Shorten README intro.
5. Move long tutorial to docs if possible.
6. Link examples gallery placeholder.

### Session C — API Stability Labels

Goal:

```txt
Clarify stable vs experimental modules.
```

Steps:

1. Add `docs/api-stability.md`.
2. Add stability table.
3. Add JSDoc `@experimental` to lighting/particles/instruments if appropriate.
4. Do not break imports.
5. Update README docs section.

### Session D — Examples Gallery

Goal:

```txt
Create examples/index.html with cards.
```

Steps:

1. List all examples.
2. Add screenshots or placeholder thumbnails.
3. Link Play and Source.
4. Ensure it works on GitHub Pages.
5. Add link from README.

### Session E — IceHaul Latest zx-kit + Gearbox

Goal:

```txt
Update IceHaul to current zx-kit and prototype manual gearbox.
```

Steps:

1. Update dependency.
2. Build and fix imports.
3. Add gear state.
4. Add RPM/traction UI.
5. Tune slow acceleration.
6. Keep run loop compact.

### Session F — ChaosBunny Latest zx-kit + Movement Identity

Goal:

```txt
Update ChaosBunny to current zx-kit and add unique rabbit movement.
```

Steps:

1. Update dependency.
2. Build and fix imports.
3. Prototype rhythm jump.
4. Prototype ears glide.
5. Add carrot recovery idea.
6. Ensure it remains cute and readable.

---

## 30. Final Strategic Notes

The project owner is highly creative and easily inspired by new ideas. This is a strength, but for zx-kit the next winning move is not adding everything.

Use this decision rule:

```txt
Does this change make zx-kit easier to understand, easier to adopt, or better proven by reference games?
```

If yes, prioritize it.

If no, put it in backlog.

Current best focus:

```txt
1. Stabilize zx-kit.
2. Make docs and showcase excellent.
3. Keep IceHaul and ChaosBunny on latest zx-kit.
4. Use IceHaul as traditional flagship.
5. Use ChaosBunny as modern/emotional flagship.
6. Keep future game ideas documented but not active.
```

The long-term promise is strong:

```txt
Modern browser games that use the ZX Spectrum as a visual and sonic language, not as a technical prison.
```

# chaosBunny 🐰

A cute-rabbit **vertical cave climber** for the browser, built on
[zx-kit](https://www.npmjs.com/package/zx-kit) `^0.31.0` — a modern canvas game
with an authentic ZX Spectrum feel: 256×192, hard pixels, 15-colour palette,
8×8 dither, monochrome playfield mode, AY music and beeper SFX.

A small rabbit is trapped deep underground. Climb the cave, **collect every
carrot** to open the moon-lit exit, and escape to the surface — past spiders,
outline-wing bats, crumbling ledges and a ladder or two. Dark, atmospheric,
*never cruel*: creatures retreat and curl, they are never killed.

## Play

```bash
npm install
npm run dev      # http://localhost:5173
```

Build for production: `npm run build` (output in `dist/`). Pushing to `main`
deploys to GitHub Pages via `.github/workflows/ci-deploy.yml`.

## Controls

| Key | Action |
|-----|--------|
| `←` `→` | Move |
| `Space` / `W` | Jump (variable height — hold for higher) |
| `↑` / `↓` | Climb a ladder (and descend) |
| `↓` / `S` | Crouch (on ground) |
| `Z` / `Ctrl` | Throw a carrot |
| `L` | **Toggle cave darkness on/off** |
| `M` | Mute / unmute the background music |
| `C` | **Toggle monochrome ZX playfield** (black silhouettes on pale paper — the no-clash retro look; default is full colour) |
| `Ctrl+Shift+B` | Debug overlay (note: Firefox steals this shortcut) |

The HUD shows carrots collected, floor reached and HP (hearts); the real running
zx-kit version sits bottom-left and the FPS bottom-right.

## Lighting (read me)

The cave can render **dithered darkness** — hard 8×8 light pools with an ordered
(Bayer) dither edge, *brightest near the moon, darkest at the floor* (a depth
gradient). It's drawn by zx-kit's [`lighting`](https://www.npmjs.com/package/zx-kit)
module (pre-baked dither tiles + a per-cell dirty buffer + one blit per frame —
no per-frame `putImageData`).

**Right now darkness is OFF by default** (`LIGHTING_MODE = 'none'` in
`src/config.ts`) so the level reads clearly while we build content. Press **`L`**
to turn it on. We'll properly tune it — depth, `MAX_DARKNESS`,
`SURFACE_LIGHT_FACTOR`, and per-area moods — when we get to **biomes**.

## How it's built

- **Hand-authored, fixed levels** (`src/world/level.ts`) — learnable and
  speedrun-able like Manic Miner / Jump King, not procedural. `buildRoomFromLevel`
  turns the tile data into the room.
- **Reachability is tested**: `tests/level.tests.ts` proves every platform is
  climbable by a jump (with head clearance) or a ladder — so tuning the level
  can't silently make it impossible.
- **Everything derives from the rabbit's collision box** (`src/rabbit.ts`):
  platform spacing, widths, spawn — so the sprite can be resized without
  re-tuning by hand.
- **Pixel-perfect** pickups/hits via zx-kit mask overlap (never bounding boxes).
- **ZX-authentic sprite direction** — text-art source rows compile into byte-aligned
  bitmaps and pixel masks. The rabbit is now a compact 24×24 mono-first sprite
  with folded ears, magenta ear/nose accents and cyan shade; the bat uses a
  transparent-outline 24×16 wing-flap cycle whose current frame also drives the
  collision mask.
- **Concept references** live in `docs/concepts/`: `chaosbunny-rabbit-zx-concept.png`
  and `chaosbunny-enemies-zx-concept.png`.
- Crumbling platforms, ladders, a collect-to-open moon, and a Manic-Miner-style
  "gather then escape" loop.
- **Cached rendering** — the parallax dungeon backdrop, the whole tile layer, and
  the static CRT scanline overlay are each rendered once to an offscreen canvas and
  blitted per frame (via zx-kit's `createLayerCache`); the tile cache is invalidated
  only when a platform crumbles or the level resets. A few `drawImage`s instead of
  thousands of per-pixel `fillRect`s a frame — the change that fixed the frame rate.

## Develop

```bash
npm test          # vitest (Node 22+)
npm run build     # tsc + vite build
```

> Built on Node 22+. After bumping the `zx-kit` dependency, run
> `npm run dev -- --force` (or clear `node_modules/.vite`) so Vite re-bundles it.

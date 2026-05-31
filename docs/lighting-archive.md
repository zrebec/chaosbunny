# Osvetlenie — archív kódu (záloha)

> Záloha kompletného osvetľovacieho subsystému chaosBunny k 2026-05-31.
> Kontext, prečo a porovnanie variant: [`lighting.md`](./lighting.md).
> Toto je snapshot — zdroj pravdy je `src/world/lighting.ts`. Slúži na rýchle
> obnovenie / referenciu, keby sa niečo prepísalo.

## Technické zhrnutie

- **Variant A ('zx', default):** 8×8 bunky → light level 0–3 (`cellLevel`) →
  ordered Bayer 4×4 dither čiernych pixelov v `ImageData`. Žiadny alpha,
  tvrdé blokové hrany. Verné ZX, podľa briefu.
- **Variant B ('smooth', odložené):** translucent čierna vrstva + mäkké radiálne
  gradienty cez `createRadialGradient` + `globalCompositeOperation='destination-out'`.
  Moderné, nie speccy. Zachované za prepínačom.
- Prepínač: `LIGHTING_MODE` v `config.ts`. Dispatcher `renderDarkness(ctx, lights, mode)`.
- Svetlá sú v **screen** súradniciach (kamera už aplikovaná). Zdroje: zajko,
  fakle (`entities/torch.ts`), mrkvové iskry.

---

## `src/world/lighting.ts`

```ts
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js'

export interface Light {
  x: number
  y: number
  radius: number
  intensity: number // 0–1
}

export type LightingMode = 'zx' | 'smooth'

let dark: HTMLCanvasElement | null = null
let dctx: CanvasRenderingContext2D | null = null
let zxImg: ImageData | null = null

/** Creates the offscreen darkness buffer. Call once at startup. */
export function initLighting(): void {
  dark = document.createElement('canvas')
  dark.width = GAME_WIDTH
  dark.height = GAME_HEIGHT
  dctx = dark.getContext('2d')
  if (dctx) zxImg = dctx.createImageData(GAME_WIDTH, GAME_HEIGHT)
}

// ── Variant A — ZX-authentic 8×8 cell light levels + ordered dither ───────────

// Dispersed 4×4 Bayer matrix (values 0–15), row-major. Drives the stipple.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Light level 0 (dark) … 3 (bright) for a cell centre at (px, py). */
function cellLevel(px: number, py: number, lights: readonly Light[]): number {
  let bright = 0
  for (const l of lights) {
    if (l.radius <= 0) continue
    const dx = px - l.x
    const dy = py - l.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < l.radius) {
      const b = (1 - d / l.radius) * l.intensity
      if (b > bright) bright = b
    }
  }
  return Math.min(3, Math.floor(bright * 4))
}

export function renderDarknessZX(ctx: CanvasRenderingContext2D, lights: readonly Light[]): void {
  if (!dark || !dctx || !zxImg) return
  const data = zxImg.data
  const cols = GAME_WIDTH >> 3
  const rows = GAME_HEIGHT >> 3

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const level = cellLevel(cx * 8 + 4, cy * 8 + 4, lights)
      const a = (3 - level) / 3 // darkness amount: level3→0, level0→1
      for (let y = 0; y < 8; y++) {
        const py = cy * 8 + y
        for (let x = 0; x < 8; x++) {
          const px = cx * 8 + x
          const thr = (BAYER4[((py & 3) << 2) | (px & 3)]! + 0.5) / 16
          // rgb stays 0 (black) from init; we only toggle alpha.
          data[(py * GAME_WIDTH + px) * 4 + 3] = thr < a ? 255 : 0
        }
      }
    }
  }

  dctx.putImageData(zxImg, 0, 0)
  ctx.drawImage(dark, 0, 0, GAME_WIDTH, GAME_HEIGHT)
}

// ── Variant B (shelved) — modern smooth radial overlay ────────────────────────

export function renderDarknessSmooth(
  ctx: CanvasRenderingContext2D,
  lights: readonly Light[],
  darkness = 0.86,
): void {
  if (!dark || !dctx) return

  dctx.globalCompositeOperation = 'source-over'
  dctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  dctx.fillStyle = `rgba(0,0,0,${darkness})`
  dctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  dctx.globalCompositeOperation = 'destination-out'
  for (const l of lights) {
    if (l.radius <= 0) continue
    const g = dctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius)
    g.addColorStop(0, `rgba(0,0,0,${l.intensity})`)
    g.addColorStop(0.55, `rgba(0,0,0,${l.intensity * 0.45})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    dctx.fillStyle = g
    dctx.fillRect(l.x - l.radius, l.y - l.radius, l.radius * 2, l.radius * 2)
  }
  dctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(dark, 0, 0, GAME_WIDTH, GAME_HEIGHT)
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function renderDarkness(
  ctx: CanvasRenderingContext2D,
  lights: readonly Light[],
  mode: LightingMode,
): void {
  if (mode === 'zx') renderDarknessZX(ctx, lights)
  else renderDarknessSmooth(ctx, lights)
}
```

---

## Prepínač — `src/config.ts`

```ts
export const LIGHTING_MODE = 'zx' as const   // 'zx' = Variant A | 'smooth' = Variant B
```

## Zapojenie — `src/main.ts` (relevantné časti)

```ts
import { initLighting, renderDarkness, type Light } from './world/lighting.js'
import { LIGHTING_MODE } from './config.js'

initLighting() // once, after building the room

// …each frame, after rendering the scene (bg → tiles → entities → torches → player):
const lights: Light[] = [
  { x: player.x + 8 - camX, y: player.y + 16 - camY, radius: 72, intensity: 1.0 },
]
for (const l of torchLights(torches, camX, camY, now)) lights.push(l)
for (const s of shots) if (s.active) lights.push({ x: s.x - camX, y: s.y - camY, radius: 38, intensity: 0.9 })
renderDarkness(ctx, lights, LIGHTING_MODE)

// then: fire particles (glow above darkness) → HUD → scanlines
```

## Zdroj svetla z fakieľ — `src/entities/torch.ts` (`torchLights`)

```ts
export function torchLights(torches, camX, camY, time): Light[] {
  return torches.map((t) => {
    const flicker = 1 + Math.sin(time * 0.013 + t.phase) * 0.12 + (Math.random() - 0.5) * 0.08
    return { x: t.x + 4 - camX, y: t.y + 2 - camY, radius: 42 * flicker, intensity: 0.92 }
  })
}
```

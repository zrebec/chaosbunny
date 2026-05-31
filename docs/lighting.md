# Osvetlenie v chaosBunny — technická poznámka a priznanie

> Stav k 2026-05-30. Týka sa `src/world/lighting.ts` + svetelné zdroje v `src/main.ts` a `src/entities/torch.ts`.

## 1. Čo je teraz implementované

Aktuálne osvetlenie je **moderný „darkness overlay" s mäkkými radiálnymi svetlami**:

1. Vytvorím **offscreen canvas** 256×192 (`document.createElement('canvas')`, `initLighting()`).
2. Každý frame ho **vyplním takmer čiernou** s priehľadnosťou: `fillStyle = rgba(0,0,0,0.86)` cez `fillRect`.
3. Prepnem **`globalCompositeOperation = 'destination-out'`** a pre každý svetelný zdroj nakreslím **radiálny gradient** (`createRadialGradient`, stredy s klesajúcou alfou) — tým **vymažem** mäkký kruh z tmy (čím vyššia alfa, tým viac tmy zmizne).
4. Vrátim kompozitný režim a celý buffer **blitnem** na hernú scénu (`drawImage`), ktorá je škálovaná 4×.

Svetelné zdroje (v *screen* súradniciach): **zajko** (r≈60), **fakle** (blikajúce r≈42, blikanie = `sin` + náhodný jitter), **mrkvové iskry** (r≈34 počas letu).

## 2. Prečo som to spravil takto

- **Jednoducho a rýchlo** — pár desiatok riadkov, žiadne per-pixel slučky, výkon v pohode.
- **Plynulý falloff** vyzerá „atmosféricky" a hladko.
- Dobre sa kombinuje s časticami ohňa (oheň kreslím **nad** tmou, takže žiari).

## 3. Priznanie: **toto nie je ZX-autentické**

Reálny ZX Spectrum **toto nedokázal a ani náznakom**:

- Obraz je **256×192**, ale farba sa rieši v **mriežke 32×24 atribútových buniek 8×8**. Každá bunka má **iba 2 farby** (INK + PAPER) a jeden **BRIGHT** bit. Žiadny alpha-blending, žiadne polopriehľadné vrstvy, žiadne per-pixel gradienty.
- „Plynulé" stmievanie cez `rgba(...,0.86)` a radiálny gradient je **technika z éry 2000+** (kompozitné operácie canvasu). Na Speccy fyzicky nemožná.
- Náš `destination-out` + `createRadialGradient` je presne ten „modern smooth lighting", ktorému sa mal projekt podľa briefu **vyhnúť**:

> **Z pôvodného briefu (game.MD / AGENTS.md):** *„Prefer ZX-style palette and dithering over modern smooth lighting."* a *„Use tile light levels first: LightLevel 0..3"*.

Čiže aktuálny stav **vedome porušuje** zadanie — vymenil som autenticitu za rýchly pekný výsledok. Preto tá otázka nižšie.

## 4. Ako by vyzeralo **autentické** ZX osvetlenie

Na Speccy sa „svetlo/tma" robilo **po 8×8 bunkách** a medzistupne sa **fejkovali ditheringom** (vzor bodiek/šachovnica z 2 farieb), nie alfou:

- **Light levels 0–3 per bunka** (presne ako navrhuje brief):
  - `0` = tma (PAPER čierna),
  - `1` = silueta (tmavá, napr. tmavomodrý dither),
  - `2` = čitateľné (normálna farba),
  - `3` = jasné (BRIGHT).
- Pre každú 8×8 bunku spočítam úroveň podľa vzdialenosti k najbližšiemu svetlu a nakreslím **ditherovaný overlay** (Bayer/ordered pattern) v palete — **tvrdé, blokové** svetelné kaluže, žiadny plynulý prechod.
- Výsledok = stupňovité, „štvorčekové" svetlo so stipple prechodom — vzhľad ako *Knight Lore*, *Head over Heels*, dithered tiene v *Movie* a pod.

Toto je **viac roboty** (počítanie úrovní per bunka + dither tabuľky), ale je to **verné** a sedí to s 8×8 tilemapou a fontom, ktoré už používame.

## 5. Možnosti — kam ďalej

| Var. | Prístup | Vzhľad | Autenticita | Robota |
|---|---|---|---|---|
| **A — Verný** | Light levels 0–3 per 8×8 bunka + dithering, žiadny alpha | Tvrdé blokové kaluže, stipple falloff | ✅ vysoká (podľa briefu) | stredná |
| **B — Diverge** | Nechať súčasný smooth radiálny overlay | Hladké, moderné | ❌ žiadna | hotové |
| **C — Hybrid** | Smooth výpočet, ale **kvantizovaný do 3–4 úrovní + dither** a zarovnaný na 8×8 | Blokové, ale jemnejšie prechody | 🟡 stredná (kompromis) | stredná |

Môj názor: keďže celá hra stojí na ZX estetike (paleta, 8×8 font, scanlines, pixel-perfect), **odporúčam A** — bude to konzistentné a „speccy". B drží len ak vedome ideme po modernom looku. C je rozumný kompromis, ak chceš jemnejšie ako čisté A, ale stále blokové.

> Pozn.: nech zvolíš čokoľvek, `lighting.ts` je izolovaný modul — prepísanie sa nedotkne hernej logiky, len render osvetlenia.

## 6. Rozhodnutie (2026-05-31)

Zvolené **Variant A (verný ZX)** ako default. **Variant B (smooth) sa NEZAHADZUJE** — obe žijú v `lighting.ts` za prepínačom:

```ts
// src/config.ts
export const LIGHTING_MODE = 'zx' as const   // 'zx' = Variant A | 'smooth' = Variant B
```

`renderDarkness(ctx, lights, mode)` deleguje na `renderDarknessZX` alebo `renderDarknessSmooth`. Prepnutie = zmena jedného flagu, žiadne ďalšie úpravy. Takto je B reálne spustiteľná (na porovnanie), nielen v dokumentácii.

### Ako funguje Variant A (dither)
- Obrazovka 256×192 sa berie ako **32×24 buniek 8×8**.
- Pre stred každej bunky sa nájde najjasnejší príspevok svetiel → **úroveň 0–3** (`cellLevel`).
- „Množstvo tmy" `a = (3 - level) / 3`.
- Pre každý pixel: `čierny ak (Bayer4[y%4][x%4] + 0.5) / 16 < a` — **ordered dithering** (rozptýlená 4×4 Bayer matica).
- Výsledok ide do offscreen `ImageData` (meníme len alfu, RGB ostáva 0) → `putImageData` → `drawImage` na scénu.
- **Hard 8×8 hrany** medzi úrovňami + stipple výplň = ten správny speccy look.

### Možné doladenie A
- Polomery/intenzity svetiel (`main.ts`: zajko r72/i1.0, mrkva r38; `torch.ts`: r42).
- Bayer 4×4 → 8×8 pre jemnejší stipple.
- Farebné (atribútové) svetlo — teplý žltý dither pri fakliach vs studené okolie (zatiaľ len jas/čierna).

### Plný kód (záloha)
Kompletný zdroj `lighting.ts` (obe varianty) + zapojenie je archivovaný v [`lighting-archive.md`](./lighting-archive.md).

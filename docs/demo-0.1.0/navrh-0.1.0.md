# chaosBunny — Návrh implementácie (demo 0.1.0)

> Sprint po: Minefield → Frogger (pozastavený) → Ice Haul. Toto je nasledujúci projekt.
> Engine: **zx-kit v0.22.0** (lokálny zdroj `../zx-kit`, npm `zx-kit`).
> Dokument je v SK. Slúži ako zadanie šprintu — „do čoho ideme".

---

## 0. Premenovanie: všetko je `chaosBunny`

V pôvodných dokumentoch (game.MD, AGENTS.md/CLAUDE.md) sa hra volá **BURROWLIGHT** a hráč **Pip**. Toto rozhodnutie padlo neskôr, takže:

| Pôvodne | Nové |
|---|---|
| BURROWLIGHT | **chaosBunny** |
| Pip (meno králika) | **chaosBunny** (alt. len „the rabbit / králik" v texte) |
| `burrowlight*` identifikátory | `chaosBunny*` / `cb*` |

Príbeh, mechaniky, sprity a pravidlá z pôvodných dokumentov **zostávajú v platnosti** — mení sa len názov. `package.json` už má `name: "chaosbunny"`, takže je to konzistentné.

---

## 1. Vízia hry (zhrnutie)

Malý modrastý králik s bielym bruškom sa prepadne do starej jaskynnej nory. V tme nežijú „zlí" nepriatelia, len **vystrašené tvory tmy**. Králik ich **nezabíja** — strieľa drobné **mrkvové iskry**, ktoré ich oslepia, schúlia alebo zaženú späť do úkrytu.

**Cieľ:** dostať sa z najhlbšej časti jaskyne nahor na povrch k mesačnému svetlu.

- Žáner: temná, ale roztomilá jaskynná plošinovka / escape.
- Plátno: ZX-style **256×192**, tilemapa **8×8** → 32×24 dlaždíc.
- Najdôležitejšie pravidlo (neporušiteľné): **finálna kolízia = pixel-perfect overlap masiek.** AABB je len broad-phase. Žiadne „už je blízko, tak hit".

---

## 2. Analýza zx-kit — čo engine vie a čo z toho použijeme

Preštudoval som zdrojový kód `../zx-kit/src` (v0.22.0). Zhrnutie modulov a ako ich namapujeme na chaosBunny:

| Modul | Kľúčové API | Použitie v chaosBunny |
|---|---|---|
| `palette.ts` | `C` (15 farieb), `CELL=8`, `SCALE=4`, `SpectrumColor` | Celá paleta. Králik = `C.B_CYAN` + biele bruško `C.B_WHITE`. |
| `renderer.ts` | `setupCanvas`, **`Bitmap`**, **`createBitmap`**, **`createBitmapFromRows`**, **`drawBitmap`**, **`mirrorBitmap`**, `AttrMap`/`drawBitmapAttrs`, `drawScanlines`, `curveDisplay`, `flashBorder` | **Hlavný render path** pre všetky veľké sprity (králik, nepriatelia, pickupy). |
| `collision.ts` | **`bitmapPixelMask`**, **`masksOverlap`**, **`pixelSolidCount`**, `bitmapRect`, `rectsOverlap`, `resolveRectX/Y` | Jadro pixel-perfect modelu (viď §5). |
| `tilemap.ts` | `createTileMap`, `Tile`, `setTile/fillRect/getTile`, `isSolid`, `findById`, `render(viewport)` | Jaskynná miestnosť, kolízne dlaždice, `findById` na puzzle objekty. |
| `sprite.ts` | `Sprite` (8×8!), `createSprite`, `moveSprite`, `applyGravity`, `renderSprite` | **NEPOUŽIJEME** pre herné entity (viď výhrada A). `moveSprite`/`applyGravity` sú triviálne — prepíšeme vlastné. |
| `camera.ts` | `createCamera`, `setCameraTarget`, `tickCamera`, `worldToScreen`, `isInView` | Vertikálny scroll jaskyne, culling entít. |
| `animation.ts` | `createAnimation`/`tickAnimation`/`getAnimationFrame`, `Blinker`, `Tween` | Idle A/B, walk A/B; `Tween` na pohyblivú plošinu; `Blinker` na hurt/flash. |
| `audio.ts` | `initAudio`, `resumeAudio`, `beep`, `playPattern`, `setMasterVolume` | **Beeper SFX** (skok, výstrel, pickup, dopad, hit, menu). |
| `ay.ts` | `createAY` → `AYChip` (`tone/enableNoise/envelope/mute`), `playAY` | **AY hudba na pozadí** — 3 kanály: melódia, basový dron, jaskynný šum (noise). |
| `i18n.ts` | `pickLocale(default, {sk}, code)` | EN default (`strings.ts`) + SK (`strings.sk.ts`). |
| `input.ts` | `initInput`, `isHeld(key)`, `tickMovement`, `consumeFlag/Pause/Debug/AnyKey` | Pohyb cez `isHeld` (šípky/A,D, Space), fire = `consumeFlag`, pauza = `consumePause`, debug = `consumeDebug`. |
| `scene.ts` | `SceneManager` stack: `push/pop/replace`, `updateScenes/renderScenes` | Title → Game → Pause → GameOver. |
| `save.ts` | `createSaveProfile`, `writeSave/readSave`, sloty | Uloženie seedu + postupu (neskôr). |
| `ui.ts` | `drawBox/drawFrame/drawText*`, prístroje (tank, dial…) | HUD (mrkvy, hĺbka), debug overlay. |
| `font.ts` | ROM font 8×8 | Texty cez `drawText`. |

Engine je **idiomaticky výborný fit** — pixel-perfect kolízie (`masksOverlap`, `pixelSolidCount`) sú presne to, čo hra potrebuje, a sú podľa CHANGELOGu „battle-tested v Ice Haul".

---

## 3. Kľúčové technické zistenia a výhrady ⚠️

Toto sú veci, ktoré som našiel v zdrojáku enginu a v spritoch zo zadania a ktoré **ovplyvnia implementáciu**. Niektoré sú len upozornenia, niektoré vyžadujú tvoje rozhodnutie (viď §10).

### A. `Sprite` zo zx-kit je natvrdo 8×8 — pre entity ho nepoužijeme
`sprite.ts` má `Sprite.bitmap: Uint8Array` (8 bajtov) a `renderSprite()` cykluje `row < 8`. Náš králik je 24×32, nepriatelia 16–24 px. Preto **herné entity postavíme nad `Bitmap` API z `renderer.ts`** (`createBitmapFromRows` + `drawBitmap`), nie nad `Sprite`. Vlastný typ `Entity` (viď §4) bude niesť `Bitmap`, `PixelMask`, pozíciu, rýchlosť a stav. Kolízne funkcie (`bitmapRect`, `masksOverlap`, `pixelSolidCount`, `resolveRectX/Y`) pracujú s `Bitmap`/`Rect`, takže sadnú bez problémov.

### B. `createBitmapFromRows` je monochromatické a berie len `X`/`#`/`.`/medzeru
Funkcia vyhodí chybu na akomkoľvek inom znaku. Sprity v zadaní však používajú farebné symboly `P,B,W,C,S,G,Y,K,R,V`. Dôsledky:
1. Pre **masku** treba symboly najprv pretlačiť cez `rowsToMaskRows()` (každý ne-bodkový znak → `X`) — presne ako navrhuje AGENTS.md. ✅
2. Pre **farebný render** `drawBitmap` kreslí len **jednou** farbou (ink). Aby mal králik modré telo + biele bruško + ružové uši, potrebujeme **vrstvenie**: jedna `Bitmap` na skupinu farieb, každá nakreslená vlastným ink na rovnakú pozíciu. Navrhujem malý autorský helper `rowsToLayers(rows, mapping)`, ktorý z jedného multi-symbolového artu vyrobí N monochromatických bitmáp + jednu spojenú masku.
   - Alternatíva `AttrMap`/`drawBitmapAttrs` rieši farbu len **na úrovni 8×8 buniek** (autentický ZX colour-clash) — pre jemné detaily (oko, bruško) je príliš hrubá. Preto **odporúčam vrstvenie**, `AttrMap` necháme ako voliteľný „retro clash" mód.

### C. Predné sprity králika majú nekonzistentnú šírku → `createBitmapFromRows` spadne
`RABBIT_FRONT_IDLE` a `RABBIT_BORED_FRONT`: väčšina riadkov má **30 znakov**, posledné prázdne riadky **32 znakov**. Problémy:
- 30 nie je násobok 8 → `createBitmapFromRows` vyhodí chybu.
- Riadky nemajú rovnakú šírku → ďalšia chyba.

**Riešenie:** pri importe sprity **znormalizujeme na 32×32** (doplníme `.` sprava a zarovnáme). Spravím autorský sanity-check, ktorý pri builde overí, že každý sprite má rovnako široké riadky a šírka je násobok 8. Bočné sprity (24×24), nepriatelia (16/24) aj dlaždice (8/16) sú v poriadku.

### D. Plynulý vertikálny scroll: `tilemap.render` zarovnáva na mriežku dlaždíc
`TileMap.render(viewport)` berie `viewport.x/y` v **celých dlaždiciach** a kreslí dlaždicu na `col*CELL`. To znamená, že kamera vie scrollovať len po 8 px skokoch — pre plošinovku so skákaním to spôsobí viditeľné „cukanie" pozadia, kým entity sa hýbu plynule (sub-pixel). Možnosti:
1. **Akceptovať 8px-zarovnaný scroll** (jednoduché, retro, ale cukané).
2. **Doplniť do enginu** `drawTileMapAt(ctx, map, camX, camY)` s frakčným pixelovým offsetom (kreslí o 1 dlaždicu navyše a posúva o `camX % 8`). Toto je čistý kandidát na rozšírenie enginu.
3. Render tilemapy do offscreen canvasu a blitnúť s offsetom.

Odporúčam **(2)** — malé, generické, využijú aj ďalšie zx-kit hry. Vyžaduje tvoj súhlas (otázka v §10).

### E. Engine nemá seeded RNG — procedurálna generácia ho potrebuje
Zadanie chce „rovnaký seed = rovnaký svet". `Math.random()` nie je deterministický/seedovateľný. Potrebujeme malý PRNG (napr. `mulberry32` / `xorshift32`) s `createRng(seed)`. Otázka: **game-side util alebo upstream do enginu** (`rng.ts`)? Je to generická vec, ktorá by sa hodila aj iným projektom.

### F. Lighting systém je celý „naša" vrstva
Engine nemá svetlo/tmu. Tile light levels (0–3), light sources, radius falloff, flicker — všetko implementujeme my (viď §6). Je to najväčší vlastný subsystém. Otázka: nechať game-side, alebo neskôr vytiahnuť generický `lightmap.ts` do enginu?

### G. Mrkvový náboj = 8px bitmapa, 4 nepriehľadné pixely, 1 riadok
`CARROT_SHOT = ['CCCC....']` → cez `createBitmapFromRows`(po `rowsToMaskRows`) vznikne 8×1 bitmapa, kde solid sú len prvé 4 pixely. To presne sedí na „byte-aligned šírka, ale fyzicky 4 px". Maska má `totalPixels = 4`, `masksOverlap` aj `pixelSolidCount` s ňou fungujú. ✅ Pri streľbe doľava náboj zrkadlíme (`mirrorBitmap`) aby boli 4 solid pixely na správnej strane.

---

## 4. Architektúra hry

### 4.1 Vlastný entitný model (nad `Bitmap`)
```ts
interface SpriteAsset {            // staticky pripravené pri štarte
  bitmap: Bitmap                   // monochróm (alebo „base" vrstva)
  layers?: { bitmap: Bitmap; ink: SpectrumColor }[]  // farebné vrstvy (viď výhrada B)
  mask: PixelMask                  // bitmapPixelMask(zlúčená maska)
  w: number; h: number
}

interface Entity {
  x: number; y: number             // world px (float)
  vx: number; vy: number           // px/ms
  asset: SpriteAsset
  facing: 1 | -1                    // -1 → render cez flipX/mirror
  state: string                    // stavový automat per typ
  alive: boolean                   // „deaktivovaná", nie mŕtva
}
```
`moveSprite`/`applyGravity` zo zx-kit sú triviálne (`x += vx*dt`), prepíšeme si vlastné ekvivalenty pre `Entity`, alebo ich znovupoužijeme cez duck-typing (majú rovnaké polia `x,y,vx,vy`). Pre kolíziu s mapou použijeme `resolveRectX/Y(bitmapRect(asset.bitmap, x, y), map, newX/Y)` + jemné dorovnanie cez `pixelSolidCount` na hranách plošín.

### 4.2 Adresár projektu (návrh)
```
src/
  main.ts                 # bootstrap: canvas, audio, input, scene manager
  config.ts               # LANGUAGE_CODE, DEBUG, SCALE…
  engine-ext/             # naše rozšírenia (kým nie sú v zx-kit)
    rng.ts                # createRng(seed)  (výhrada E)
    particles.ts          # časticový systém (§9)
    lighting.ts           # svetlo/tma (§6)
    tilescroll.ts         # drawTileMapAt s px offsetom (výhrada D)
  art/
    sprites.ts            # *_ROWS konštanty (z AGENTS.md), normalizované
    atlas.ts              # spriteRows → SpriteAsset (bitmap+layers+mask)
    rowsToMaskRows.ts     # + rowsToLayers()
    tiles.ts              # Tile definície (cave stone, moss, one-way…)
  entities/
    player.ts             # stavový automat králika
    projectile.ts         # mrkvová iskra
    enemies/
      spider.ts ladybug.ts centipede.ts ...   # podľa fáz
    pickup.ts
  world/
    room.ts               # RoomState
    generate.ts           # procedurálny pipeline (seeded)
    validate.ts           # validácia miestnosti
  scenes/
    title.ts game.ts pause.ts gameover.ts
  i18n/
    strings.ts strings.sk.ts
  debug/
    overlay.ts            # AABB vs maska, masky, light levels, seed, locale…
```

### 4.3 Herná slučka (Game scéna)
```
each frame (dt):
  1. input  → zámer hráča (isHeld L/R/Jump, consumeFlag = fire)
  2. update player FSM (gravita, pohyb, resolveX/Y proti mape, streľba)
  3. update projectiles (pohyb, kolízia s mapou cez pixelSolidCount, life)
  4. update enemies (FSM, reagujú na svetlo/zvuk)
  5. broad-phase: bitmapRect/rectsOverlap → kandidáti
  6. narrow-phase: masksOverlap(...) > 0 → reálny hit/pickup/damage
  7. update particles, lighting, camera (tickCamera)
  8. render: tilemap (s camera offsetom) → entity → particles → tma/lighting → HUD → (debug) → scanlines
```

---

## 5. Pixel-perfect kolízny model (jadro)

**Pravidlo:** AABB len filtruje, maska rozhoduje.

```ts
// broad-phase
if (rectsOverlap(bitmapRect(a.bitmap, a.x, a.y), bitmapRect(b.bitmap, b.x, b.y))) {
  // narrow-phase — finálne rozhodnutie
  if (masksOverlap(a.mask, a.x|0, a.y|0, b.mask, b.x|0, b.y|0) > 0) {
    // skutočná kolízia
  }
}
```

Konkrétne pravidlá zo zadania:
- **Pickup mrkvy:** zdvihne sa len ak `masksOverlap(rabbitMask, …, carrotPickupMask, …) > 0`.
- **Pavúk zraní králika:** len ak `masksOverlap(spiderMask, …, rabbitMask, …) > 0`.
- **Náboj zasiahne pavúka:** len ak `masksOverlap(carrotShotMask, …, spiderMask, …) > 0` (1px riadok!).
- **Stonožka:** každý segment má vlastnú masku; testujeme proti všetkým (`head/body/tail`).
- **Kontakt s dlaždicou** tam, kde celodlaždicová AABB nestačí (úzke nôžky králika na hrane plošiny): `pixelSolidCount(mask, x, y+1, map) > 0` = stojí na zemi.

Masky sa počítajú **raz** pri štarte (`bitmapPixelMask`) a recyklujú každý frame (immutable). `masksOverlap` je O(pixelov), bez alokácií.

---

## 6. Lighting / tma

Začneme jednoducho podľa AGENTS.md — **tile light levels 0–3**:
```ts
type LightLevel = 0 | 1 | 2 | 3   // 0 tma, 1 silueta, 2 čitateľné, 3 jasné/puzzle
interface LightSource { x; y; radiusTiles; strength; flicker?; kind }
```
- Každý frame: vyčistiť light buffer (per-tile), pre každý zdroj rozliať svetlo s lineárnym/štvorcovým útlmom podľa vzdialenosti.
- Zdroje: **králik** (mäkký radius), **mrkvový výstrel** (krátky záblesk), **light crystal**, **glow-snail**.
- Render tmy: cez dlaždice s `LightLevel < threshold` nakreslíme čierny/ditherovaný overlay (ZX-style dithering, nie smooth gradient).
- Nepriatelia reagujú na `LightLevel === 3` (lienka útočí, root-worm sa stiahne, moth priťahuje).

Implementácia v `engine-ext/lighting.ts`, neskôr prípadne upstream.

---

## 7. Audio

- **AY (hudba na pozadí):** `createAY()` → slučkový sekvencer v našom kóde, 3 kanály:
  - A = melódia (pomalá, minimalistická),
  - B = basový dron,
  - C = jaskynný šum (`enableNoise`, vyšší `noisePeriod` = tmavšia textúra) — kvapkanie/ozvena.
  - Atmosféra „dark but not cruel" → pomalé tempo, dur/moll mix.
- **Beeper (SFX):** `beep`/`playPattern` — skok, výstrel mrkvy, pickup (stúpavé dve noty), dopad, hit (krátky šum), menu blip.
- `initAudio()` voláme v prvom user-geste (keydown na title screene). AY + beeper bežia paralelne (autentický 128K pattern).

---

## 8. i18n

`pickLocale(en, { sk }, LANGUAGE_CODE)`. Všetok UI text cez `L.*`. EN je zdroj pravdy v `strings.ts`, SK v `strings.sk.ts`. Prepínanie F2 (alebo v menu) → uložiť do `config`/save. Príklad: `L.TITLE`, `L.PRESS_FIRE`, `L.DEPTH(m)`, `L.PAUSED`, `L.SEED(s)`.

---

## 9. Procedurálna generácia (seeded)

Pipeline podľa AGENTS.md, riadený `createRng(seed)`:
1. Vygeneruj vertikálny graf miestností (hĺbka → povrch).
2. Vyber šablóny podľa hĺbky/obtiažnosti (`RoomType`).
3. Vyrež tilemapu z gramatiky šablóny.
4. Plošiny → 5. svetlá → 6. puzzle → 7. nepriatelia → 8. pickupy.
9. **Validácia dosiahnuteľnosti** (flood-fill od spawnu k exitu cez masku králika).
10. **Validácia pixel-fairness** (žiadny spawn v solid pixeloch, žiadne nevyhnutné zranenie, puzzle-switch zasiahnuteľný, tma neskrýva povinnú info bez zdroja svetla).

Pre demo 0.1.0 stačí **1 typ miestnosti** + seed input (aby bol systém prítomný a deterministický).

---

## 10. Návrhy rozšírení zx-kit ⭐

Toto sú kandidáti na rozšírenie enginu. Pri každom uvádzam môj zámer; finálne rozhodnutie je na tebe (otázky nižšie).

### 10.1 `particles.ts` (tvoj kandidát) — ODPORÚČAM
Dátovo-orientovaný pool častíc (bez alokácií za behu):
```ts
interface Particle { x; y; vx; vy; life; maxLife; color: SpectrumColor; size: 1|2 }
function createParticleSystem(max: number): ParticleSystem
function emit(ps, opts): void          // počet, rozptyl, rýchlosť, farba, life
function tickParticles(ps, dt, gravity?): void
function renderParticles(ctx, ps, camX, camY): void
```
Použitie: iskry za mrkvovým nábojom, prach pri dopade, obláčik keď sa pavúk stiahne, svetelné mušky okolo crystalu. Malé, generické, čisto v palete → ideálny upstream do zx-kit.

### 10.2 `engine-ext/tilescroll.ts` → neskôr upstream (výhrada D)
`drawTileMapAt(ctx, map, camX, camY, viewW, viewH)` so sub-pixel offsetom pre plynulý scroll. Bez neho cuká pozadie.

### 10.3 `rng.ts` (výhrada E)
`createRng(seed): () => number` (mulberry32) + helpery `randInt`, `pick`, `chance`. Generická vec pre každú procedurálnu hru.

### 10.4 `lighting.ts` (výhrada F)
Najprv game-side; ak sa osvedčí, generický `lightmap` do enginu.

---

## 11. Rozsah demo 0.1.0 (vertical slice)

Navrhujem **realistický prvý rez** (kompromis medzi malým prototypom z game.MD a veľkým milestoneom z AGENTS.md):

**MUST (0.1.0):**
1. Title screen s veľkým portrétom králika (`RABBIT_FRONT_IDLE`, normalizovaný 32×32).
2. Seed input (1 typ miestnosti, deterministický).
3. Jedna jaskynná tilemap miestnosť (cave stone + moss + one-way platforma).
4. Králik: idle-side (A/B), walk (A/B), jump, crouch, shoot, front-idle + facing mirror.
5. Pixel-perfect pickup mrkvy.
6. Pixel-perfect mrkvový výstrel (8×1, 4 px).
7. Pavúk (descend → curl pri zásahu, neredeaktivuje sa).
8. **Aspoň 1 ďalší** nepriateľ — navrhujem **lienku** (patrol) alebo **netopiera**.
9. Tma + svetelný radius okolo králika + záblesk z výstrelu.
10. AY slučka na pozadí + beeper SFX (skok/výstrel/pickup/hit).
11. `pickLocale()` EN + SK.
12. Debug overlay: AABB obdĺžniky vs výsledok maskového overlapu, masky, light levels, seed, locale, room type.

**NICE (ak ostane čas):** light crystal, pressure plate, locked gate, časticový systém.

**ODLOŽENÉ (0.2.0+):** stonožka (segmenty), centipede tunnel, mirror/prism puzzle, web gate, ostatní nepriatelia (root-worm, stone-beetle, glow-snail, drip-slime, moth), plná procedurálna generácia viacerých typov miestností, save/load profilov.

---

## 11b. Rozhodnutia (odsúhlasené)

| Téma | Rozhodnutie |
|---|---|
| **Farby spritov** | **Zatiaľ monochróm** — jedna ink farba na sprite (najrýchlejšie do prototypu). Vrstvenie/AttrMap doriešime neskôr. Maska sa aj tak ráta z `rowsToMaskRows`, takže prechod na farbu bude aditívny. |
| **Vertikálny scroll** | **`drawTileMapAt` so sub-pixel offsetom** → upstream do zx-kit. Plynulé pozadie. |
| **Rozšírenia enginu** | **`particles.ts`, `rng.ts`, `tilescroll` → upstream do `../zx-kit`.** `lighting` zatiaľ game-side. |
| **Rozsah 0.1.0** | **MUST rez + netopier** ako druhý nepriateľ (lieta v oblúkoch, reaguje na zvuk beepera). Stonožka/puzzle/plná procedurálka odložené na 0.2.0. |
| **Build toolchain** | Mirror Ice Haul: **Vite + TypeScript + Vitest**, `"type": "module"`, `zx-kit` ako dependency. |

## 12. Otvorené otázky (zvyšné)

1. **Premenovanie dokumentov:** mám prepísať aj `game.MD`/`AGENTS.md`/`CLAUDE.md` z BURROWLIGHT/Pip na chaosBunny, alebo nechať pôvodné a riadiť sa len týmto návrhom?
2. **Local vs npm `zx-kit`:** keďže upstreamujeme `particles`/`rng`/`tilescroll`, dáva zmysel vývoj proti **lokálnemu `file:../zx-kit`** (linknuté), nie npm 0.22.0. Potvrdiť.

## 13. Ďalší krok (skeleton 0.1.0)

Po odsúhlasení začnem v tomto poradí:
1. Scaffold: `package.json` (module + Vite/TS/Vitest), `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`.
2. `art/sprites.ts` (konštanty z AGENTS.md, **front sprity normalizované na 32×32**) + `rowsToMaskRows` + sanity-check šírok.
3. `art/atlas.ts`: `spriteRows` → `SpriteAsset` (`bitmap` + `mask` cez `bitmapPixelMask`).
4. Jedna jaskynná miestnosť (`createTileMap`, cave stone + moss + one-way) + `engine-ext/tilescroll.ts`.
5. Králik FSM + pohyb + **pixel-perfect** kolízia proti mape (`resolveRectX/Y` + `pixelSolidCount`).
6. Mrkvový výstrel (8×1) + pickup + pavúk + netopier, všetko cez `masksOverlap`.
7. Tma/svetlo, AY slučka, beeper SFX, EN/SK, debug overlay.

# RULES.md — čo sa v tejto hre nesmie prepísať

> **Načo tento súbor je.** Stealth hra je dokázaná: každá z 18 izieb má `par`
> spočítaný solverom a pripnutý vo vlastnom teste. To znamená, že **väčšina
> „drobných vylepšení" v pravidlách prepíše všetkých 18 izieb naraz** — a väčšinou
> ticho, lebo izba ostane prejditeľná, len za iný počet beatov, s inou férovosťou
> a s inou radou po treťom chytení.
>
> Tento súbor je zoznam takých vecí, aby sa nemusel zakaždým čítať kód.
>
> **Pre agenta:** toto čítaj **skôr**, než sa dotkneš čohokoľvek v `src/stealth/`.
> Ak návrh majiteľa spadá pod 🔴, **musíš ho odmietnuť a výslovne ho varovať** —
> nie mlčky obísť, nie urobiť a povedať potom.
>
> **Pre majiteľa:** tento súbor sa dá skontrolovať proti kódu príkazom
> `npm test -- rulebook`. Ak sedí, testy sú zelené.

---

## 🔴 ZAKÁZANÉ — nerobiť bez výslovného súhlasu majiteľa

> [!CAUTION]
> **Všetko v tejto sekcii mení logiku naprieč izbami.** Agent to musí odmietnuť,
> nahlas povedať, čo sa rozbije, a pokračovať až po výslovnom „áno, urob to".

### R1. Konštanty rulebooku

Tieto čísla **sú** hra. Každé z nich vstupuje do solvera, a solver spočítal `par`
každej izby.

| Konštanta | Hodnota | Súbor | Čo je |
|---|---:|---|---|
| `SNEAK_STEPS` | 2 | `beat.ts` | koľko krokov kúpia sklopené uši (dribling) |
| `THROW_RANGE` | 3 | `beat.ts` | ako ďaleko letí mrkva |
| `CREAK_HEARING` | 3 | `beat.ts` | ako ďaleko počuť vŕzgnutie dosky |
| `WADE_BEATS` | 2 | `beat.ts` | koľko beatov stojí krok do vody |
| `HEARING` | 5 | `patrol.ts` | ako ďaleko líška počuje dopad mrkvy |
| `EAT_BEATS` | 2 | `patrol.ts` | koľko beatov je líška pri mrkve slepá |
| `SIGHT_RANGE` | 4 | `rules.ts` | dosah kužeľa |
| `HALF_CONE` | 7 položiek | `rules.ts` | **tvar** kužeľa — tabuľka, nie vzorec |
| `LAMP_REACH` | 3 | `light.ts` | ako ďaleko svieti lampa (kroky, nie vzdušná čiara) |
| `BAT_HEARING` | 4 | `bat.ts` | ako ďaleko netopier počuje |
| `BAT_SPEED` | 2 | `bat.ts` | koľko buniek preletí za beat |
| `BAT_CIRCLE_BEATS` | 2 | `bat.ts` | koľko beatov krúži nad zvukom |
| `hold` (default) | 2 | `room.ts` | koľko beatov drží strážnik jeden pohľad |

**Čo sa stane pri zmene ktorejkoľvek:** prepíše sa `par` a `fewestSightings`
všetkých 18 izieb, prestanú platiť uložené rekordy hráčov, a `wants` (rada po
treťom chytení) môže začať klamať. Padne 18 testov izieb + `wants.tests.ts` +
`carrots.tests.ts` + `guards.tests.ts`.

**Ak to majiteľ naozaj chce:** prepočítať cez `KIND=ladder npm run roomgen`,
prepísať `par` v každej izbe, prepísať tabuľky v `docs/stealth-design.md`, a
prejsť celú pivnicu znova v prehliadači.

### R2. Voda nie je hluk

Líšky **nepočujú** šplechnutie. Je to zámerné rozhodnutie, nie opomenutie —
`beat.ts` to má v komentári:

> *„Heard by the player, not by the room: a fox that could hear a splash would
> make water a rule about sound, and it is a rule about time."*

Voda je pravidlo o **čase** (krok stojí dva beaty a svet sa pohne dvakrát), nie
o zvuku. Keby ju líšky počuli, izba 15 „Záplava" — ktorá sa **nedá prejsť suchou
nohou** — by sa mohla stať neprejditeľnou.

**Ambientný zvuk vody v izbe je v poriadku** a nie je porušením tohto pravidla:
znie hráčovi, nie svetu.

### R3. Žiadne svetlo okolo Randyho

Celý návrh stojí na tom, že **s ušami hore vidíš všetky kužele a ďalšie dva kroky
každej líšky** — cez celú obrazovku, aj cez steny. To je odmena za riziko a je to
dôvod, prečo je hra o plánovaní, nie o reflexoch.

Radius viditeľnosti okolo hráča („vidíš len na tri bunky") to zabije. Nerobiť, ani
ako voliteľný režim.

Ambientná tma je v poriadku **len ak sa kreslí pod intel vrstvu** — kužele, `?`,
`!`, `~`, zameriavač a HUD sa kreslia navrch a nesmú byť stmavené.

### R4. Id izby sa nikdy nepremenúva

`RoomSource.name` (`room01`, `room1b`, `room2b` …) je **kľúč, pod ktorým je uložený
rekord hráča** (`records.ts`, `localStorage`). Premenovanie id = hráč stratí rekord
a záznam behu.

Preto sú id „deravé" (`room1b` sa hrá druhá, `room16` štrnásta). **Poradie sa mení
v `rooms/index.ts`, nikdy premenovaním.**

### R5. Pôdorys izby sa neladí rukou

Izby vyšli z generátora a **ostávajú, ako prišli**. Ladenie „aby to fungovalo" do
izby vkreslí riešenie toho, kto ladí. `docs/stealth-design.md` §4.4:
*„Keep the plan as it came."*

Jediná úprava, ktorá je dovolená, je **posun celej izby** (centrovanie) — ten
nemení žiadnu vzdialenosť, kužeľ ani fázu hliadky, takže nemení ani jedno číslo.

### R6. Riešenie izby sa nikdy nepíše

Nikam: ani do hlavičky izby, ani do testu, ani do commit message, ani do výstupu
nástroja, ani do chatu. Prejditeľnosť sa dokazuje **solverom a metrikami**
(`par`, `fewestSightings`, ablácie), nikdy prózou ani prehratím.

Toto pravidlo už raz padlo: `npm run roomgen` kedysi vypísal cesty všetkých 18
izieb do terminálu, lebo nástroj na prehrávanie mal rovnakú príponu a čítal tú
istú premennú. Zamknuté natrikrát — iná prípona (`play.tool.ts`), iný config, iná
premenná (`PLAY_OUT`) a odmietnutie zapisovať do repozitára.

**Známa výnimka:** `room01.ts` má postup v hlavičke. Je to tutoriálová izba a je
to vedomé. Druhá taká pribudnúť nesmie.

### R7. `beat()` musí ostať čistá a deterministická

Žiadny `Math.random`, `Date.now`, `performance.now`, žiadne I/O, žiadny globálny
stav. Solver prechádza státisíce stavov a testy sa pýtajú tú istú otázku dvakrát —
oboje stojí na tom, že tá istá izba a tie isté beaty dajú vždy tú istú líšku.

Náhoda patrí do prezentácie (blikanie, dýchanie lampy), nikdy do `beat.ts`,
`patrol.ts`, `bat.ts`, `rules.ts` ani `light.ts`.

### R8. Najviac dve pohyblivé líšky v izbe

Každé `?` rozhodí fázy všetkých líšok. Tri a viac chodiacich líšok = státisíce až
milióny stavov a solver prestane odpovedať (zmerané: 1500 semien s chodiacou
hliadkou = 200 sekúnd, so stojacimi = pár).

`MAX_LAMPS = 8` je z rovnakého dôvodu — každá lampa je bit v stave sveta.

### R9. Necommitovať bez vyzvania

Majiteľ commituje sám. Platí to aj pre `git add`, `git push` a vytváranie vetiev.

---

## 🟠 VAROVANIE — dá sa, ale má cenu

> [!WARNING]
> Tieto zmeny sú v poriadku, ale **niečo za sebou treba dorobiť**. Agent to musí
> povedať dopredu, nie zistiť až keď spadne test.

### W1. Zmena pôdorysu izby

Treba prepočítať a prepísať: `par`, `wants`, `choice`, a znova zbehnúť
`carrots.tests.ts` a `guards.tests.ts`.

Pravidlo tých dvoch testov: **každá mrkva a každá stráž musí meniť nejaké číslo.**
Nečinná mrkva posiela hráča hľadať na zlé miesto; nečinná stráž si pýta pozornosť
zadarmo. Latka je nízko — stačí zmeniť *nejaké* číslo (par, férovosť, alebo cenu
druhej cesty). Nezmeniť žiadne nestačí.

**Jediná registrovaná výnimka:** líška v izbe 14 (Brod). Je vedená ako známa
výnimka práve preto, aby druhá nemohla pribudnúť bez rozhodnutia.

### W2. Nový reťazec na obrazovke

- Musí sa zmestiť do **32 stĺpcov** (ROM font, 8 px na znak, 256 px obrazovka).
- Musí existovať v **oboch jazykoch** (`EN` aj `SK` v `strings.ts`).
- Slovenčina sa píše **bez diakritiky** — ROM font má 96 ASCII glyfov.

### W3. Nové pravidlo na obrazovke `H`

`RULES_TOP + n * RULES_STEP` nesmie naraziť na `RULES_FOOTER` (`title.ts`).
Raz sa to už stalo: pribudlo dvanáste pravidlo a posledný riadok si sadol na
pätičku. `tests/stealth/strings.tests.ts` odvtedy robí tú aritmetiku.

### W4. Nová hovorená nápoveda

- Musí byť v `SPOKEN_RULES` (`strings.ts`) — doc test drží počty, ktoré sa
  spomínajú prózou v dvoch dokumentoch.
- Musí mať **v pivnici kde nastať** (`teaching.tests.ts`). Nápoveda, ktorá sa
  nemá kde spustiť, je mŕtvy kód: reťazec existuje, vetva sa skompiluje, testy sú
  zelené — a hráč to nikdy nepočuje.
- Poradie v `hint()` (`main.ts`) je zámerné: **najprv to, čo sa práve pokazilo**,
  číslo naposledy. V jednom beate sa dá povedať len jedna veta.
- Nápovedy sa **neresetujú pri vstupe do izby**. Pravidlo sa učí raz.

### W5. Nová vrstva kreslená každý snímok

Čokoľvek statické, čo by sa prekresľovalo každý snímok, ide do **layer cache**
(zx-kit `createLayerCache`). zx-kitové `drawBitmap` maľuje `fillRect` na pixel —
pre sprity v poriadku, pre plnú obrazovku katastrofa (raz to už bolo ~30 000
`fillRect` na snímok a Firefox si sadol).

Room cache sa dnes prekresľuje **len keď zhasne lampa alebo sa otvorí mreža**
(kľúčuje `scene.lamps` + `scene.pulled`). Čokoľvek nové, čo sa má zapiecť do
obrázku izby, musí do toho kľúča pribudnúť — inak ostane visieť starý obrázok.

### W6. Nová klávesa

Obsadené sú: `Z X U C R H M S P B L`, číslice `0`–`9`, `[` `]`, medzerník, `Esc`,
`Enter`, šípky/WASD. V skúšobni zvukov (`S`) navyše `F G H` (stlmiť jeden hlas
hukotu), `J` (všetky späť) a `Q` (odísť). Na pade sú **tri tlačidlá a všetky tri sa
volajú po niečom inom**: `A`/flag = hod, `Start`/pause = uši, `Y`/debug = čakanie.
Štvrté sloveso na pade už nie je z čoho požičať.

### W7. Zmena tutoriálových izieb

`GUIDED_ROOMS = 2` (`guide.ts`) hovorí, koľko prvých izieb vedie hráča za ruku.
Ukazovateľ berie odpoveď zo **solvera z aktuálnej pozície**, nie zo scenára, takže
je vždy pravdivý — ale `tests/stealth/guide.tests.ts` ho prechádza beat po beate a
drží dve veci: **nikdy neporadí ťah, po ktorom ťa chytia**, a kto ho poslúchne,
prejde izbu **presne na par**. Ak sa zmení poradie izieb alebo ich pôdorys, tento
test to zachytí.

Pozor na jednu vec, ktorá vyzerá ako chyba a nie je: v izbe 2 ukazovateľ **schválne
vedie hráča do `?`**. Tá izba sa nedá prejsť nezbadane (`fewestSightings = 1`), a
práve preto tam hra pri každom `?` povie „? nie je chytenie".

---

## 🟢 BEZPEČNÉ — nedotýka sa pravidiel

- Farby, dlaždice a sprity (`src/art/zx/*.json`, zx-art je zdroj pravdy).
- Zvuk: `playEvents`, hlasitosti, ducking, stereo, hukot. **Zvuk nič nemení** —
  `beat.ts` o ňom nevie. Jediná výnimka je R2 (ambientná voda je zvuk, nie pravidlo).
- Svetelné efekty: dýchanie lampy, záblesk, dohorenie žiary, záblesk bordera.
- Ambientná tma **pod** intel vrstvou (viď R3).
- Texty, preklady, obrazovky (titulka, príbeh, koniec, mapa) — pri dodržaní W2/W3.
- Layer cache, výkonové optimalizácie, refaktory bez zmeny správania.
- Poradie izieb v `rooms/index.ts` (ale nie ich id — viď R4).
- Tutoriál a nápovedy v izbách 1–2: čítajú zo solvera, nemenia ho.

---

## Ako sa tento súbor kontroluje

`tests/stealth/rulebook.tests.ts` pripína každú konštantu z R1 na jej dnešnú
hodnotu a pri páde vypíše, čo sa práve rozbilo. Pripína aj R2 (voda nie je hluk
pre líšky), R3 (chytenie len pri `forward === 1 && lateral === 0`) a R7
(`beat()` je deterministická — tá istá izba a akcia dvakrát dá ten istý svet).

```bash
npm test -- rulebook
```

Ak tento súbor prestane sedieť s kódom, spadne ten test — nie tento dokument.

---

*Naposledy overené proti kódu: 2026-09-13. Baseline: 492 testov, 18 izieb.*

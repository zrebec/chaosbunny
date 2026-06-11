# chaosBunny — feel, svetlo a chrobáky do hlavy

> Večerné čítanie. Časť I je praktická príručka ku konštantám v `src/config.ts` —
> čo ktorá robí, prečo ju meniť alebo nemeniť. Časť II sú chrobáky: dlhšie úvahy
> o tom, čím vlastne je „modern Speccy" look a kam sa dá posunúť — vrátane vecí,
> ktoré by si zaslúžili byť feature v zx-kite, nie hackom v jednej hre.

---

## Časť I — Konštanty na hranie

Všetko nižšie žije v `src/config.ts`. Po zmene stačí uložiť — Vite hot-reload. Pri
fyzike si po hraní pusti `npm test`: reachability linter ti povie, či si si
nerozbil level.

### Svetlo a tma

**`LIGHTING_MODE` = `'smooth'`** — či hra štartuje v tme (`'smooth'`) alebo
plne osvetlená (`'none'`). V hre prepína `L`. Meniť netreba — je to len štartový
stav, nie schopnosť.

**`CAVE_AMBIENT_DARKNESS` = `0.8`** — ako tmavá je jaskyňa tam, kam nedosiahne
žiadne svetlo. 0 = žiadna tma, 1 = absolútna čierna. Toto je **najsilnejší
atmosférický dial v hre** — rozdiel medzi „útulná jaskyňa" (0.5) a „bojím sa
skočiť" (0.9). Pri 1.0 stratíš siluety úplne; design brief hovorí, že level 1
tmy = „silhouette only", takže pod 1.0 ostať chceš. Meniť: **áno, smelo** — ale
mysli na férovosť: čím tmavšie, tým viac práce musia odviesť fakle a tým
dôležitejší bude lampáš (tools nápad).

**`TORCH_LIGHT_RADIUS` = `56`** — dosah svetla fakle v pixeloch (pri 256 px
širokej obrazovke je 56 ≈ pätina šírky). Meniť: áno — ale spolu s rozmiestnením
fakieľ v leveli. Veľký radius = menej tmy = menej napätia; malý radius = ostrovy
svetla a tma medzi nimi sa stane prekážkou. Zaujímavý experiment: malý radius
(36–40) + viac fakieľ v leveli = „svetelné schody".

**`TORCH_LIGHT_INTENSITY` = `0.95`** — koľko ambientnej tmy fakľa vyreže vo
svojom strede (0–1). Pri 1.0 je stred fakle úplne „čistý", pri 0.7 ostáva aj pod
fakľou závoj šera. Meniť: jemne. Zníženie na ~0.8 dá jaskyni jednotný „nikde nie
je úplné bezpečie" tón — pekné pre hlbšie biomy.

**`TORCH_PULSE_RADIUS` = `0.6`** — o koľko (zlomok základu) dýcha *polomer*
svetla. Tvojich 0.6 znamená kmit ±60 % — radius behá medzi ~22 a ~90 px, to už
nie je flicker ale „jaskyňa dýcha". Krásne strašidelné, ale over si, že pri
minime stále vidíš platformy, ktoré pri maxime vidno — pulzovanie nesmie
rozhodovať o smrti. Bezpečný rozsah na hranie: 0.1–0.3 = živý oheň, 0.4+ =
dramatický efekt (vhodný možno pre špeciálne miestnosti, nie celú hru).

**`TORCH_PULSE_INTENSITY` = `0.09`** — o koľko klesá *jas* v rytme toho istého
pulzu (max prepad = 2× hodnota, teda 18 %). Drž nízko (0.05–0.12); jas robí
jemnosť, radius robí drámu. Keď zvýšiš oboje naraz, svetlo „žmurká" — pôsobí
skôr pokazene než horiaco.

**`TORCH_PULSE_SPEED` = `0.6`** — **nová konštanta** (tvoja požiadavka): tempo
pulzu. Násobí obe sínusové frekvencie naraz, takže charakter plameňa ostáva,
mení sa len rýchlosť: 1 = pôvodné tempo (periódy ~480 ms + ~1340 ms), 0.5 =
polovičné (pokojná pahreba), 0.3 = takmer meditatívne, 2 = panika/víchor.
S tvojím veľkým `TORCH_PULSE_RADIUS` je spomalenie presne správny ťah — pomalé
veľké dýchanie pôsobí organicky, rýchle veľké by epilepticky.

**`TORCH_LIGHT_BANDS` = `0`** — posterizácia svetla do N tvrdých sústredných
prstencov. 0 = hladký gradient (moderný), 4 = jasne retro prstence, 6 =
jemnejšie, 8+ sa zlieva späť do smooth. Toto je tvoj hlavný prepínač
„2026 vs. 1988" — vyskúšaj 4 a pozri sa na fakľu minútu. Viac v Časti II.

> Mimo configu, ak by ťa chytilo: kontrolné body falloff krivky (`FALLOFF` v
> `src/world/lighting.ts` — tvar prechodu svetla do tmy), parametre plameňových
> particles (`emitTorchFire` v `src/entities/torch.ts` — count/speed/life),
> polomer mesačného svetla (150 v `moonLight`) a tlmený jas mesiaca pred
> vyzbieraním mrkiev (0.3 v `main.ts`). Povedz a vytiahnem ich.

### Stena a pozadie

**`BG_BRICK_INK` = `C.BLUE`** — farba tehál parallax steny. Meniť: áno, toto je
čistá nálada. Pravidlo, ktoré sa oplatí dodržať: pozadie **ne-bright** farby
(`C.BLUE`, `C.RED`, `C.MAGENTA`…), popredie bright (`C.B_*`) — vznikne hĺbka
zadarmo a je to presne speccy logika (BRIGHT bit = popredie). `C.RED` = pekelné
podzemie, `C.MAGENTA` = mystika, `C.GREEN` = zarastené. Biome za jednu konštantu.

**`BG_DECO_INK` = `C.WHITE`** — farba reťazí a lebiek. `C.WHITE` (nie bright)
je zámerne „zaprášená kosť". Meniť: ak chceš, aby dekorácie viac/menej kričali.

**`BG_PARALLAX` = `0.5`** — akou rýchlosťou sa stena hýbe voči kamere (0 =
stojí, 1 = prilepená na hru). 0.5 je učebnica. Nižšie (0.3) = stena pôsobí
vzdialenejšie, jaskyňa väčšia. Meniť: jemne, ±0.2. Pozor: 0 aj 1 zabijú efekt.

**`BG_DECO_DENSITY` = `0.04`** — zlomok buniek steny s dekoráciou (4 %). Meniť:
pokojne, 0.02–0.08. Viac než ~0.1 prestane byť dekorácia vzácna a začne byť
tapeta.

**`BG_GRIT` = `0.25`** — zlomok pixelov steny „vylámaných" do čiernej. 0 =
čistá novostavba, 0.25 (tvoje) = poriadne ošarpané, 0.4+ = ruina, stena sa
začne strácať. Deterministické (vždy tá istá stena). Meniť: áno — toto je tá
„rozbitosť", ktorú si chcel; hraj sa, kým tehly nestratia čitateľnosť.

### Fyzika (objekt `physics`)

Tu plati jedno veľké varovanie: **skok je zmluva s levelom.** Z `gravity` +
`jumpVelocity` sa derivuje `JUMP_APEX_PX` (výška skoku ~47 px) a `JUMP_REACH_PX`
a level linter (`tests/level.tests.ts`) podľa nich kontroluje, či je každá
platforma dosiahnuteľná. Keď fyziku zmeníš, **pusti `npm test`** — buď prejde
(level je stále fér), alebo ti vymenuje platformy, ktoré si práve odrezal.
To je sloboda, nie zákaz: pokojne ladiť, linter ťa chráni.

**`gravity` = `0.0017`** — gravitácia pri stúpaní. Menšia = vznášavejší,
„mesačný" skok; väčšia = ráznejší. Spolu s `jumpVelocity` definuje celý oblúk.

**`fallGravity` = `0.0030`** — gravitácia pri páde, zámerne ťažšia než pri
stúpaní (pomer ~1.8). Toto je tajná ingrediencia dobrého platformer feelu:
vyletíš plavne, spadneš rázne. Pomer 1.5–2.2 je sladké pásmo; 1.0 = plávajúci
balón, 3+ = tehla.

**`maxSpeed` = `0.12`** — maximálna bežecká rýchlosť (~120 px/s — obrazovku
prebehneš za ~2 s). Meniť opatrne: rýchlejší králik potrebuje širšie platformy
(linter to postráži) a viac reakčného času hráča.

**`accelGround` = `0.0015`** / **`frictionGround` = `0.0024`** — ako rýchlo sa
rozbieha / zastavuje. Vyššie oboje = „prilepený" arkádový pocit (Manic Miner mal
prakticky okamžité), nižšie = šmykľavý ľad. Pomer brzdy k rozbehu > 1 znamená
zastavenie je ostrejšie než rozbeh — dobré pre presné skoky.

**`accelAir` = `0.0008`** — riadenie vo vzduchu (polovica zemného). Menej =
skok je záväzok (retro, Jump King DNA), viac = moderná korekcia v lete. Toto je
jedna z najcitlivejších feel konštánt vôbec — skús 0.0004 a 0.0012 a ucítiš
rozdiel okamžite.

**`jumpVelocity` = `-0.40`** — počiatočná rýchlosť skoku (mínus = hore). Spolu s
gravity dáva výšku ~47 px (apex). Meniť: cez linter, viď vyššie.

**`jumpCut` = `0.45`** — keď pustíš skok počas stúpania, rýchlosť sa zreže na
45 % → variabilná výška skoku. Nižšie číslo = väčší rozdiel medzi ťuknutím a
podržaním. 0.3–0.6 je rozumné pásmo; 1.0 = výška sa nedá ovládať (úplné retro —
Manic Miner mal fixný skok… aj to je legitímna voľba, keby si chcel).

**`maxFallSpeed` = `0.7`** — strop rýchlosti pádu. Chráni čitateľnosť (pri
nekonečnom zrýchľovaní by si v hlbokej šachte nestihol reagovať) aj koliízie.

**`coyoteMs` = `100`** / **`jumpBufferMs` = `120`** — dve ticho najdôležitejšie
čísla pre pocit „hra je fér": coyote = ešte 100 ms po zbehnutí z hrany ti skok
zoberie; buffer = skok stlačený 120 ms pred dopadom sa zapamätá. Hráč ich nikdy
neuvidí, ale cíti ich ako „presné ovládanie". 80–150 ms je štandard; 0 = poctivé
retro, ktoré dnes pôsobí ako bug.

**`climbSpeed` = `0.06`** / **`crouchSpeed` = `0.05`** — rebrík a plazenie.
Pomalšie plazenie robí z crouch-gates vedomé rozhodnutie, nie alternatívnu
cestu. Meniť: jemne.

### Ostatné

**`FLOOR_TARGET` = `11`** — koľko poschodí HUD počíta ako cieľ. Zmeň, keď
narastie level (B1 v master scoreboarde počíta s 20+).

**`MUSIC_LOOPS_PER_TRACK` = `2`** — po koľkých slučkách sa hudba pretočí na
ďalší track (shuffle-bag). 0 = vypnuté auto-točenie.

**`CLASH_RABBIT_INK` = `C.B_CYAN`** / **`CARROT_INK` = `C.B_YELLOW`** — identita
králika v clash móde a farba strely. Meniť: je to vkus; bright cyan na čiernej
je veľmi „speccy hero".

**`GAME_WIDTH/HEIGHT` = 256×192, `CANVAS_SCALE` = 4** — **nemeniť.** 256×192 je
rozhodnutie (viď `docs/resolution.sk.md`) a `CANVAS_SCALE` je kandidát na
zrušenie (duplikuje zx-kit `SCALE`, ROADMAP #1).

---

## Časť II — Chrobáky do hlavy (večerná verzia)

### 1. Anatómia „toho moderného" — prečo smooth svetlo kazí dojem, aj keď je krásne

Keď sa pozrieš na smooth svetlo a niečo ti vraví „toto nie je ono", oplatí sa
rozobrať, *čo presne* to vraví. Sú to tri nezávislé veci:

**Po prvé: nekonečno odtieňov.** Speccy nemal priehľadnosť. Mal 15 farieb a
BRIGHT bit. Každý prechod medzi svetlom a tmou musel byť buď skok (iná farba),
alebo ilúzia (dither — striedanie pixelov, ktoré oko zmieša). Radiálny gradient
s 256 úrovňami alfy je teda doslova *najmodernejší jednotlivý prvok* na celej
obrazovke — všetko ostatné (sprity, dlaždice, paleta) pravidlá dodržiava, len
svetlo nie. Preto bije do očí: nie je škaredé, je *cudzie*.

**Po druhé: dokonalý kruh.** Kruh so spojitým úbytkom jasu je podpis CSS éry.
8-bitové svetlo — tam, kde vôbec existovalo — malo tvar buniek, dlaždíc, alebo
nepravidelný okraj ditheru. Oko to číta podvedome: hladká kružnica = web,
zubatý okraj = hardvér.

**Po tretie — a tu pozor, je to chyták: svetlo neprechádza geometriou.** Naša
fakľa svieti *cez* platformy. Moderný engine by kričal „shadow casting!". Lenže
8-bitové hry oklúziu neriešili nikdy — a čo je dôležitejšie, raycast tiene by
hru posunuli *ešte ďalej* od Speccy, nie bližšie. Toto je miesto, kde je
správna odpoveď nerobiť nič. Zapíš si to ako anti-úlohu: keď ťa raz v noci
napadne „a čo keby svetlo vrhalo tiene od platforiem" — nie. To je pasca.

A ešte štvrtá vec, ktorá nie je vlastnosť svetla, ale kontextu: **dobové hry
nemali tmu takmer vôbec.** Manic Miner je celý rovnomerne osvetlený. Atic Atac,
Sabre Wulf — žiadny lighting. Tma ako mechanika je *koncepčne moderná* — my ju
do Speccy fantázie *importujeme*. To je v poriadku (presne to je „bez Speccy HW
limitov"), ale znamená to, že nemáš dobový vzor, ktorý by si kopíroval. Máš
slobodu — a teda zodpovednosť — vymyslieť, ako by tma *bola vyzerala*, keby ju
vtedy boli vedeli urobiť. To je celý zmysel nasledujúcich kapitol.

### 2. BRIGHT-bit tma — najväčší chrobák, kit-level feature

ZX Spectrum mal na každú 8×8 bunku atribút: INK (farba popredia), PAPER (farba
pozadia), BRIGHT (celá bunka jasnejšia) a FLASH. Z toho vyplýva jediná
*hardvérovo autentická* odpoveď na otázku „ako by Speccy robil tmu":
**tma = zhasnutý BRIGHT bit.**

Predstav si tri svetelné úrovne na bunku:

- **2 — svetlo:** bunka v bright palete (`C.B_YELLOW`, `C.B_CYAN`…) — tak, ako
  hra vyzerá dnes bez tmy.
- **1 — šero:** tá istá bunka, ale ne-bright varianty (`C.YELLOW`, `C.CYAN`…).
  Farby stmavnú, ale ostanú *farbami* — siluety, tvary aj identita prežijú.
- **0 — tma:** bunka čierna (prípadne s dither prechodom na hrane).

Žiadna alfa. Žiadne gradienty. Prechod svetla po obrazovke by skákal po 8×8
bunkách — presne tak „zle", ako by to robil skutočný stroj, a presne preto by to
vyzeralo *správne*.

Technicky je to priesečník dvoch modulov, ktoré zx-kit už má: `attrscreen`
(per-cell atribúty) a `lighting` (per-cell dirty buffer s úrovňami). Chýba
mapovanie `SpectrumColor → jeho ne-bright dvojča` (čistá 15-riadková tabuľka) a
render cesta, ktorá pri kreslení bunky vie „v tejto bunke je svetlo X, prelož
farby cez tabuľku". Nie je to triviálne — kreslenie hry by muselo ísť cez
attribute vrstvu (ako clash mód) — ale `Painter` abstrakcia v
`world/playfield.ts` presne na takéto prepínanie render ciest existuje.

A teraz prečo je to *kit* feature a nie chaosBunny hack: použila by ju každá hra
portfólia. Nautilus — hĺbka ponoru ako BRIGHT prechod (hladina bright, hlbina
ne-bright, dno čierne) namiesto alfy. Minefield — radarový pulz, ktorý na
sekundu „rozsvieti BRIGHT" v okolí. Ice Haul — noc na ceste. A chaosBunny —
jaskyňa, kde fakľa nerobí dieru do čiernej deky, ale *vracia bunkám farbu*.
Ten obraz si nechaj prejsť hlavou pred spaním: svetlo, ktoré nefunguje ako
reflektor, ale ako *spomienka na farbu*.

### 3. Posterizácia a prečo prstence fungujú (`TORCH_LIGHT_BANDS`)

Medzikrok, ktorý už máš v hre. Keď gradient nahradíš 4 prstencami, stane sa
percepčne zaujímavá vec: ľudské oko na hranici dvoch plôch rôzneho jasu vníma
hranu *silnejšie, než fyzicky existuje* (Machove pásy). Prstence preto pôsobia
„nakreslené", zámerné — ako rozhodnutie grafika, nie ako výpočet. A presne to je
rozdiel medzi 8-bit a moderným: 8-bit grafika je súbor *rozhodnutí*, moderná je
súbor *výpočtov*. Posterizácia vracia svetlu autorský rukopis.

Skús večer tri pohľady: `BANDS = 0` (dnešok), `4`, a `4` + `BRIGHT-bit
predstava z kapitoly 2 v hlave. Otázka na zaspávanie: ktorý z nich je „tvoja"
hra?

Drobný experiment navyše, keď budeš pri tom: prstence + vysoký
`TORCH_PULSE_RADIUS` = prstence sa pohybujú ako letokruhy. Môže to byť krásne
alebo rušivé — neviem, naozaj to treba vidieť.

### 4. Dither — stredná cesta, ktorá už v kite leží

zx-kit `lighting` modul (ten, čo Codex odpojil) robí tmu Bayer ditherom:
predpečené 8×8 dlaždice s rastúcou hustotou čiernych pixelov, per-cell dirty
buffer, jeden blit. Je to vizuálne *tretia* odpoveď, medzi smooth a BRIGHT:
svetlo má mäkký priebeh (ako smooth), ale žiadnu alfu — len hustotu pixelov
(ako Speccy). ROADMAP #5 ho drží v zálohe a posledná verzia (s depth gradientom)
je v git histórii na master.

Chrobák na polemiku: dither tma je najlepšia *texitúra* tmy, ale BRIGHT-bit je
najlepší *koncept* tmy. Dajú sa skombinovať — BRIGHT úrovne pre bunky plne vo
svetle/šere/tme a dither len na jednobunkovej hranici medzi nimi. To by mohol
byť finálny „chaosBunny look": tri úrovne farby + zubatá prechodová hrana.
Keby si na toto v spánku našiel názor, je to rovno spec pre zx-kit feature.

### 5. Plameň nie je guľa — tvar svetla

Fakľa horí *nahor*. Skutočné svetlo plameňa je hore jasnejšie a ďalej, dole ho
zrezáva držiak a stena. Náš kruh je perfektne symetrický — ďalší dôvod, prečo
pôsobí ako lampa z IKEA katalógu.

Lacné riešenia, od najlacnejšieho: **(a)** posuň stred svetla o pár pixelov nad
plameň (1 riadok — `y - 4`); **(b)** dve svetlá na fakľu — malé jasné v plameni
+ veľké slabé vyššie (renderer to už podporuje, `torchLights` proste vráti 2×N
svetiel — žiadna nová infra!); **(c)** elipsa (radiálny gradient s `scale(1,
1.3)` transformáciou — trochu viac kódu v `lighting.ts`). Možnosť (b) je
podozrivo dobrá za svoju cenu: prirodzene vytvorí jasné jadro a mäkkú aureolu a
pulzovať môžu mierne odlišne (jadro rýchlo, aureola pomaly) — plameň + žiara.

### 6. CRT vrstva — „MAME kiosk" je iná os než svetlo

Tvoje prirovnanie k MAME arkádam je presné a oplatí sa ho rozložiť: MAME look
nie je vlastnosť *hry*, je to vlastnosť *monitora*. Scanlines (máš), bloom —
jasné pixely presvecujú do okolia (fosfor žiari), vignette — rohy tienidla,
prípadne jemná aperture grille (zvislé RGB pásiky). Kľúčové slovo je *jemné*:
dobrý CRT efekt je ten, ktorý si všimneš až keď ho vypneš.

Architektonicky to patrí do zx-kit (`presentation` modul alebo nový `crt.ts`):
post-process nad finálnym canvasom, hry ho len zapnú. A je tu pekná filozofická
pointa, ktorú si nechaj prejsť hlavou: **CRT vrstva smie byť moderná, lebo
emuluje monitor, nie hru.** Bloom okolo fakle by bol podvod (hra tvrdí, že má
viac farieb, než má); bloom okolo *všetkých* jasných pixelov rovnako je poctivý
(monitor tak svietil naozaj). To je čistá deliaca čiara medzi „modern" a
„speccy": všetko *pod* sklom dodržiava pravidlá stroja, všetko *na* skle smie
byť 2026.

Mimochodom — skutočné CRT robilo zadarmo aj to, o čo sa teraz snažíme manuálne:
fosfor + maska *zmäkčovali* tvrdé pixely. Tá nostalgia, ktorú hľadáš, je z
veľkej časti nostalgiou za analógovým rozmazaním. Preto môže byť správne, že
smooth svetlo ťa *aj* priťahuje: nie je to zrada Speccy, je to ozvena obrazovky,
na ktorej Speccy bežal.

### 6½. GLOW bit — fosfor ako piaty atribút (ROZHODNUTÉ: cesta B)

> Nočné rozhodnutie ownera, 2026-06-11. Zapísané, aby sa nestratilo.

Z nočnej polemiky o fosfore vzišiel konkrétny návrh: rozšíriť atribút bunky
z `{ink, paper, bright, flash}` o piaty bit — **`glow`**. A boli na stole dve
cesty:

- **Cesta A — glow ako nová plochá farba:** `B_GREEN + glow` = ešte svetlejšia
  zelená, namiešaná do bielej. Lacné, funkčné — a potichu by sme prestali byť
  Speccy a stali sa Amstradom. 22–30 plochých farieb je iná konzola.
  **Zamietnuté.**
- **Cesta B — glow ako emisia (fosfor):** pixel **ostáva** vo svojej farbe
  z pätnástky. GLOW bit ho len označí ako *žiariaci* — a vrstva skla (CRT
  post-process) ho nechá pretiecť do susedov: mäkká aureola na úrovni
  fyzických pixelov monitora. **Vybraté.**

Ownerova formulácia, ktorá to vystihuje lepšie než technický popis: pätnásť
farieb sa „na molekulárnej úrovni — úrovni pixelov skutočného monitora, na
ktorom hráš" rozlieva do okolia. Každý žiariaci pixel do svojho okolia. A tam,
kde sa dve aureoly stretnú a zdieľajú priestor, vzniká „úplne nová farba" —
composite `'lighter'` doslova sčíta RGB kanály, takže modrá aura + ružová aura
= levanduľový opar, ktorý ako plochá farba nikde v hre neexistuje. Oko pritom
stále číta „modrý pixel vedľa ružového", len s dychom okolo.

Prečo je B správne: **plochých 15 farieb ostáva nedotknutých** — pod sklom sa
nezmení nič. „Viac farieb" vzniká len ako *vnem*, na skle, presne tak, ako
vznikal na skutočnom CRT (rozžeravený fosfor nikdy nemal svetlejšiu farbu —
*pretekal*). Je to fantasy rozšírenie v gramatike hardvéru: jeden bit na
kresbu, žiadna alfa, v duchu FLASH bitu, ktorý tam Sinclair dal tiež.

Technická skica (zx-kit, `presentation`/`crt`): druhá offscreen vrstva —
emisívna. Všetko kreslené s `glow` ide normálne do hry *plus* do emisívnej
vrstvy. Raz za frame: lacný blur (downscale + upscale so smoothingom — ideálne
na device rozlíšení, ako scanlines cache, nech je aureola hladká) a prilepenie
cez `globalCompositeOperation = 'lighter'` s nízkou alfou. Dva-tri `drawImage`
navyše za frame.

A sémantika v chaosBunny: **glow majú len veci, ktoré svetlo vyžarujú** —
plameň fakle, mesiac, light crystal, glow snail, letiaca mrkva, zapnutá runa,
aura lampáša. Veci, ktoré sú len osvetlené, nežiaria. GLOW bit tým prestáva byť
efekt a stáva sa slovníkom: na jeden pohľad rozoznáš zdroj svetla od osvetlenej
veci.

### 7. Svetlo ako gameplay — lampáš a spol.

Tvoj tools nápad (mrkva ↔ lampáš) má jeden dôsledok, ktorý stojí za nočné
premyslenie: **zo svetla robí zdroj.** Keď je svetlo schopnosť, dá sa s ním
obchodovať. Pár otázok na polemiku:

- **Má lampáš palivo?** Ak áno, tma sa stáva ekonomikou (mrkvy = muriva +
  palivo?). Ak nie, je to čistý stance-switch (bezpečie vs. obrana). Druhá
  možnosť je jednoduchšia a férovejšia — ale prvá je atmosférickejšia.
- **Reagujú nepriatelia?** Design brief to už predpokladá: mole svetlo
  *priťahuje*, root worm sa pred svetlom *sťahuje*, dripper padá *po* svetelnom
  triggri. Lampáš potom nie je len videnie — je to zvonček na večeru aj
  odpudzovač, podľa toho, kto je nablízku. To je presne „curl & retreat ako
  mechanika" (B5) prenesené na svetlo.
- **Pulzuje aura lampáša?** Áno — a tu je pointa: keď bude pulzovať *tým istým*
  `torchPulse` systémom ako fakle, hra dostane jednotný „dych ohňa" naprieč
  všetkými svetlami. Konzistencia robí štýl.
- **Glow carrot / glow snail** zo spritového briefu sú hotové námety: slimák =
  *pohyblivé* svetlo, ktoré ti odhaľuje platformy, ale ublíži na dotyk — svetlo,
  ktoré musíš nasledovať, ale nesmieš chytiť. To je úžasná mechanika zadarmo.

### 8. Tma ako dramaturgia — biomy a hĺbkový gradient

Codex pri prepise zmazal depth gradient (povrch svetlejší, dno tmavšie) — a
vlastne tým uvoľnil miesto pre lepšiu verziu tej istej myšlienky: **per-biome
ambient.** Až prídu biomy (B14), `CAVE_AMBIENT_DARKNESS` prestane byť globál a
stane sa vlastnosťou vrstvy: štartová nora 0.5 (útulná), stredné jaskyne 0.7,
hlbiny 0.9 + vzácne fakle, povrch pri mesiaci 0.3. Klesanie tmy nahor potom
nebude lineárna funkcia, ale *level dizajn* — a hráč ju bude čítať ako príbeh
(„svetlejšie = blízko domov"), nie ako efekt. Mesiac ako maják na konci je už v
hre — tma okolo neho je jeho zosilňovač. Čím tmavšia posledná šachta, tým väčšia
úľava z mesiaca. Hrôza je lacná, úľava je drahá — tma je nástroj na výrobu úľavy.

### 9. Zvuk a svetlo spolu — synestézia za pár riadkov

Chrobák, ktorý možno nikto nečaká: fakľa *počuteľne* praská. `torchPulse` je
čistá funkcia — ten istý signál, ktorý hýbe svetlom, vie spúšťať beeper „crack"
keď pulz prepadne pod prah (povedzme < −0.7). Výsledok: svetlo a zvuk sú
*fyzicky ten istý jav*, čo mozog okamžite číta ako „skutočný oheň". Náklad:
~10 riadkov v sfx + throttle, nech to nepraská každý frame. Rovnaká myšlienka
funguje pre lampáš (tichý sykot úmerný aure?) a mesiac (žiadny zvuk — ticho je
jeho identita). Ak by si niekedy chcel jeden „wow" detail do videa/demo — toto
je on.

### 10. Čo z toho sú zx-kit features (zoznam na triezve ráno)

| Nápad | Modul | Kto ďalší by to použil | Veľkosť |
|---|---|---|---|
| BRIGHT-bit darkness (3 úrovne po bunkách) | `lighting` × `attrscreen` | Nautilus (hĺbka), Minefield (radar), Ice Haul (noc) | M–L |
| Dither hrana + BRIGHT úrovne (hybrid) | `lighting` | tie isté | M (po BRIGHT) |
| CRT post-process: bloom + vignette (+ grille) | `presentation` / `crt` | všetky hry, landing demo (K5!) | M |
| **GLOW bit — emisívny piaty atribút (cesta B, rozhodnuté)** | `presentation`/`crt` (+ attribute API) | chaosBunny (fakle, mesiac, lampáš), Nautilus (sonar blipy), Minefield (radar), demo K5 | M |
| Banded falloff helper (posterizácia) | `lighting` | hotové v chaosBunny, zovšeobecniť až keď to chce druhá hra | S |
| Viac-svetiel-na-zdroj (jadro + aureola) | žiadny — vzor, nie feature | každá hra so svetlom | XS (vzor) |

Poradie, keby som mal radiť: nič z toho *teraz* — teraz je na rade obsah (B1,
20 poschodí). Ale BRIGHT-bit darkness si zaslúži miesto v zx-kit backlogu hneď
vedľa K7, lebo je to feature, ktorá definuje identitu kitu: „lighting, ktorý by
na Speccy naozaj mohol existovať". A flagship demo (K5) by ňou malo čo ukázať.

### 11. Záver — pravidlá a slobody

Mantra „reviving the ZX Spectrum without the Speccy HW limits" potrebuje
deliacu čiaru, inak sa rozpustí. Návrh, s ktorým môžeš v hlave polemizovať:

**Pravidlá (Speccy):** paleta 15 farieb + BRIGHT logika, 8×8 bunka ako duch
v pozadí (clash mód, dither, prípadná BRIGHT tma), 256×192, beeper + AY,
pixel-perfect kolízie.

**Slobody (modern):** plynulosť pohybu (sub-pixel fyzika, 60 fps), počet
objektov, férovosť (coyote, buffer, žiadna instant smrť), *koncepty*, ktoré
vtedy nešli (tma ako mechanika, parallax) — ale vykonané dobovými prostriedkami.

**Sklo (CRT):** smie byť moderné, lebo emuluje monitor, nie stroj.

Smooth svetlo dnes sedí v kategórii „sloboda", ale vykonané *moderným*
prostriedkom (alfa gradient). Celá cesta z Časti II je o tom presunúť výkon na
dobové prostriedky (prstence → dither → BRIGHT) bez straty konceptu. Nemusíš
prejsť celú — každý krok je samostatne obhájiteľný. A `L` klávesa ti vždy
ukáže, čo si vlastne vybral.

Dobrú noc. 🐰🌙

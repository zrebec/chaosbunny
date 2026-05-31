# AGENTS.md — chaosBunny Implementation Addendum

## Mission

Extend chaosBunny into a procedural, tilemap-based, pixel-perfect cave platformer using `zx-kit`.

This document defines the initial sprite atlas, procedural world assumptions, enemy list, puzzle objects, and implementation rules.

## Non-negotiable rules

1. Use pixel-perfect masks for final collision.
2. Never use AABB as the final hit decision.
3. Use AABB only for broad-phase filtering.
4. A pickup is collected only if masks overlap.
5. A projectile hits only if masks overlap.
6. Enemy damage happens only if masks overlap.
7. The carrot projectile is exactly one pixel row tall.
8. Enemies do not die; they retreat, curl, hide, sleep, or deactivate.
9. Use AY for background music.
10. Use beeper for SFX.
11. Use `pickLocale()` for all user-visible text.
12. The world must be compatible with procedural room generation.

## Sprite implementation format

Store text art as source data first.

Example helper:

```ts
type SpriteRows = readonly string[]

export function rowsToMaskRows(rows: SpriteRows): string[] {
  return rows.map((row) =>
    row.replace(/[^.]/g, 'X')
  )
}
```

Recommended convention:

```ts
export const rabbitSideIdleA = createBitmapFromRows(rowsToMaskRows(RABBIT_SIDE_IDLE_A))
export const rabbitSideIdleAMask = bitmapPixelMask(rabbitSideIdleA)
```

If the renderer later supports symbol-to-color mapping, keep the original multi-symbol rows. For masks, treat every non-dot character as solid.

## Player sprites

```ts
export const RABBIT_SIDE_IDLE_A = [
  '........XX..............',
  '.......XPPX.............',
  '......XPPPPX............',
  '......XPPPBX............',
  '.......XBBBX............',
  '........XBBX............',
  '.........XBX............',
  '.....XXXXXXXXX..........',
  '....XBBBBBBBBBX.........',
  '...XBBBWWBBBBBBX........',
  '...XBBWWWWBBBBBX........',
  '..XBBBWWWWBBBBBBX.......',
  '..XBBBBWBBBWBBBBX.......',
  '..XBBBBBBBBBBBBBX.......',
  '...XBBBBBBBBBBBX........',
  '....XBBBBBBBBBX.........',
  '.....XBBBBBBBX..........',
  '.....XXBBBBXX...........',
  '....XBBX..XBBX..........',
  '...XBBX....XBBX.........',
  '...XBX......XBX.........',
  '....X........X..........',
  '........................',
  '........................',
] as const

export const RABBIT_SIDE_IDLE_B = [
  '.......XX...............',
  '......XPPX..............',
  '.....XPPPPX.............',
  '.....XPPPBX.............',
  '......XBBBX.............',
  '.......XBBX.............',
  '........XBX.............',
  '.....XXXXXXXXX..........',
  '....XBBBBBBBBBX.........',
  '...XBBBWWBBBBBBX........',
  '...XBBWWWWBBBBBX........',
  '..XBBBWWWWBBBBBBX.......',
  '..XBBBBWBBBWBBBBX.......',
  '..XBBBBBBBBBBBBBX.......',
  '...XBBBBBBBBBBBX........',
  '....XBBBBBBBBBX.........',
  '.....XBBBBBBBX..........',
  '.....XXBBBBXX...........',
  '....XBBX..XBBX..........',
  '...XBBX....XBBX.........',
  '...XBX......XBX.........',
  '....X........X..........',
  '........................',
  '........................',
] as const

export const RABBIT_WALK_A = [
  '........XX..............',
  '.......XPPX.............',
  '......XPPPPX............',
  '......XPPPBX............',
  '.......XBBBX............',
  '........XBBX............',
  '.........XBX............',
  '.....XXXXXXXXX..........',
  '....XBBBBBBBBBX.........',
  '...XBBBWWBBBBBBX........',
  '...XBBWWWWBBBBBX........',
  '..XBBBWWWWBBBBBBX.......',
  '..XBBBBWBBBWBBBBX.......',
  '..XBBBBBBBBBBBBBX.......',
  '...XBBBBBBBBBBBX........',
  '....XBBBBBBBBBX.........',
  '.....XBBBBBBBX..........',
  '....XXBBBBBXX...........',
  '...XBBX....XBBX.........',
  '..XBBX......XBX.........',
  '..XBX.......XBX.........',
  '...X.........X..........',
  '........................',
  '........................',
] as const

export const RABBIT_WALK_B = [
  '........XX..............',
  '.......XPPX.............',
  '......XPPPPX............',
  '......XPPPBX............',
  '.......XBBBX............',
  '........XBBX............',
  '.........XBX............',
  '.....XXXXXXXXX..........',
  '....XBBBBBBBBBX.........',
  '...XBBBWWBBBBBBX........',
  '...XBBWWWWBBBBBX........',
  '..XBBBWWWWBBBBBBX.......',
  '..XBBBBWBBBWBBBBX.......',
  '..XBBBBBBBBBBBBBX.......',
  '...XBBBBBBBBBBBX........',
  '....XBBBBBBBBBX.........',
  '.....XBBBBBBBX..........',
  '.....XXBBBBBXX..........',
  '....XBX....XBBX.........',
  '....XBX......XBBX.......',
  '....XBX.......XBX.......',
  '.....X.........X........',
  '........................',
  '........................',
] as const

export const RABBIT_JUMP = [
  '........XX..............',
  '.......XPPX.............',
  '......XPPPPX............',
  '......XPPPBX............',
  '.......XBBBX............',
  '........XBBX............',
  '.....XXXXXXXXX..........',
  '....XBBBBBBBBBX.........',
  '...XBBBWWBBBBBBX........',
  '..XBBWWWWBBBBBBBX.......',
  '..XBBBWWWWBBBBBBX.......',
  '..XBBBBWBBBWBBBBX.......',
  '..XBBBBBBBBBBBBBX.......',
  '...XBBBBBBBBBBBX........',
  '....XBBBBBBBBBX.........',
  '.....XBBBBBBBX..........',
  '....XBBX..XBBX..........',
  '...XBBX....XBBX.........',
  '..XBBX......XBBX........',
  '.XBBX........XBBX.......',
  '.XBX..........XBX.......',
  '..X............X........',
  '........................',
  '........................',
] as const

export const RABBIT_CROUCH = [
  '........................',
  '........................',
  '......XX.........XX.....',
  '.....XPPX.......XPPX....',
  '.....XPPPX.....XPPPX....',
  '......XBBBXXXXXBBBX.....',
  '....XBBBBBBBBBBBBBBX....',
  '...XBBBWWBBBBBBWWBBBX...',
  '..XBBWWWWBBBBWWWWBBBX...',
  '..XBBBBWBBBBBBWBBBBBX...',
  '...XBBBBBBBBBBBBBBBX....',
  '....XBBBBBBBBBBBBBX.....',
  '.....XXBBBBBBBBBXX......',
  '....XBBX.......XBBX.....',
  '...XBBX.........XBBX....',
  '........................',
] as const

export const RABBIT_SHOOT = [
  '........XX..............',
  '.......XPPX.............',
  '......XPPPPX............',
  '......XPPPBX............',
  '.......XBBBX............',
  '........XBBX............',
  '.........XBX............',
  '.....XXXXXXXXX..........',
  '....XBBBBBBBBBX.........',
  '...XBBBWWBBBBBBX........',
  '...XBBWWWWBBBBBX........',
  '..XBBBWWWWBBBBBBXXXX....',
  '..XBBBBWBBBWBBBBXCCX....',
  '..XBBBBBBBBBBBBBXXXX....',
  '...XBBBBBBBBBBBX........',
  '....XBBBBBBBBBX.........',
  '.....XBBBBBBBX..........',
  '.....XXBBBBXX...........',
  '....XBBX..XBBX..........',
  '...XBBX....XBBX.........',
  '...XBX......XBX.........',
  '....X........X..........',
  '........................',
  '........................',
] as const

export const RABBIT_FRONT_IDLE = [
  '........XX........XX..........',
  '.......XPPX......XPPX.........',
  '......XPPPPX....XPPPPX........',
  '......XPPPPX....XPPPPX........',
  '.......XBBBX....XBBBX.........',
  '........XBBX....XBBX..........',
  '.........XBX....XBX...........',
  '......XXXXXXXXXXXXXXXX........',
  '....XXBBBBBBBBBBBBBBBBXX......',
  '...XBBBBBBBBBBBBBBBBBBBBX.....',
  '..XBBBBBWWBBBBBBBBWWBBBBBX....',
  '..XBBBBWWWWBBBBBBWWWWBBBBX....',
  '..XBBBBWWWWBBBBBBWWWWBBBBX....',
  '..XBBBBBWWBBBBBBBBWWBBBBBX....',
  '..XBBBBBBBBBBPPBBBBBBBBBBX....',
  '...XBBBBBBBBBPPBBBBBBBBBX.....',
  '....XBBBBBBBBBBBBBBBBBBX......',
  '.....XBBBBBBBBBBBBBBBBX.......',
  '......XBBBBBWWWWBBBBBX........',
  '......XBBBBWWWWWWBBBBX........',
  '......XBBBBWWWWWWBBBBX........',
  '.......XBBBWWWWWWBBBX.........',
  '........XBBBBBBBBBBX..........',
  '.........XXBBBBBBXX...........',
  '........XBBX....XBBX..........',
  '.......XBBX......XBBX.........',
  '......XBBX........XBBX........',
  '......XBX..........XBX........',
  '.......X............X.........',
  '................................',
  '................................',
  '................................',
] as const

export const RABBIT_BORED_FRONT = [
  '........XX........XX..........',
  '.......XPPX......XPPX.........',
  '......XPPPPX....XPPPPX........',
  '......XPPPPX....XPPPPX........',
  '.......XBBBX....XBBBX.........',
  '........XBBX....XBBX..........',
  '.........XBX....XBX...........',
  '......XXXXXXXXXXXXXXXX........',
  '....XXBBBBBBBBBBBBBBBBXX......',
  '...XBBBBBBBBBBBBBBBBBBBBX.....',
  '..XBBBBBKBBBBBBBBBBKBBBBX.....',
  '..XBBBBKKKBBBBBBBBKKKBBBX.....',
  '..XBBBBBKBBBBBBBBBBKBBBBX.....',
  '..XBBBBBBBBBBPPBBBBBBBBBX.....',
  '..XBBBBBBBBBPPPPBBBBBBBBX.....',
  '...XBBBBBBBBBBBBBBBBBBBBX.....',
  '....XBBBBBBBBBBBBBBBBBBX......',
  '.....XBBBBBBBBBBBBBBBBX.......',
  '......XBBBBBWWWWBBBBBX........',
  '......XBBBBWWWWWWBBBBX........',
  '......XBBBBWWWWWWBBBBX........',
  '.......XBBBWWWWWWBBBX.........',
  '........XBBBBBBBBBBX..........',
  '.........XXBBBBBBXX...........',
  '........XBBX....XBBX..........',
  '.......XBBX......XBBX.........',
  '......XBBX........XBBX........',
  '......XBX..........XBX........',
  '.......X............X.........',
  '................................',
  '................................',
  '................................',
] as const
```

## Projectile and pickup sprites

```ts
export const CARROT_SHOT = [
  'CCCC....',
] as const

export const CARROT_PICKUP = [
  '................',
  '..........GG....',
  '.........GGG....',
  '........GGG.....',
  '.......GG.......',
  '......CCC.......',
  '.....CCCCC......',
  '....CCCCCCC.....',
  '....CCCCCCC.....',
  '.....CCCCC......',
  '.....CCCCC......',
  '......CCC.......',
  '......CCC.......',
  '.......C........',
  '................',
  '................',
] as const

export const GLOW_CARROT = [
  '......YYYY......',
  '....YY....YY....',
  '...Y........Y...',
  '..Y....GG....Y..',
  '..Y...GGG....Y..',
  '..Y..CCC.....Y..',
  '..Y.CCCCC....Y..',
  '..YCCCCCCC...Y..',
  '..YCCCCCCC...Y..',
  '..Y.CCCCC....Y..',
  '..Y..CCC.....Y..',
  '..Y..CCC.....Y..',
  '...Y..C.....Y...',
  '....YY....YY....',
  '......YYYY......',
  '................',
] as const
```

## Enemy sprites

```ts
export const SPIDER_DESCEND = [
  '.......S........',
  '.......S........',
  '.......S........',
  '.......S........',
  '.....XXXXX......',
  '....XXXXXXX.....',
  '...XXKXXXKXX....',
  '...XXXXXXXXX....',
  '..X.X.XXX.X.X...',
  '.X..X.XXX.X..X..',
  '....XXXXXXX.....',
  '.....XXXXX......',
  '......XXX.......',
  '.....X...X......',
  '....X.....X.....',
  '................',
] as const

export const SPIDER_CURLED = [
  '................',
  '................',
  '.....XXXXX......',
  '...XXXXXXXXX....',
  '..XXXXXXXXXXX...',
  '..XXXKXXXKXXX...',
  '..XXXXXXXXXXX...',
  '...XXXXXXXXX....',
  '....XXXXXXX.....',
  '.....XXXXX......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const LADYBUG_ENEMY = [
  '................',
  '.....XXXXXX.....',
  '...XXRRRRRRXX...',
  '..XRRKRRRRKRRX..',
  '.XRRRRRRRRRRRRX.',
  '.XRRRRKRRKRRRRX.',
  '.XRRRRRRRRRRRRX.',
  '.XRRRKRRRRKRRRX.',
  '..XRRRRRRRRRRX..',
  '...XXRRRRRRXX...',
  '.....XXXXXX.....',
  '....X......X....',
  '...X........X...',
  '................',
  '................',
  '................',
] as const

export const CENTIPEDE_HEAD = [
  '................',
  '....XXXXXXXX....',
  '...XVVVVVVVVX...',
  '..XVVKXVVXKVVX..',
  '..XVVVVVVVVVVX..',
  '..XVVVVVVVVVVX..',
  '...XVVVVVVVVX...',
  '....XXXXXXXX....',
  '...X..X..X..X...',
  '..X..X....X..X..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const CENTIPEDE_BODY = [
  '................',
  '....XXXXXXXX....',
  '...XVVVVVVVVX...',
  '..XVVVVVVVVVVX..',
  '..XVVXVVVVXVVX..',
  '..XVVVVVVVVVVX..',
  '...XVVVVVVVVX...',
  '....XXXXXXXX....',
  '...X..X..X..X...',
  '..X..X....X..X..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const CENTIPEDE_TAIL = [
  '................',
  '....XXXXXXXX....',
  '...XVVVVVVVVX...',
  '..XVVVVVVVVVVX..',
  '..XVVVVVVVVVVX..',
  '..XVVVVVVVVVVX..',
  '...XVVVVVVVVX...',
  '....XXXXXXXX....',
  '.....X..X.......',
  '....X....X......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const BAT_ENEMY = [
  '........................',
  '..XX................XX..',
  '.XBBX..............XBBX.',
  'XBBBBX....XXXX....XBBBBX',
  'XBBBBBX..XBBBBX..XBBBBBX',
  '.XBBBBBXXBBBBBBXXBBBBBX.',
  '..XBBBBBBBBKBBBBBBBBBX..',
  '...XBBBBBBK.KBBBBBBX...',
  '....XBBBBBBBBBBBBX.....',
  '......XXBBBBBBXX.......',
  '........XXXXXX.........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
] as const

export const CAVE_MOTH = [
  '........................',
  '.....XX..........XX.....',
  '....XYYX........XYYX....',
  '...XYYYYX......XYYYYX...',
  '..XYYYYYYX....XYYYYYYX..',
  '..XYYYXXYYXXXXYYXXYYYX..',
  '...XYYX..XYYYYX..XYYX...',
  '....XX...XYYYYX...XX....',
  '.........XXYYXX.........',
  '..........XYYX..........',
  '.........X....X.........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
] as const

export const ROOT_WORM = [
  '................',
  '.......GG.......',
  '......GGGG......',
  '.....GGXXGG.....',
  '....GGXXXXGG....',
  '....GXXKKXXG....',
  '....GXXXXXXG....',
  '.....GXXXXG.....',
  '......GXXG......',
  '......GXXG......',
  '.....GGXXGG.....',
  '....GG....GG....',
  '................',
  '................',
  '................',
  '................',
] as const

export const STONE_BEETLE = [
  '................',
  '.....XXXXXX.....',
  '...XXSSSSSSXX...',
  '..XSSSSSSSSSSX..',
  '.XSSKSSSSSSKSSX.',
  '.XSSSSSSSSSSSSX.',
  '.XSSSSSSSSSSSSX.',
  '.XSSSSSSSSSSSSX.',
  '..XSSSSSSSSSSX..',
  '...XXSSSSSSXX...',
  '.....XXXXXX.....',
  '....X..XX..X....',
  '...X..X..X..X...',
  '................',
  '................',
  '................',
] as const

export const GLOW_SNAIL = [
  '................',
  '..........YY....',
  '........YYYYY...',
  '......YYYYYYY...',
  '.....YYXXXXYY...',
  '....YXGGGGGXY...',
  '...YXGGKGGKGXY..',
  '...YXGGGGGGXY...',
  '....YXGGGGXY....',
  '.....YXXXXY.....',
  '....XSSSSSSX....',
  '...XSSSSSSSSX...',
  '...XSSSSSSSSX...',
  '....XXXXXXXX....',
  '................',
  '................',
] as const

export const DRIP_SLIME = [
  '................',
  '.......GG.......',
  '......GGGG......',
  '......GGGG......',
  '.....GGGGGG.....',
  '.....GGGGGG.....',
  '....GGGKKGGG....',
  '....GGGGGGGG....',
  '.....GGGGGG.....',
  '......GGGG......',
  '.......GG.......',
  '.......GG.......',
  '......G..G......',
  '................',
  '................',
  '................',
] as const
```

## Platform, puzzle, and tile sprites

```ts
export const CAVE_STONE_TILE = [
  'SSSSSSSS',
  'S..SS..S',
  'SSSS.SSS',
  'S.SSSS.S',
  'SS..SSSS',
  'S.SS..SS',
  'SSSSSS.S',
  'SSSSSSSS',
] as const

export const MOSS_PLATFORM_TILE = [
  'GGGGGGGG',
  'G.GG.G.G',
  'SSSSSSSS',
  'S..SS..S',
  'SSSS.SSS',
  'S.SSSS.S',
  'SS..SSSS',
  'SSSSSSSS',
] as const

export const ONE_WAY_PLATFORM_TILE = [
  'GGGGGGGG',
  'S.S.S.S.',
  '........',
  '........',
  '........',
  '........',
  '........',
  '........',
] as const

export const FRAGILE_PLATFORM_TILE = [
  'SSSSSSSS',
  'S..SS..S',
  'SS.S.SSS',
  'S.S..S.S',
  'SS..SSSS',
  'S.SS..SS',
  'SSS..S.S',
  'SSSSSSSS',
] as const

export const MOVING_PLATFORM_TILE = [
  'SSSSSSSSSSSSSSSS',
  'SYYYYYYYYYYYYYYS',
  'SSSSSSSSSSSSSSSS',
  '...S........S...',
  '...S........S...',
  '................',
  '................',
  '................',
] as const

export const WEB_PLATFORM_TILE = [
  'X......XX......X',
  '.X....X..X....X.',
  '..X..X....X..X..',
  '...XX......XX...',
  '...XX......XX...',
  '..X..X....X..X..',
  '.X....X..X....X.',
  'X......XX......X',
] as const

export const VINE_LADDER_TILE = [
  'G..G..G.',
  'GG.G.GG.',
  '.GGGGG..',
  '..GGG...',
  '.GGGGG..',
  'GG.G.GG.',
  'G..G..G.',
  '...G....',
] as const

export const PRESSURE_PLATE_OFF = [
  '................',
  '................',
  '....SSSSSSSS....',
  '...S........S...',
  'SSSSSSSSSSSSSSSS',
  'SSSSSSSSSSSSSSSS',
  '................',
  '................',
] as const

export const PRESSURE_PLATE_ON = [
  '................',
  '................',
  '................',
  '....SSSSSSSS....',
  'SSSSSSSSSSSSSSSS',
  'SSSSSSSSSSSSSSSS',
  '................',
  '................',
] as const

export const LEVER_LEFT = [
  '................',
  '....Y...........',
  '.....Y..........',
  '......Y.........',
  '.......Y........',
  '........Y.......',
  '........X.......',
  '........X.......',
  '......XXXXX.....',
  '.....XSSSSX.....',
  '.....XSSSSX.....',
  '......XXXX......',
  '................',
  '................',
  '................',
  '................',
] as const

export const LEVER_RIGHT = [
  '................',
  '...........Y....',
  '..........Y.....',
  '.........Y......',
  '........Y.......',
  '.......Y........',
  '.......X........',
  '.......X........',
  '.....XXXXX......',
  '....XSSSSX......',
  '....XSSSSX......',
  '.....XXXX.......',
  '................',
  '................',
  '................',
  '................',
] as const

export const LOCKED_GATE_TILE = [
  'SSSSSSSSSSSSSSSS',
  'S..S..S..S..S..S',
  'S..S..S..S..S..S',
  'SSSSSSSSSSSSSSSS',
  'S..S..S..S..S..S',
  'S..S..S..S..S..S',
  'SSSSSSSSSSSSSSSS',
  'S..S..SYYSS..S.S',
  'S..S..SYYSS..S.S',
  'SSSSSSSSSSSSSSSS',
  'S..S..S..S..S..S',
  'S..S..S..S..S..S',
  'SSSSSSSSSSSSSSSS',
  'S..S..S..S..S..S',
  'S..S..S..S..S..S',
  'SSSSSSSSSSSSSSSS',
] as const

export const CARROT_KEY = [
  '................',
  '.........GG.....',
  '........GGG.....',
  '.......GG.......',
  '......CCC.......',
  '.....CCCCC......',
  '......CCC.......',
  '.......C........',
  '.......CYYYY....',
  '.......C...Y....',
  '.......CYYYY....',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const LIGHT_CRYSTAL = [
  '.......Y........',
  '......YYY.......',
  '.....YYYYY......',
  '....YYYYYYY.....',
  '...YYYYYYYYY....',
  '....YYYYYYY.....',
  '.....YYYYY......',
  '......YYY.......',
  '......YYY.......',
  '.....YSSSY......',
  '....YSSSSSY.....',
  '...YSSSSSSSY....',
  '....SSSSSSS.....',
  '.....SSSSS......',
  '......SSS.......',
  '................',
] as const

export const MIRROR_TILE = [
  'SSSSSSSSSSSSSSSS',
  'SYYYYYYYYYYYYYYS',
  'SY............YS',
  'SY..........Y.YS',
  'SY........Y...YS',
  'SY......Y.....YS',
  'SY....Y.......YS',
  'SY..Y.........YS',
  'SYY...........YS',
  'SY............YS',
  'SYYYYYYYYYYYYYYS',
  'SSSSSSSSSSSSSSSS',
  '................',
  '................',
  '................',
  '................',
] as const

export const PRISM_TILE = [
  '................',
  '.......Y........',
  '......YYY.......',
  '.....YYYYY......',
  '....YYYYYYY.....',
  '...YYYYYYYYY....',
  '..YYYYYYYYYYY...',
  '.SSSSSSSSSSSSS..',
  '..Y...Y...Y.....',
  '...Y..Y..Y......',
  '....Y.Y.Y.......',
  '.....YYY........',
  '......Y.........',
  '................',
  '................',
  '................',
] as const

export const RUNE_SWITCH_OFF = [
  '................',
  '....SSSSSSSS....',
  '...S........S...',
  '..S....VV....S..',
  '..S...V..V...S..',
  '..S....VV....S..',
  '..S...V..V...S..',
  '..S....VV....S..',
  '...S........S...',
  '....SSSSSSSS....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const RUNE_SWITCH_ON = [
  '................',
  '....YYYYYYYY....',
  '...Y........Y...',
  '..Y....VV....Y..',
  '..Y...VYYV...Y..',
  '..Y....VV....Y..',
  '..Y...VYYV...Y..',
  '..Y....VV....Y..',
  '...Y........Y...',
  '....YYYYYYYY....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const BREAKABLE_ROCK = [
  '................',
  '....SSSSSSSS....',
  '...SSSS..SSSS...',
  '..SS..SSSS..SS..',
  '..SSSS..SSSSSS..',
  '..S..SSSS..SSS..',
  '..SSSS..SSSSSS..',
  '...SSSSSS..SS...',
  '....SS..SSSS....',
  '.....SSSSSS.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
] as const

export const WEB_DOOR = [
  'X......XX......X',
  '.X....X..X....X.',
  '..X..X....X..X..',
  '...XX......XX...',
  '...XX......XX...',
  '..X..X....X..X..',
  '.X....X..X....X.',
  'X......XX......X',
  'X......XX......X',
  '.X....X..X....X.',
  '..X..X....X..X..',
  '...XX......XX...',
  '...XX......XX...',
  '..X..X....X..X..',
  '.X....X..X....X.',
  'X......XX......X',
] as const
```

## Recommended generated atlas

```ts
export const spriteRows = {
  rabbitSideIdleA: RABBIT_SIDE_IDLE_A,
  rabbitSideIdleB: RABBIT_SIDE_IDLE_B,
  rabbitWalkA: RABBIT_WALK_A,
  rabbitWalkB: RABBIT_WALK_B,
  rabbitJump: RABBIT_JUMP,
  rabbitCrouch: RABBIT_CROUCH,
  rabbitShoot: RABBIT_SHOOT,
  rabbitFrontIdle: RABBIT_FRONT_IDLE,
  rabbitBoredFront: RABBIT_BORED_FRONT,

  carrotShot: CARROT_SHOT,
  carrotPickup: CARROT_PICKUP,
  glowCarrot: GLOW_CARROT,

  spiderDescend: SPIDER_DESCEND,
  spiderCurled: SPIDER_CURLED,
  ladybugEnemy: LADYBUG_ENEMY,
  centipedeHead: CENTIPEDE_HEAD,
  centipedeBody: CENTIPEDE_BODY,
  centipedeTail: CENTIPEDE_TAIL,
  batEnemy: BAT_ENEMY,
  caveMoth: CAVE_MOTH,
  rootWorm: ROOT_WORM,
  stoneBeetle: STONE_BEETLE,
  glowSnail: GLOW_SNAIL,
  dripSlime: DRIP_SLIME,

  caveStoneTile: CAVE_STONE_TILE,
  mossPlatformTile: MOSS_PLATFORM_TILE,
  oneWayPlatformTile: ONE_WAY_PLATFORM_TILE,
  fragilePlatformTile: FRAGILE_PLATFORM_TILE,
  movingPlatformTile: MOVING_PLATFORM_TILE,
  webPlatformTile: WEB_PLATFORM_TILE,
  vineLadderTile: VINE_LADDER_TILE,

  pressurePlateOff: PRESSURE_PLATE_OFF,
  pressurePlateOn: PRESSURE_PLATE_ON,
  leverLeft: LEVER_LEFT,
  leverRight: LEVER_RIGHT,
  lockedGateTile: LOCKED_GATE_TILE,
  carrotKey: CARROT_KEY,
  lightCrystal: LIGHT_CRYSTAL,
  mirrorTile: MIRROR_TILE,
  prismTile: PRISM_TILE,
  runeSwitchOff: RUNE_SWITCH_OFF,
  runeSwitchOn: RUNE_SWITCH_ON,
  breakableRock: BREAKABLE_ROCK,
  webDoor: WEB_DOOR,
} as const
```

## Player animation state machine

Recommended player states:

```ts
type PlayerAnimState =
  | 'idle-side'
  | 'walk'
  | 'jump'
  | 'crouch'
  | 'shoot'
  | 'front-idle'
  | 'bored-front'
  | 'hurt'
```

Rules:

* `idle-side`: alternate `rabbitSideIdleA` and `rabbitSideIdleB`.
* `walk`: alternate `rabbitWalkA` and `rabbitWalkB`.
* `jump`: use `rabbitJump`.
* `crouch`: use `rabbitCrouch`.
* `shoot`: use `rabbitShoot` for a short animation lock.
* `front-idle`: after several seconds idle, face the camera.
* `bored-front`: after longer idle, use bored front face.
* Horizontal facing should mirror side-view sprites.

## Enemy behavior models

### Spider

States:

```ts
type SpiderState = 'hidden' | 'descending' | 'waiting' | 'curled' | 'retracting' | 'inactive'
```

Pixel-perfect rules:

* Rabbit damage only when `masksOverlap(spiderMask, spider.x, spider.y, rabbitMask, rabbit.x, rabbit.y) > 0`.
* Carrot shot curl only when `masksOverlap(carrotShotMask, shot.x, shot.y, spiderMask, spider.x, spider.y) > 0`.

### Ladybug

States:

```ts
type LadybugState = 'patrol' | 'charge' | 'shell' | 'retreat' | 'inactive'
```

Behavior:

* Patrols floor.
* Charges when inside strong light cone.
* Shells up when hit by carrot shot.
* Blocks narrow spaces until moved by puzzle or light.

### Centipede

Model as linked segments:

```ts
type CentipedeSegmentKind = 'head' | 'body' | 'tail'

interface CentipedeSegment {
  kind: CentipedeSegmentKind
  x: number
  y: number
  mask: PixelMask
}
```

Collision:

* Each segment has its own mask.
* Test rabbit collision against every segment.
* Test projectile against every segment.
* Hitting any segment causes the whole centipede to turn, curl, or retreat.

### Additional enemies

* `batEnemy`: flies in arcs, reacts to beeper sound.
* `caveMoth`: attracted to light; dangerous because it crowds the player.
* `rootWorm`: emerges from walls; retracts under carrot light.
* `stoneBeetle`: slow blocker; can press pressure plates.
* `glowSnail`: moving light source; reveals hidden platforms but hurts on touch.
* `dripSlime`: falls from ceiling after light or sound trigger.

## Procedural world generation

Use seeded generation. The same seed must create the same world.

Recommended pipeline:

```ts
interface WorldSeed {
  value: string
}

interface RoomNode {
  id: string
  type: RoomType
  depth: number
  exits: Direction[]
  difficulty: number
}

type RoomType =
  | 'start_burrow'
  | 'spider_gallery'
  | 'ladybug_root_hall'
  | 'centipede_tunnel'
  | 'crystal_well'
  | 'moss_platform_chamber'
  | 'mirror_puzzle_room'
  | 'web_gate_room'
  | 'surface_shaft'
```

Generation steps:

1. Generate a vertical room graph from deep cave to surface.
2. Select room templates by depth and difficulty.
3. Carve tilemap from template grammar.
4. Place platforms.
5. Place lights.
6. Place puzzles.
7. Place enemies.
8. Place pickups.
9. Validate reachability.
10. Validate that required interactions are pixel-fair.

## Room validation requirements

A generated room is invalid if:

* the exit cannot be reached
* the player spawns inside solid pixels
* an enemy overlaps the player spawn
* a pickup is impossible to reach
* a projectile-required switch is impossible to hit
* darkness hides mandatory information without a light source
* pixel collision produces unavoidable damage
* a centipede blocks the only path without a counterplay mechanic

## Lighting implementation

Start simple:

```ts
interface LightSource {
  x: number
  y: number
  radiusTiles: number
  strength: number
  flicker?: number
  kind: 'rabbit' | 'carrot-shot' | 'crystal' | 'glow-snail'
}
```

Use tile light levels first:

```ts
type LightLevel = 0 | 1 | 2 | 3
```

Suggested meanings:

* `0`: total darkness
* `1`: silhouette only
* `2`: readable
* `3`: bright / puzzle-active

Enemies may react to light level 3.

## First implementation milestone

Build a vertical slice with:

1. Procedural seed input, even if only one room type exists.
2. Rabbit side idle, walk, jump, crouch, shoot, front idle.
3. One tilemap cave room.
4. Pixel-perfect carrot pickup.
5. Pixel-perfect carrot shot.
6. Spider enemy.
7. Ladybug enemy.
8. Centipede made of head/body/tail segments.
9. At least one additional enemy from the extra list.
10. One pressure plate.
11. One light crystal.
12. One locked gate.
13. AY background loop.
14. Beeper SFX.
15. `pickLocale()` English and Slovak strings.
16. Darkness and light radius.
17. A debug overlay showing AABB broad phase and mask overlap result.

## Debugging tools required

Add debug toggles:

* show player mask
* show enemy masks
* show projectile mask
* show AABB broad phase rectangles
* show tile collision cells
* show light levels
* show current locale
* show current procedural seed
* show current room type

The debug overlay must make it obvious when AABB overlaps but pixel masks do not. That is the main proof that chaosBunny is truly pixel-perfect.


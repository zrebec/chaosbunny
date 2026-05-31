/**
 * Source pixel art for the chaosBunny 0.1.0 vertical slice.
 *
 * The rabbit side poses are 24×32 (taller, big ears, long legs) and composed
 * from one BASE silhouette via {@link pose} — every variant copies BASE and
 * overrides only the ear/leg/arm rows, so widths can never drift. Monochrome
 * for now (the mask collapses every non-dot symbol to a pixel); the `.` eye gap
 * reads as an eye against the dark cave.
 *
 * Front poses, carrot, enemies and tiles are unchanged from the design docs.
 */

// ─── Player — 24×32 side poses (composed) ──────────────────────────────────────

// BASE = idle, facing right. Ears rows 0–4, head 5–13, body 14–23, legs 24–30.
const RABBIT_BASE: readonly string[] = [
  '....XX..XX..............', // 0  ears
  '....XX..XX..............', // 1
  '....XX..XX..............', // 2
  '....XX..XX..............', // 3
  '....XXXXXX..............', // 4  ears meet
  '...XXXXXXXX.............', // 5  head
  '..XXXXXXXXXX............', // 6
  '..XXXXXXXXXX............', // 7
  '..XXXX..XXXX............', // 8  eye gap
  '..XXXXXXXXXX............', // 9
  '..XXXXXXXXXX............', // 10
  '...XXXXXXXX.............', // 11 jaw
  '....XXXXXX..............', // 12 neck
  '...XXXXXXXX.............', // 13
  '..XXXXXXXXXX............', // 14 body
  '.XXXXXXXXXXXX...........', // 15
  '.XXXXXXXXXXXX...........', // 16
  'XXXXXXXXXXXXXX..........', // 17 widest (tail bump at left)
  'XXXXXXXXXXXXXX..........', // 18
  '.XXXXXXXXXXXXX..........', // 19
  '.XXXXXXXXXXXX...........', // 20
  '..XXXXXXXXXX............', // 21
  '..XXXXXXXXXX............', // 22
  '..XXXXXXXXXX............', // 23
  '..XXX...XXXX............', // 24 legs
  '..XXX...XXXX............', // 25
  '.XXXX...XXXX............', // 26
  '.XXX....XXX.............', // 27
  '.XXXX...XXXX............', // 28
  'XXXXX...XXXXX...........', // 29 feet
  'XXXX.....XXX............', // 30
  '........................', // 31
] as const

function pose(edits: ReadonlyArray<readonly [number, string]>): string[] {
  const rows = [...RABBIT_BASE]
  for (const [i, s] of edits) rows[i] = s
  return rows
}

export const RABBIT_SIDE_IDLE_A = [...RABBIT_BASE]

// Gentle blink — no position change, so the idle never "trembles".
export const RABBIT_SIDE_IDLE_B = pose([
  [8, '..XXXXXXXXXX............'],
])

export const RABBIT_WALK_A = pose([
  [24, '..XX....XXXXX..........'],
  [25, '..XX....XXXXX..........'],
  [26, '.XXX.....XXXX..........'],
  [27, 'XXX......XXX...........'],
  [28, 'XXX.......XXX..........'],
  [29, 'XX........XXXX.........'],
  [30, '..........XXX..........'],
])

export const RABBIT_WALK_B = pose([
  [24, '..XXXXX...XX...........'],
  [25, '..XXXXX...XX...........'],
  [26, '..XXXX....XXX..........'],
  [27, '...XXX....XXX..........'],
  [28, '..XXX......XXX.........'],
  [29, '..XXX.......XX.........'],
  [30, '..XXX...................'],
])

export const RABBIT_JUMP = pose([
  [0, '...XX..XX...............'],
  [1, '...XX..XX...............'],
  [2, '...XX..XX...............'],
  [3, '...XXXXXX...............'],
  [24, '.XXX.....XXX...........'],
  [25, '.XXX.....XXX...........'],
  [26, 'XXX......XXX...........'],
  [27, 'XXX......XXX...........'],
  [28, 'XX.......XX............'],
  [29, 'XX.......XX............'],
  [30, '.X........X............'],
])

export const RABBIT_SHOOT = pose([
  [14, '..XXXXXXXXXX.XXX........'],
  [15, '.XXXXXXXXXXXX.XXX.......'],
])

// Crouch — its own compressed silhouette (ears flat, body low, legs splayed).
export const RABBIT_CROUCH = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '..XX............XX......',
  '..XXX..........XXX......',
  '...XXXXXXXXXXXXXX.......',
  '..XXXXXXXXXXXXXXXX......',
  '.XXXXX..XXXX..XXXXX.....',
  '.XXXXXXXXXXXXXXXXXX.....',
  '.XXXXXXXXXXXXXXXXXX.....',
  '.XXXXXXXXXXXXXXXXXX.....',
  '..XXXXXXXXXXXXXXXX......',
  '..XXXXXXXXXXXXXXXX......',
  '...XXXX......XXXX.......',
  '..XXXX........XXXX......',
  '..XXX..........XXX......',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
] as const

// ─── Front poses (title screen — unchanged, normalized to 32 wide by the atlas) ─

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

// ─── Projectile & pickup ──────────────────────────────────────────────────────

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

// ─── Enemies (0.1.0: spider + bat) ─────────────────────────────────────────────

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

// ─── Tiles ──────────────────────────────────────────────────────────────────

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

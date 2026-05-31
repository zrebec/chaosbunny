/**
 * Source pixel art for the chaosBunny vertical slice.
 *
 * The rabbit side poses are 16×24: long ears, a clear right-facing profile,
 * white cheek/belly, pink ear/skirt accents and a black eye. They are composed
 * from one BASE silhouette via {@link pose}; every variant copies BASE and
 * overrides only the rows that change, so all poses keep one size.
 *
 * Walk is a 3-beat cycle (A → B → C) for a more deliberate step. Front poses,
 * carrot, enemies and tiles are unchanged from the design docs.
 */

// ─── Player — 16×24 side poses (composed) ──────────────────────────────────────

// BASE = idle, facing right. B=body, W=white cheek/belly, P=accent/skirt, K=eye.
// Ears rows 0–6, head 7–12, body 13–18, legs 19–23.
const RABBIT_BASE: readonly string[] = [
  '...BBB.BBB......', // 0  long ears
  '...BPB.BPB......', // 1  inner ear (pink)
  '...BPB.BPB......', // 2
  '...BPB.BPB......', // 3
  '...BPB.BPB......', // 4
  '...BBB.BBB......', // 5  ear base
  '...BBBBBBB......', // 6  ears → head
  '..BBBBBBBBB.....', // 7  head top
  '..BBWWBBKBB.....', // 8  cheek (W) + eye (K), facing right
  '..BBBBBBBBBB....', // 9  snout
  '..BBBBBBBBBBB...', // 10 snout tip (reaches right)
  '...BBBBBBBB.....', // 11 under-snout
  '....BBBBB.......', // 12 neck
  '...BBBBBBB......', // 13 shoulders
  '..BBBWWWWBBB....', // 14 belly (white)
  '..BBWWWWWWBB....', // 15
  '..BBPPPPPPBB....', // 16 skirt accent (pink)
  '..BBBPPPPBBB....', // 17
  '...BBBBBBBB.....', // 18 hips
  '...BBB.BBB......', // 19 legs
  '..BBB...BBB.....', // 20
  '..BB.....BB.....', // 21
  '.BBB.....BBB....', // 22 feet
  '.BB.......BB....', // 23
] as const

function pose(edits: ReadonlyArray<readonly [number, string]>): string[] {
  const rows = [...RABBIT_BASE]
  for (const [i, s] of edits) rows[i] = s
  return rows
}

export const RABBIT_SIDE_IDLE_A = [...RABBIT_BASE]

// Gentle blink — eye (K) closes, no position change so the idle never "trembles".
export const RABBIT_SIDE_IDLE_B = pose([
  [8, '..BBWWBBBBB.....'],
])

// ── 3-beat walk: A (right stride) → B (passing) → C (left stride) ──
export const RABBIT_WALK_A = pose([
  [19, '...BBB.BBB......'],
  [20, '..BBB...BBB.....'],
  [21, '.BBB......BB....'],
  [22, 'BBB.......BBB...'],
  [23, 'BB.........BB...'],
])

export const RABBIT_WALK_B = pose([
  [19, '...BBB.BBB......'],
  [20, '...BBBBBB.......'],
  [21, '...BBBBBB.......'],
  [22, '..BBB..BB.......'],
  [23, '..BB...BB.......'],
])

export const RABBIT_WALK_C = pose([
  [19, '...BBB.BBB......'],
  [20, '..BBB...BBB.....'],
  [21, '...BB......BBB..'],
  [22, '..BBB.......BBB.'],
  [23, '..BB.........BB.'],
])

export const RABBIT_JUMP = pose([
  [0, '...BB..BB.......'],
  [1, '...BB..BB.......'],
  [2, '...BP..PB.......'],
  [3, '...BP..PB.......'],
  [4, '....BPPB.......'],
  [19, '...BB...BB......'],
  [20, '..BBB...BBB.....'],
  [21, '..BB.....BB.....'],
  [22, '...............'],
  [23, '...............'],
])

export const RABBIT_SHOOT = pose([
  [13, '...BBBBBBBBB....'],
  [14, '..BBBWWWWBB.BB..'],
])

// Crouch — its own compressed silhouette (ears flat, body low, feet on the
// ground line at rows 21–23 so the rabbit doesn't float when crouching).
export const RABBIT_CROUCH = [
  '...............', // 0
  '...............', // 1
  '...............', // 2
  '...............', // 3
  '...............', // 4
  '...............', // 5
  '...............', // 6
  '...............', // 7
  '...............', // 8
  '...............', // 9
  '..BB.......BB..', // 10 flattened ears
  '..BBBBBBBBBBB..', // 11 back
  '.BBWWBBKBBBBBB.', // 12 cheek + eye
  '.BBWWBBBBBBBBB.', // 13
  '.BBBBBBBBBBBBB.', // 14
  '.BBPPPPPPPPPBB.', // 15 skirt
  '..BBPPPPPPPBB..', // 16
  '..BBBBBBBBBBB..', // 17
  '..BBB.....BBB..', // 18 legs
  '.BBB.......BBB.', // 19
  '.BB.........BB.', // 20
  'BBB.........BBB', // 21 feet
  'BB...........BB', // 22
  'BB...........BB', // 23
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

// Vine ladder — two rails + rungs, tiles vertically into a climbable run.
export const LADDER_TILE = [
  '.G....G.',
  '.G....G.',
  '.GGGGGG.',
  '.G....G.',
  '.G....G.',
  '.GGGGGG.',
  '.G....G.',
  '.G....G.',
] as const

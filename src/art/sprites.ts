/**
 * Source pixel art for the chaosBunny vertical slice.
 *
 * The rabbit side poses are 24×24: compact, ZX-authentic silhouettes inspired by
 * the generated concept sheet — bent ears, large head, small body, cotton tail,
 * magenta ear/nose accents, cyan shade and a black eye. They are composed
 * from one BASE silhouette via {@link pose}; every variant copies BASE and
 * overrides only the rows that change, so all poses keep one size.
 *
 * Walk is a 3-beat cycle (A → B → C) for a more deliberate step. Front poses,
 * carrot, enemies and tiles are unchanged from the design docs.
 */

// ─── Player — 24×24 side poses (composed) ──────────────────────────────────────

// BASE = idle, facing right. B=white body, W=cyan shade, P=magenta accent, K=eye.
// Ears rows 0–6, head 5–12, body 12–19, feet 20–23. The ears bend backward so
// the mono silhouette stays cute and readable without a huge non-colliding tower.
const RABBIT_BASE: readonly string[] = [
  '....BBBBBB..............', // 0  folded ear cap
  '..BBBBBBBBBB............', // 1
  '.BBBBPPPPBBBB...........', // 2  clear magenta inner ear
  '.BBB.PPPP.BBBB..........', // 3
  '..BBBPPPP.BBBBB.........', // 4
  '...BBBBBBBBBBBB.........', // 5  ear → head bridge
  '.....BBBBBBBBBBB........', // 6  head top
  '....BBBBBBBBBBBBB.......', // 7
  '...BBB..BBBBKBBBB.......', // 8  cheek cut + eye
  '...BB....BBBBBBBBB......', // 9
  '....BBBBBBBBBBBBBP......', // 10 nose accent
  '.....BBBBBBBBBBBB.......', // 11 jaw
  '.......BBBBBBB..........', // 12 neck
  '....BBBBBBBB............', // 13 chest
  '...BBBBBBBBB............', // 14
  '..BBBBBWWBBBB...........', // 15 cyan belly shade
  '.BB.BBBBWWBBBB..........', // 16 tail + body
  '.BB..BBBBBBBBB..........', // 17
  '..B...BBBBBBB...........', // 18
  '......BBB.BBB...........', // 19 legs
  '.....BBB...BBB..........', // 20
  '.....BB.....BB..........', // 21
  '....BBB.....BBB.........', // 22 feet
  '....BB.......BB.........', // 23
] as const

function pose(edits: ReadonlyArray<readonly [number, string]>): string[] {
  const rows = [...RABBIT_BASE]
  for (const [i, s] of edits) rows[i] = s
  return rows
}

export const RABBIT_SIDE_IDLE_A = [...RABBIT_BASE]

// Gentle blink — eye (K) closes, no position change so the idle never "trembles".
export const RABBIT_SIDE_IDLE_B = pose([
  [8, '...BBB..BBBBBBBB........'],
])

// ── 3-beat walk: A (right stride) → B (passing) → C (left stride) ──
export const RABBIT_WALK_A = pose([
  [16, '.BB.BBBBWWBBBB..........'],
  [17, '.BB..BBBBBBBBB..........'],
  [18, '..B...BBBBBBB...........'],
  [19, '......BBB..BB...........'],
  [20, '....BBBB....BBB.........'],
  [21, '...BBB.......BB.........'],
  [22, '..BBB........BBB........'],
  [23, '..BB..........BB........'],
])

export const RABBIT_WALK_B = pose([
  [16, '.BB.BBBBWWBBBB..........'],
  [17, '..B..BBBBBBBB...........'],
  [18, '......BBBBBBB...........'],
  [19, '......BBBBBB............'],
  [20, '.....BBB.BBB............'],
  [21, '.....BB...BB............'],
  [22, '....BBB...BBB...........'],
  [23, '....BB.....BB...........'],
])

export const RABBIT_WALK_C = pose([
  [16, '.BB.BBBBWWBBBB..........'],
  [17, '.BB..BBBBBBBBB..........'],
  [18, '..B...BBBBBBB...........'],
  [19, '......BB..BBB...........'],
  [20, '.....BBB....BBBB........'],
  [21, '.....BB.......BBB.......'],
  [22, '....BBB........BBB......'],
  [23, '....BB..........BB......'],
])

export const RABBIT_JUMP = pose([
  [0, '.....BBBBBB.............'],
  [1, '...BBBBBBBBBB...........'],
  [2, '..BBBBPPPPBBBB..........'],
  [3, '..BBB.PPPP.BBBB.........'],
  [4, '...BBBPPPP.BBBBB........'],
  [13, '.....BBBBBBBB...........'],
  [14, '....BBBBBBBBB...........'],
  [15, '...BBBBBWWBBBB..........'],
  [16, '..BB.BBBBWWBBBB.........'],
  [17, '..B...BBBBBBB...........'],
  [18, '......BBBBBB............'],
  [19, '.....BBB..BBB...........'],
  [20, '....BBB....BBB..........'],
  [21, '...BBB......BBB.........'],
  [22, '........................'],
  [23, '........................'],
])

export const RABBIT_SHOOT = pose([
  [13, '....BBBBBBBBBBB.........'],
  [14, '...BBBBBBBBBBBBBB.......'],
  [15, '..BBBBBWWBBBB..BBB......'],
  [16, '.BB.BBBBWWBBBB...BB.....'],
  [17, '.BB..BBBBBBBBB..........'],
])

// Crouch — its own compressed silhouette (ears flat, body low). The rabbit ducks
// below its standing height, so the top rows are empty and the feet sit on the
// ground line at the bottom rows (no float when crouching).
export const RABBIT_CROUCH = [
  '........................', // 0
  '........................', // 1
  '........................', // 2
  '........................', // 3
  '........................', // 4
  '........................', // 5
  '........................', // 6
  '........................', // 7
  '..BBBBBBBBBB............', // 8 flattened ears
  '.BBBBPPPPBBBB...........', // 9
  '.BBB.PPPP.BBBBB.........', // 10
  '..BBBBBBBBBBBBB.........', // 11 head
  '..BBB..BBBBKBBBB........', // 12
  '..BB....BBBBBBBBP.......', // 13 nose
  '...BBBBBBBBBBBB.........', // 14
  '.BB..BBBBBBBBB..........', // 15 tail + back
  'BBB...BBBBWWBBBB........', // 16 body low
  '.BB...BBBBWWBBBB........', // 17
  '..B....BBBBBBBB.........', // 18
  '.......BBBBBBB..........', // 19
  '......BBB...BBB.........', // 20 feet tucked
  '.....BBB.....BBB........', // 21
  '.....BB.......BB........', // 22
  '........................', // 23
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

export const BAT_WINGS_UP = [
  '..BB................BB..',
  '.BBBB..............BBBB.',
  'BB..BB............BB..BB',
  'B....BB..........BB....B',
  'B.....BB........BB.....B',
  '......BBB..BB..BBB......',
  '.......BBBBBBBBBB.......',
  '........BBKKKKBB........',
  '........BBBBBBBB........',
  '.........BB..BB.........',
  '........BB....BB........',
  '.......BB......BB.......',
  '........................',
  '........................',
  '........................',
  '........................',
] as const

export const BAT_WINGS_MID = [
  '........................',
  '..BB..............BB....',
  '.BBBB............BBBB...',
  'BB..BB..........BB..BB..',
  'B....BBB......BBB....B..',
  '.....BBBBBBBBBBBB.......',
  '......BBBBKKBBBB........',
  '.......BBBKKBBB.........',
  '......BBBBBBBBBB........',
  '.....BB..BBBB..BB.......',
  '....BB..........BB......',
  '...BB............BB.....',
  '........................',
  '........................',
  '........................',
  '........................',
] as const

export const BAT_WINGS_DOWN = [
  '........................',
  '........................',
  '...BB............BB.....',
  '..BBBB..........BBBB....',
  '.BB..BB........BB..BB...',
  'BB....BBBBBBBBBB....BB..',
  'B......BBKKKKBB......B..',
  '.......BBBBBBBB.........',
  '........BBBBBB..........',
  '.......BB....BB.........',
  '......BB......BB........',
  '.....BB........BB.......',
  '....BB..........BB......',
  '........................',
  '........................',
  '........................',
] as const

export const BAT_ENEMY = BAT_WINGS_MID

// Mouse — a skittish floor critter (16×8, two run frames; authored facing
// right, mirrored in code). Stomp it Mario-style and it bolts off-screen —
// it never dies, it just flees (non-lethal rule 8). `K` = eye.
export const MOUSE_A = [
  '........XX......',
  '.......XXXXX....',
  '.X.....XXXXKX...',
  '..X..XXXXXXXXXX.',
  '...XXXXXXXXXXX..',
  '....XXXXXXXXX...',
  '....XX....XX....',
  '...XX......XX...',
] as const

export const MOUSE_B = [
  '........XX......',
  '.......XXXXX....',
  '.X.....XXXXKX...',
  '..X..XXXXXXXXXX.',
  '...XXXXXXXXXXX..',
  '....XXXXXXXXX...',
  '......XX..XX....',
  '.....XX....XX...',
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

// Crumbling platform — a fragile, dotted look so you read "don't linger here".
export const CRUMBLE_TILE = [
  'X.X.X.X.',
  '.X.X.X.X',
  'X.X.X.X.',
  '.X.X.X.X',
  'X.X.X.X.',
  '.X.X.X.X',
  'X.X.X.X.',
  '.X.X.X.X',
] as const

// Overhang lip — a low ceiling you can only pass crouched. Solid like stone, but
// the art hangs from the top with downward prongs so it reads as "duck here".
export const OVERHANG_TILE = [
  'XXXXXXXX',
  'XXXXXXXX',
  'XXXXXXXX',
  'X.XXXX.X',
  '.X.XX.X.',
  '..X..X..',
  '..X..X..',
  '...XX...',
] as const

// Sidebar frame — a small diagonal carrot, tiled around the HUD panel.
// Two layers so the frame isn't one flat colour: body (B_YELLOW-ish) + leaves
// (B_GREEN), drawn on top of each other like the rabbit's colour layers.
export const SIDEBAR_CARROT_BODY = [
  '........',
  '........',
  '.....X..',
  '....XXX.',
  '...XXX..',
  '..XXX...',
  '.XX.....',
  'X.......',
] as const

export const SIDEBAR_CARROT_LEAF = [
  '.....X.X',
  '......XX',
  '....X.X.',
  '........',
  '........',
  '........',
  '........',
  '........',
] as const

// Heart — HP indicator (raw 8×8 sprite, drawn via zx-kit `drawSprite`).
export const HEART = new Uint8Array([
  0x00, // ........
  0x66, // .##..##.  two bumps
  0xFE, // #######.
  0xFE, // #######.
  0x7C, // .#####..
  0x38, // ..###...
  0x10, // ...#....  tip
  0x00, // ........
])

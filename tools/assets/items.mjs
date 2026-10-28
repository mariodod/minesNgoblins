import { Canvas, darken, normalizeMap } from './pixel.mjs';
import { COMMON, CRYSTAL_PALETTES } from './palette.mjs';

function fromMap(width, height, map, palette, name) {
  const canvas = new Canvas(width, height);
  canvas.drawMap(normalizeMap(map, width, height, name), palette);
  return canvas;
}

const ROCK = fromMap(
  6,
  6,
  ['..oo..', '.oHHo.', 'oHSSSo', 'oSssdo', '.osdo.', '..oo..'],
  {
    o: darken(COMMON.steelDark, 0.55),
    H: COMMON.steelLight,
    S: COMMON.steel,
    s: 0x6f7881,
    d: COMMON.steelDark,
  },
  'rock',
);

const BONE = fromMap(
  6,
  3,
  ['.o..o.', 'oBBBBo', '.o..o.'],
  {
    o: darken(COMMON.boneShade, 0.5),
    B: COMMON.bone,
  },
  'bone',
);

const BOULDER = fromMap(
  12,
  12,
  [
    '....oooo....',
    '..ooSSSSoo..',
    '.oSSHHSSSSo.',
    '.oSHHSSSSSSo',
    'oSSSSSSSSSSo',
    'oSSSSsSSSSSo',
    'oSSSsssSSSSo',
    'oSSSSsSSSSSo',
    'oSSSSSSSSSSo',
    '.oSSSSSSSSo.',
    '..ooSSSSoo..',
    '....oooo....',
  ],
  {
    o: darken(0x3d4147, 0.6),
    S: 0x5b6067,
    H: 0x8b949e,
    s: 0x3d4147,
  },
  'boulder',
);

function createSpike() {
  const canvas = new Canvas(16, 8);

  canvas.rect(0, 6, 16, 2, 0x1a1e25);
  canvas.hline(0, 6, 16, 0x2a2f36);

  for (let x = 0; x < 16; x += 4) {
    canvas.triangle(x, 7, x + 2, 0, x + 4, 7, 0x7d858e);
    canvas.triangle(x + 1, 7, x + 2, 1, x + 3, 7, 0xb8c0c8);
    canvas.vline(x + 2, 2, 5, 0xe8eef2);
    canvas.vline(x + 3, 4, 3, 0x596169);
  }

  return canvas;
}

const SPIKE = createSpike();

const CRATE = fromMap(
  16,
  16,
  [
    'oooooooooooooooo',
    'oLLLLLLLLLLLLLLo',
    'oLLLLLLLLLLLLLLo',
    'oLLwwwwwwwwwwLLo',
    'oLLwLLLLLLLLwLLo',
    'oLLwLwwwwwwLwLLo',
    'oLLwLwLLLLwLwLLo',
    'oLLwLwLwwLwLwLLo',
    'oLLwLwLwwLwLwLLo',
    'oLLwLwLLLLwLwLLo',
    'oLLwLwwwwwwLwLLo',
    'oLLwLLLLLLLLwLLo',
    'oLLwwwwwwwwwwLLo',
    'oLLLLLLLLLLLLLLo',
    'oLLLLLLLLLLLLLLo',
    'oooooooooooooooo',
  ],
  {
    o: darken(0x3d2a17, 0.55),
    L: 0x7a4f2a,
    l: 0xa97945,
    W: 0x5a3d26,
    w: 0x3d2a17,
  },
  'crate',
);

const KNIFE = fromMap(
  9,
  3,
  ['.oo......', 'oSSSooooo', '.oo......'],
  {
    o: darken(COMMON.steelDark, 0.55),
    S: COMMON.white,
    H: COMMON.steelLight,
    L: COMMON.leather,
  },
  'knife',
);

// Re-color the knife handle in the small 3px row.
KNIFE.rect(5, 1, 3, 1, COMMON.leather);
KNIFE.set(8, 1, COMMON.gold);

const FLINTLOCK = fromMap(
  12,
  8,
  [
    '....oooooo..',
    '...oSSSSSSo.',
    '...oSHHHHSo.',
    'ooooSSSSSSo.',
    'oLLLLooSSSo.',
    'oLLLLo..ooo.',
    '.oLLo.......',
    '..oo........',
  ],
  {
    o: darken(0x4a2f19, 0.6),
    S: COMMON.steel,
    H: COMMON.steelLight,
    L: COMMON.leather,
    l: COMMON.leatherLight,
  },
  'flintlock',
);
FLINTLOCK.set(10, 1, COMMON.lamp);
FLINTLOCK.set(4, 3, COMMON.gold);

const RUNE_SCROLL = fromMap(
  10,
  9,
  [
    '.oooooooo.',
    'oPpPPPPpPo',
    'oPPPPPPPPo',
    'oPPPRRPPPo',
    'oPPRPRPPPo',
    'oPPPRRPPPo',
    'oPPPPPPPPo',
    'oPpPPPPpPo',
    '.oooooooo.',
  ],
  {
    o: darken(0x8a7a58, 0.5),
    P: 0xd8c7a1,
    p: 0xb79f78,
    R: COMMON.magic,
    r: COMMON.magicBright,
  },
  'rune-scroll',
);
RUNE_SCROLL.set(5, 4, COMMON.magicBright);

const BULLET = fromMap(
  6,
  2,
  ['.LLLLo', 'oSSSo.'],
  {
    o: darken(COMMON.lampDim, 0.45),
    L: COMMON.lampBright,
    S: COMMON.lamp,
  },
  'bullet',
);

const SALVE = fromMap(
  8,
  9,
  [
    '..oooo..',
    '..oCCO..',
    '..oCCO..',
    '.ooPPoo.',
    '.oPPPPo.',
    'oPPWWPPo',
    'oPPWWPPo',
    'oPPPPPPo',
    '.oooooo.',
  ],
  {
    o: darken(0x2f4a1f, 0.55),
    C: 0x7a4f2a,
    O: 0x4a2f19,
    P: 0x6fb84c,
    W: COMMON.white,
  },
  'salve',
);
SALVE.set(3, 4, 0x8fbf6a);
SALVE.set(5, 5, 0x3d7a2a);

const ORE = fromMap(
  9,
  8,
  [
    '..ooooo..',
    '.oSSSSSo.',
    'oSSGGSSso',
    'oSSGgSSso',
    'oSSSGSSso',
    'oSSSSSSso',
    '.oSSSSSo.',
    '..ooooo..',
  ],
  {
    o: darken(0x3d4147, 0.6),
    S: 0x596169,
    s: 0x3d4147,
    G: COMMON.gold,
    g: COMMON.goldBright,
  },
  'ore',
);

const HEART_FULL = fromMap(
  7,
  7,
  ['.oo.oo.', 'oRLoRRo', 'oRRRRRo', 'oRRRRRo', '.oRRRo.', '..oRo..', '...o...'],
  {
    o: darken(0x7a1f2b, 0.45),
    R: 0xe74c3c,
    r: 0xa83227,
    L: 0xffb3a7,
  },
  'heart-full',
);

const HEART_EMPTY = fromMap(
  7,
  7,
  ['.oo.oo.', 'oGGoGGo', 'oGGGGGo', 'oGGGGGo', '.oGGGo.', '..oGo..', '...o...'],
  {
    o: darken(0x2a3038, 0.35),
    G: 0x2f363e,
  },
  'heart-empty',
);

const DUST = (() => {
  const canvas = new Canvas(4, 4);
  canvas.blendRect(1, 0, 2, 4, COMMON.dust, 110);
  canvas.blendRect(0, 1, 4, 2, COMMON.dust, 110);
  canvas.set(1, 1, COMMON.lampBright, 200);
  canvas.set(2, 1, COMMON.dust, 170);
  canvas.set(1, 2, COMMON.dust, 170);
  return canvas;
})();

const DRIP = fromMap(
  2,
  4,
  ['o.', 'oL', 'o.', '..'],
  {
    o: darken(0x6fa8b8, 0.4),
    L: 0xb8e8f0,
  },
  'drip',
);

function createLanternGlow() {
  const canvas = new Canvas(48, 48);
  const center = 23.5;
  const maxDistance = 24;

  for (let y = 0; y < 48; y += 1) {
    for (let x = 0; x < 48; x += 1) {
      const distance = Math.hypot(x - center, y - center) / maxDistance;

      if (distance >= 1) {
        continue;
      }

      const falloff = (1 - distance) ** 2;
      canvas.set(x, y, COMMON.lamp, Math.round(falloff * 150));
    }
  }

  return canvas;
}

const LANTERN_GLOW = createLanternGlow();

const LANTERN = fromMap(
  10,
  14,
  [
    '...o..o...',
    '..oooooo..',
    '..oMMMMo..',
    '.oMGGGGMo.',
    '.oMGFFGMo.',
    '.oMGFFGMo.',
    '.oMGGGGMo.',
    '..oMMMMo..',
    '..oMMMMo..',
    '...oMMo...',
    '...oMMo...',
    '..oooooo..',
    '..........',
    '..........',
  ],
  {
    o: darken(COMMON.steelDark, 0.55),
    M: COMMON.steelDark,
    G: COMMON.lampDim,
    F: COMMON.lamp,
  },
  'lantern',
);
LANTERN.set(4, 5, COMMON.lampBright);
LANTERN.set(5, 6, COMMON.lampBright);

const PEDESTAL = fromMap(
  16,
  10,
  [
    '..oooooooooooo..',
    '.oSSSSSSSSSSSSo.',
    '.oSsssssssssSSo.',
    'oooooooooooooooo',
    '..oSSSSSSSSSSo..',
    '..oSsssssssSSo..',
    '..oSSSSSSSSSSo..',
    '..oSsssssssSSo..',
    '.oooooooooooooo.',
    '................',
  ],
  {
    o: darken(0x4a3320, 0.55),
    S: 0x6b5a44,
    s: 0x4a3a2a,
  },
  'pedestal',
);

const ELEVATOR_DOOR = (() => {
  const canvas = new Canvas(48, 48);

  // Dark shaft behind the cage.
  canvas.rect(0, 0, 48, 48, 0x080d11);
  canvas.rect(3, 3, 42, 42, 0x11161b);

  // Bronze frame.
  canvas.rect(1, 1, 46, 2, 0x8a6b32);
  canvas.rect(1, 45, 46, 2, 0x5a4520);
  canvas.rect(1, 1, 2, 46, 0x6f5427);
  canvas.rect(45, 1, 2, 46, 0x6f5427);
  canvas.rect(4, 4, 40, 1, 0x3a2c14);
  canvas.rect(4, 43, 40, 1, 0x3a2c14);

  // Cage bars and cross braces.
  for (let x = 8; x < 44; x += 6) {
    canvas.rect(x, 5, 2, 38, 0x4d5b66);
    canvas.vline(x + 1, 6, 36, 0x7d8b96);
  }

  canvas.line(5, 8, 42, 40, 0x3a4650);
  canvas.line(42, 8, 5, 40, 0x3a4650);
  canvas.line(6, 7, 43, 39, 0x5a6872);

  // Floor plate and warning light.
  canvas.rect(4, 41, 40, 3, 0x2f3640);
  canvas.rect(20, 34, 8, 5, 0x8a6b32);
  canvas.rect(22, 35, 4, 3, COMMON.lamp);
  canvas.set(23, 36, COMMON.lampBright);

  // Rivets.
  for (const [x, y] of [
    [4, 4],
    [43, 4],
    [4, 43],
    [43, 43],
  ]) {
    canvas.set(x, y, 0xc9a227);
  }

  return canvas;
})();

function createCrystal(kind) {
  const palette = CRYSTAL_PALETTES[kind];
  const canvas = new Canvas(16, 22);

  // Left shard.
  canvas.triangle(1, 20, 4, 10, 7, 20, palette.dark);
  canvas.triangle(2, 20, 4, 11, 6, 20, palette.base);
  canvas.line(4, 12, 4, 19, palette.light);

  // Right shard.
  canvas.triangle(9, 20, 12, 7, 15, 20, palette.dark);
  canvas.triangle(10, 20, 12, 8, 14, 20, palette.base);
  canvas.line(12, 9, 12, 19, palette.bright);

  // Tall center shard.
  canvas.triangle(4, 20, 8, 1, 12, 20, palette.dark);
  canvas.triangle(5, 20, 8, 2, 11, 20, palette.base);
  canvas.triangle(6, 19, 8, 4, 10, 19, palette.light);
  canvas.line(8, 3, 8, 18, palette.bright);

  // Base rubble.
  canvas.rect(2, 20, 13, 2, darken(palette.dark, 0.35));
  canvas.set(2, 19, palette.base);
  canvas.set(13, 19, palette.base);

  return canvas;
}

export const ITEM_IMAGES = [
  { key: 'rock', url: 'assets/items/rock.png', canvas: ROCK },
  { key: 'bone', url: 'assets/items/bone.png', canvas: BONE },
  { key: 'boulder', url: 'assets/items/boulder.png', canvas: BOULDER },
  { key: 'spike', url: 'assets/items/spike.png', canvas: SPIKE },
  { key: 'crate', url: 'assets/items/crate.png', canvas: CRATE },
  { key: 'knife', url: 'assets/items/knife.png', canvas: KNIFE },
  { key: 'flintlock', url: 'assets/items/flintlock.png', canvas: FLINTLOCK },
  { key: 'rune-scroll', url: 'assets/items/rune-scroll.png', canvas: RUNE_SCROLL },
  { key: 'bullet', url: 'assets/items/bullet.png', canvas: BULLET },
  { key: 'salve', url: 'assets/items/salve.png', canvas: SALVE },
  { key: 'ore', url: 'assets/items/ore.png', canvas: ORE },
  { key: 'heart-full', url: 'assets/ui/heart-full.png', canvas: HEART_FULL },
  { key: 'heart-empty', url: 'assets/ui/heart-empty.png', canvas: HEART_EMPTY },
  { key: 'lantern-glow', url: 'assets/fx/lantern-glow.png', canvas: LANTERN_GLOW },
  { key: 'lantern', url: 'assets/props/lantern.png', canvas: LANTERN },
  { key: 'pedestal', url: 'assets/props/pedestal.png', canvas: PEDESTAL },
  { key: 'elevator-door', url: 'assets/props/elevator-door.png', canvas: ELEVATOR_DOOR },
  { key: 'dust', url: 'assets/fx/dust.png', canvas: DUST },
  { key: 'drip', url: 'assets/fx/drip.png', canvas: DRIP },
  { key: 'crystal-teal', url: 'assets/props/crystal-teal.png', canvas: createCrystal('teal') },
  { key: 'crystal-gold', url: 'assets/props/crystal-gold.png', canvas: createCrystal('gold') },
  { key: 'crystal-moss', url: 'assets/props/crystal-moss.png', canvas: createCrystal('moss') },
  { key: 'crystal-rose', url: 'assets/props/crystal-rose.png', canvas: createCrystal('rose') },
];

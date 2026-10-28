import { Canvas, darken, lighten, normalizeMap } from './pixel.mjs';
import { COMMON } from './palette.mjs';

function renderMaps(width, height, maps, palette, name) {
  return maps.map((map, index) => {
    const canvas = new Canvas(width, height);
    canvas.drawMap(normalizeMap(map, width, height, `${name}-${index}`), palette);
    return canvas;
  });
}

const BAT_PALETTE = {
  o: darken(0x3d2c4a, 0.55),
  W: 0x6a4a7a,
  w: 0x4a3458,
  B: 0x3d2c4a,
  b: 0x8a6a9a,
  E: COMMON.lamp,
  f: COMMON.bone,
};

const BAT_MAPS = [
  [
    'o............o',
    'oWo..oooo..oWo',
    'oWWooBBBBooWWo',
    '.oWWoBBBBoWWo.',
    '..oWBBBBBBWo..',
    '...oBBBBBBo...',
    '...oBEBBEBo...',
    '...oBBBBBBo...',
    '....oBffBo....',
    '.....oooo.....',
  ],
  [
    '..............',
    'oWo........oWo',
    'oWWo.oooo.oWWo',
    '.oWWoBBBBoWWo.',
    '..oWBBBBBBWo..',
    '...oBBBBBBo...',
    '...oBEBBEBo...',
    '...oBBBBBBo...',
    '....oBffBo....',
    '.....oooo.....',
  ],
  [
    '..............',
    '..............',
    'oWo..oooo..oWo',
    'oWWooBBBBooWWo',
    '.oWWBBBBBBWWo.',
    '..oWBBBBBBWo..',
    '...oBEBBEBo...',
    '...oBBBBBBo...',
    '....oBffBo....',
    '.....oooo.....',
  ],
  [
    '..............',
    '..............',
    '.oWo.oooo.oWo.',
    '.oWWoBBBBoWWo.',
    '..oWWBBBBWWo..',
    '...oBBBBBBo...',
    '...oBEBBEBo...',
    '...oBBBBBBo...',
    '....oBffBo....',
    '.....oooo.....',
  ],
  [
    '..............',
    '..............',
    'oWo........oWo',
    'oWWo.oooo.oWWo',
    '.oWWBBBBBBWWo.',
    '..oBBBBBBBBo..',
    '..oBBEBBEBBo..',
    '...oBBBBBBo...',
    '....oBffBo....',
    '.....oooo.....',
  ],
  [
    '..............',
    '..............',
    '.oWo......oWo.',
    '.oWWo.oo.oWWo.',
    '..oWWBBBBWWo..',
    '...oBBBBBBo...',
    '...oBEBBEBo...',
    '...oBBBBBBo...',
    '....oBffBo....',
    '.....oooo.....',
  ],
];

const GOBLIN_PALETTE = {
  o: darken(0x2f4a1f, 0.6),
  G: 0x5f8f3f,
  g: 0x3d6128,
  E: COMMON.lamp,
  e: COMMON.ink,
  R: COMMON.bloodBright,
  T: COMMON.bone,
  L: 0x6b4a2f,
  l: 0x8f6b3a,
  A: 0x4f7a35,
  B: COMMON.gold,
  F: 0x2f4a1f,
};

const GOBLIN_HEAD = [
  '................',
  '.....oooooo.....',
  '....oGGGGGGo....',
  '..ooGGGGGGGGoo..',
  '.oGGGGGGGGGGGGo.',
  '.oGGGGGGGGGGGGo.',
  '..oGGoGGGGoGGo..',
  '..oGGEEGGEEGGo..',
  '..oGGEEGGEEGGo..',
  '...oGGGGGGGGo...',
  '....oGTTTTGo....',
  '.....oGGGGo.....',
];

const GOBLIN_HEAD_BLINK = [
  '................',
  '.....oooooo.....',
  '....oGGGGGGo....',
  '..ooGGGGGGGGoo..',
  '.oGGGGGGGGGGGGo.',
  '.oGGGGGGGGGGGGo.',
  '..oGGoGGGGoGGo..',
  '..oGGggGGggGGo..',
  '..oGGggGGggGGo..',
  '...oGGGGGGGGo...',
  '....oGGGGGGo....',
  '.....oGGGGo.....',
];

const GOBLIN_HEAD_WINDUP = [
  '................',
  '.....oooooo.....',
  '....oGGGGGGo....',
  '..ooGGGGGGGGoo..',
  '.oGGGGGGGGGGGGo.',
  '.oGGGGGGGGGGGGo.',
  '..oGGoGGGGoGGo..',
  '..oGGRRGGRRGGo..',
  '..oGGRRGGRRGGo..',
  '...oGGGGGGGGo...',
  '....oGRRRRGo....',
  '.....oGGGGo.....',
];

const GOBLIN_BODY = [
  '....oLLLLLLo....',
  '...oLLLLLLLLo...',
  '..oALLLLLLLLAo..',
  '..oALLLBBLLLAo..',
  '...oLLLLLLLLo...',
];

const GOBLIN_LEGS_IDLE = ['...oGGGoGGGo....', '...oFFo.oFFo....', '....oo...oo.....'];

const GOBLIN_LEGS_A = ['..oGGGooGGGo....', '..oFFo..oFFo....', '...oo....oo.....'];

const GOBLIN_LEGS_B = ['...oGGo.oGGo....', '...oFFo.oFFo....', '....oo...oo.....'];

const GOBLIN_MAPS = [
  [...GOBLIN_HEAD, ...GOBLIN_BODY, ...GOBLIN_LEGS_IDLE],
  [...GOBLIN_HEAD_BLINK, ...GOBLIN_BODY, ...GOBLIN_LEGS_IDLE],
  [...GOBLIN_HEAD, ...GOBLIN_BODY, ...GOBLIN_LEGS_A],
  [...GOBLIN_HEAD_BLINK, ...GOBLIN_BODY, ...GOBLIN_LEGS_B],
  [...GOBLIN_HEAD_WINDUP, ...GOBLIN_BODY, ...GOBLIN_LEGS_B],
  [...GOBLIN_HEAD_WINDUP, ...GOBLIN_BODY, ...GOBLIN_LEGS_A],
];

const SKELETON_PALETTE = {
  o: darken(COMMON.boneShade, 0.55),
  B: COMMON.bone,
  b: COMMON.boneShade,
  E: COMMON.ink,
  e: COMMON.magic,
  T: COMMON.boneDark,
  G: COMMON.steelDark,
};

const SKELETON_HEAD = [
  '................',
  '.....oooooo.....',
  '....oBBBBBBo....',
  '...oBBBBBBBBo...',
  '...oBEEBBEEBo...',
  '...oBEEBBEEBo...',
  '...oBBBBBBBBo...',
  '....oBTTTTBo....',
  '.....oBBBBo.....',
  '......oBBo......',
];

const SKELETON_HEAD_GLOW = [
  '................',
  '.....oooooo.....',
  '....oBBBBBBo....',
  '...oBBBBBBBBo...',
  '...oBeEBBEeBo...',
  '...oBEEBBEEBo...',
  '...oBBBBBBBBo...',
  '....oBTTTTBo....',
  '.....oBBBBo.....',
  '......oBBo......',
];

const SKELETON_TORSO = [
  '...oBBBBBBBBo...',
  '..oBbBBBBBBbBo..',
  '..oB.BBBB.BBo...',
  '..oBb.BB.bBBo...',
  '...oB.BB.BBo....',
  '....oBBBBBBo....',
];

const SKELETON_LEGS_IDLE = [
  '....oBBooBBo....',
  '....oBBo.oBBo...',
  '....oBBo.oBBo...',
  '....oGGo.oGGo...',
  '.....oo...oo....',
  '................',
];

const SKELETON_LEGS_A = [
  '...oBBBBBBBBo...',
  '..oBBo....oBBo..',
  '..oBBo....oBBo..',
  '.oBBo......oBBo.',
  '..oGo......oGo..',
  '...o........o...',
];

const SKELETON_LEGS_B = [
  '...oBBBBBBBBo...',
  '....oBBBBBBo....',
  '....oBBooBBo....',
  '....oBBo.oBBo...',
  '....oGo...oGo...',
  '.....o.....o....',
];

const SKELETON_MAPS = [
  [...SKELETON_HEAD, ...SKELETON_TORSO, ...SKELETON_LEGS_IDLE],
  [...SKELETON_HEAD, ...SKELETON_TORSO, ...SKELETON_LEGS_IDLE],
  [...SKELETON_HEAD, ...SKELETON_TORSO, ...SKELETON_LEGS_A],
  [...SKELETON_HEAD, ...SKELETON_TORSO, ...SKELETON_LEGS_B],
  [...SKELETON_HEAD_GLOW, ...SKELETON_TORSO, ...SKELETON_LEGS_B],
  [...SKELETON_HEAD_GLOW, ...SKELETON_TORSO, ...SKELETON_LEGS_A],
];

const BEETLE_PALETTE = {
  o: darken(COMMON.steelDark, 0.6),
  S: 0x4a515a,
  s: 0x30363d,
  H: 0x6c7580,
  h: 0x8b949e,
  P: 0x5b6067,
  p: 0x3d4147,
  E: COMMON.lamp,
  L: 0x2a2f36,
};

const BEETLE_BODY = [
  '....................',
  '.......oooooo.......',
  '.....ooSSSSSSoo.....',
  '....oSSHHHHHHsSo....',
  '...oSSHHHHHHHHsSo...',
  '..oSSHHHHHHHHHHsSo..',
  '..oPPHHHHHHHHHHEPo..',
  '..oPPPPPPPPPPPPPPo..',
  '..oPpPPPPPPPPPPpPo..',
  '...oPPPPPPPPPPPPo...',
];

const BEETLE_LEGS_IDLE = [
  '...oPo.oPo.oPo.oPo.',
  '...oLo.oLo.oLo.oLo.',
  '..oLLo.oLLo.oLLo....',
  '....................',
];

const BEETLE_LEGS_A = [
  '..oPo..oPo..oPo..oPo',
  '..oLo..oLo..oLo..oLo',
  '.oLLo..oLLo..oLLo...',
  '....................',
];

const BEETLE_LEGS_B = [
  '....oPo.oPo.oPo.oPo.',
  '....oLo.oLo.oLo.oLo.',
  '...oLLo.oLLo.oLLo...',
  '....................',
];

const BEETLE_MAPS = [
  [...BEETLE_BODY, ...BEETLE_LEGS_IDLE],
  [...BEETLE_BODY, ...BEETLE_LEGS_B],
  [...BEETLE_BODY, ...BEETLE_LEGS_A],
  [...BEETLE_BODY, ...BEETLE_LEGS_B],
  [...BEETLE_BODY, ...BEETLE_LEGS_A],
  [...BEETLE_BODY, ...BEETLE_LEGS_A],
];

const WORM_PALETTE = {
  o: darken(0x2b131c, 0.5),
  M: 0x7a3b4a,
  m: 0x4a2432,
  H: 0xa8566a,
  E: COMMON.lamp,
  R: COMMON.bloodBright,
  T: COMMON.bone,
  B: 0x5c2f3d,
};

const WORM_HEAD = [
  '................',
  '.....oooooo.....',
  '...ooMMMMMMoo...',
  '..oMMMMMMMMMMo..',
  '..oMEEMMMMEEMo..',
  '..oMMMMMMMMMMo..',
  '...oMMTTTTMMo...',
  '....oMMMMMMo....',
];

const WORM_TAIL_A = [
  '...oBBMMMMBBo...',
  '..oBBBoMMoBBBo..',
  '.oBBo..oo..oBBo.',
  '.oo.........oo..',
];

const WORM_TAIL_B = [
  '..oBBBMMMMBBBo..',
  '.oBBo.oMMo.oBBo.',
  '.oBo...oo...oBo.',
  '..o.........o...',
];

const WORM_MAPS = [
  [...WORM_HEAD, ...WORM_TAIL_A],
  [
    '................',
    '.....oooooo.....',
    '...ooMMMMMMoo...',
    '..oMMMMMMMMMMo..',
    '..oMmmMMMMmmMo..',
    '..oMMMMMMMMMMo..',
    '...oMMMMMMMo....',
    '....oMMMMMMo....',
    ...WORM_TAIL_A,
  ],
  [
    '................',
    '.....oooooo.....',
    '...ooMMMMMMoo...',
    '..oMMMMMMMMMMo..',
    '..oMEEMMMMEEMo..',
    '..oMMMMMMMMMMo..',
    '...oMMTTTTMMo...',
    '....oMMMMMMo....',
    ...WORM_TAIL_B,
  ],
  [
    '................',
    '.....oooooo.....',
    '...ooMMMMMMoo...',
    '..oMMMMMMMMMMo..',
    '..oMmmMMMMmmMo..',
    '..oMMMMMMMMMMo..',
    '...oMMMMMMMo....',
    '....oMMMMMMo....',
    ...WORM_TAIL_B,
  ],
  [
    '................',
    '.....oooooo.....',
    '...ooMMMMMMoo...',
    '..oMMMMMMMMMMo..',
    '..oMRRMMMMRRMo..',
    '..oMMMMMMMMMMo..',
    '...oMTTTTTTMo...',
    '....oMMMMMMo....',
    ...WORM_TAIL_A,
  ],
  [
    '................',
    '.....oooooo.....',
    '...ooMMMMMMoo...',
    '..oMMMMMMMMMMo..',
    '..oMRRMMMMRRMo..',
    '..oMMMMMMMMMMo..',
    '...oMMMMMMMo....',
    '..oMMTTTTTTMMo..',
    ...WORM_TAIL_B,
  ],
];

const DUMMY_PALETTE = {
  o: darken(0x3a2818, 0.5),
  S: 0xc9a227,
  s: 0xa8841d,
  e: COMMON.ink,
  W: 0x6b4a2f,
  w: 0x4a3320,
  P: 0x8f7a52,
  p: 0x6f5d3d,
  R: COMMON.bloodBright,
  r: COMMON.blood,
};

const DUMMY_MAPS = [
  [
    '................',
    '.....oooooo.....',
    '....oSSSSSSo....',
    '...oSSSSSSSSo...',
    '...oSSeSSSeSSo..',
    '...oSSSSSSSSo...',
    '...oSssssssSSo..',
    '....oSSSSSSo....',
    '.....oSSSSo.....',
    '....oWPPPPWo....',
    '...oWWPPPPWWo...',
    '...oWPPRRPPWo...',
    '...oWPRRRRPWo...',
    '...oWPPRRPPWo...',
    '...oWWPPPPWWo...',
    '....oWPPPPWo....',
    '.....oWPPWo.....',
    '.....oWPPWo.....',
    '....oWWPPWWo....',
    '.....oooooo.....',
  ],
  [
    '................',
    '.....oooooo.....',
    '....oSSSSSSo....',
    '...oSSSSSSSSo...',
    '...oSSeSSSeSSo..',
    '...oSSSSSSSSo...',
    '...oSssssssSSo..',
    '....oSSSSSSo....',
    '.....oSSSSo.....',
    '....oWPPPPWo....',
    '...oWWPPPPWWo...',
    '...oWPPRRPPWo...',
    '...oWPRRRRPWo...',
    '...oWPPRRPPWo...',
    '...oWWPPPPWWo...',
    '....oWPPPPWo....',
    '.....oWPPWo.....',
    '.....oWPPWo.....',
    '....oWWPPWWo....',
    '.....oooooo.....',
  ],
];

function createEnemyAssets() {
  const batFrames = renderMaps(14, 10, BAT_MAPS, BAT_PALETTE, 'bat');
  const goblinFrames = renderMaps(16, 20, GOBLIN_MAPS, GOBLIN_PALETTE, 'goblin');
  const skeletonFrames = renderMaps(16, 22, SKELETON_MAPS, SKELETON_PALETTE, 'skeleton');
  const beetleFrames = renderMaps(20, 14, BEETLE_MAPS, BEETLE_PALETTE, 'beetle');
  const wormFrames = renderMaps(16, 12, WORM_MAPS, WORM_PALETTE, 'wormling');
  const dummyFrames = renderMaps(16, 20, DUMMY_MAPS, DUMMY_PALETTE, 'dummy');

  return [
    {
      key: 'bat',
      url: 'assets/sprites/bat.png',
      frameWidth: 14,
      frameHeight: 10,
      frames: batFrames,
      animations: [
        { key: 'bat-idle', frames: [0, 1], frameRate: 4, repeat: -1 },
        { key: 'bat-move', frames: [2, 3], frameRate: 12, repeat: -1 },
        { key: 'bat-windup', frames: [4], frameRate: 1, repeat: 0 },
        { key: 'bat-attack', frames: [5], frameRate: 1, repeat: 0 },
      ],
    },
    {
      key: 'goblin',
      url: 'assets/sprites/goblin.png',
      frameWidth: 16,
      frameHeight: 20,
      frames: goblinFrames,
      animations: [
        { key: 'goblin-idle', frames: [0, 1], frameRate: 2, repeat: -1 },
        { key: 'goblin-move', frames: [2, 3], frameRate: 9, repeat: -1 },
        { key: 'goblin-windup', frames: [4], frameRate: 1, repeat: 0 },
        { key: 'goblin-attack', frames: [5], frameRate: 1, repeat: 0 },
      ],
    },
    {
      key: 'skeleton',
      url: 'assets/sprites/skeleton.png',
      frameWidth: 16,
      frameHeight: 22,
      frames: skeletonFrames,
      animations: [
        { key: 'skeleton-idle', frames: [0, 1], frameRate: 2, repeat: -1 },
        { key: 'skeleton-move', frames: [2, 3], frameRate: 6, repeat: -1 },
        { key: 'skeleton-windup', frames: [4], frameRate: 1, repeat: 0 },
        { key: 'skeleton-attack', frames: [5], frameRate: 1, repeat: 0 },
      ],
    },
    {
      key: 'beetle',
      url: 'assets/sprites/beetle.png',
      frameWidth: 20,
      frameHeight: 14,
      frames: beetleFrames,
      animations: [
        { key: 'beetle-idle', frames: [0, 1], frameRate: 2, repeat: -1 },
        { key: 'beetle-move', frames: [2, 3], frameRate: 8, repeat: -1 },
        { key: 'beetle-windup', frames: [4], frameRate: 1, repeat: 0 },
        { key: 'beetle-attack', frames: [5], frameRate: 1, repeat: 0 },
      ],
    },
    {
      key: 'wormling',
      url: 'assets/sprites/wormling.png',
      frameWidth: 16,
      frameHeight: 12,
      frames: wormFrames,
      animations: [
        { key: 'wormling-idle', frames: [0, 1], frameRate: 3, repeat: -1 },
        { key: 'wormling-move', frames: [2, 3], frameRate: 10, repeat: -1 },
        { key: 'wormling-windup', frames: [4], frameRate: 1, repeat: 0 },
        { key: 'wormling-attack', frames: [5], frameRate: 1, repeat: 0 },
      ],
    },
    {
      key: 'dummy',
      url: 'assets/sprites/dummy.png',
      frameWidth: 16,
      frameHeight: 20,
      frames: dummyFrames,
      animations: [
        { key: 'dummy-idle', frames: [0, 1], frameRate: 2, repeat: -1 },
        { key: 'dummy-move', frames: [0, 1], frameRate: 2, repeat: -1 },
        { key: 'dummy-windup', frames: [0], frameRate: 1, repeat: 0 },
        { key: 'dummy-attack', frames: [0], frameRate: 1, repeat: 0 },
      ],
    },
  ];
}

export const ENEMY_ASSETS = createEnemyAssets();

// Keep the palette helpers exercised so future enemy variants stay consistent.
void lighten;

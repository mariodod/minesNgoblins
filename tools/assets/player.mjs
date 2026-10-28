import { Canvas, darken, lighten, sheet, validateMap } from './pixel.mjs';

const WIDTH = 16;
const HEIGHT = 24;

/*
 * The miner is authored as a body plus a pair of legs so each animation frame
 * reuses the upper body. A dark brim separates the helmet from the face, and
 * the lamp is part of the helmet silhouette so it reads at 1x scale.
 */

const BODY_BASE = [
  '................',
  '....oooooooo....',
  '...oHHHHHHHHo...',
  '...oHhhhhhhHo...',
  '...oHhLLLLhHo...',
  '...oHhssssHho...',
  '..oooooooooooo..',
  '...oFFFFFFFFo...',
  '...oFFFFFFFFo...',
  '...oFFEFFEFFo...',
  '...oFfFFFFfFo...',
  '....oFFFFFFo....',
  '....oSSSSSSo....',
  '...oJJJJJJJJo...',
  '..oAJJJJJJJJAo..',
  '..oAJJBBBBJJAo..',
  '..oAJJBbbBJJAo..',
  '..oAJJJJJJJJAo..',
  '..oFJJJJJJJJFo..',
];

const BODY_BREATHE = [
  '................',
  '....oooooooo....',
  '...oHHHHHHHHo...',
  '...oHhhhhhhHo...',
  '...oHhllllhHo...',
  '...oHhssssHho...',
  '..oooooooooooo..',
  '...oFFFFFFFFo...',
  '...oFFFFFFFFo...',
  '...oFF-FF-FFo...',
  '...oFfFFFFfFo...',
  '....oFFFFFFo....',
  '....oSSSSSSo....',
  '...oJJJJJJJJo...',
  '..oAJJJJJJJJAo..',
  '..oAJJBBBBJJAo..',
  '..oAJJBbbBJJAo..',
  '..oAJJJJJJJJAo..',
  '..oFJJJJJJJJFo..',
];

const BODY_HURT = [
  '................',
  '...oooooooo.....',
  '..oHHHHHHHHo....',
  '..oHhhhhhhHo....',
  '..oHhLLLLhHo....',
  '..oHhssssHho....',
  '.oooooooooooo...',
  '..oFFFFFFFFo....',
  '..oFFFFFFFFo....',
  '..oFF-FF-FFo....',
  '..oFfFDDfFo.....',
  '...oFFFFFFo.....',
  '...oSSSSSSo.....',
  '..oJJJJJJJJo....',
  '.oAJJJJJJJJAo...',
  '.oAJJBBBBJJAo...',
  '.oAJJBbbBJJAo...',
  '.oAJJJJJJJJAo...',
  '.oFJJJJJJJJFo...',
];

const LEGS_IDLE = [
  '...oPPPPPPPPo...',
  '....oPPooPPo....',
  '....oPPo.oPPo...',
  '....oGGo.oGGo...',
  '.....oo...oo....',
];

const LEGS_RUN_A = [
  '...oPPPPPPPPo...',
  '..oPPo....oPPo..',
  '..oPPo....oPPo..',
  '.oGGo......oGGo.',
  '..oo........oo..',
];

const LEGS_RUN_B = [
  '...oPPPPPPPPo...',
  '....oPPPPPPo....',
  '....oPPooPPo....',
  '....oGGo.oGGo...',
  '.....oo...oo....',
];

const LEGS_JUMP = [
  '...oPPPPPPPPo...',
  '..oPPPPPPPPPPo..',
  '..oPPo....oPPo..',
  '.oGGo......oGGo.',
  '..oo........oo..',
];

const LEGS_HURT = [
  '...oPPPPPPPPo...',
  '..oPPPPPPPPPPo..',
  '.oPPo......oPPo.',
  '.oGGo......oGGo.',
  '..oo........oo..',
];

for (const [name, map, height] of [
  ['body-base', BODY_BASE, 19],
  ['body-breathe', BODY_BREATHE, 19],
  ['body-hurt', BODY_HURT, 19],
  ['legs-idle', LEGS_IDLE, 5],
  ['legs-run-a', LEGS_RUN_A, 5],
  ['legs-run-b', LEGS_RUN_B, 5],
  ['legs-jump', LEGS_JUMP, 5],
  ['legs-hurt', LEGS_HURT, 5],
]) {
  validateMap(map, WIDTH, height, name);
}

const FRAME_MAPS = [
  [...BODY_BASE, ...LEGS_IDLE],
  [...BODY_BREATHE, ...LEGS_IDLE],
  [...BODY_BASE, ...LEGS_RUN_A],
  [...BODY_BREATHE, ...LEGS_RUN_B],
  [...BODY_BASE, ...LEGS_RUN_B],
  [...BODY_BREATHE, ...LEGS_RUN_A],
  [...BODY_BASE, ...LEGS_JUMP],
  [...BODY_HURT, ...LEGS_HURT],
];

FRAME_MAPS.forEach((map, index) => {
  validateMap(map, WIDTH, HEIGHT, `player-frame-${index}`);
});

/**
 * Palette roles stay stable across skins, so one authored silhouette carries
 * every cosmetic reward without a separate art pipeline per skin.
 */
export function playerPalette(palette) {
  return {
    o: darken(palette.clothesShade, 0.6),
    H: palette.helmet,
    h: palette.helmetHighlight,
    s: darken(palette.helmet, 0.38),
    L: palette.lamp,
    l: darken(palette.lamp, 0.45),
    F: palette.skin,
    f: palette.skinShade,
    E: palette.eyes,
    '-': darken(palette.skinShade, 0.4),
    D: darken(palette.skinShade, 0.25),
    S: lighten(palette.clothes, 0.32),
    J: palette.clothes,
    A: palette.arms,
    B: palette.bootShade,
    b: palette.helmetHighlight,
    P: palette.clothesShade,
    G: palette.boots,
    g: palette.bootShade,
  };
}

export function renderPlayerFrames(palette) {
  const colors = playerPalette(palette);
  return FRAME_MAPS.map((map) => {
    const frame = new Canvas(WIDTH, HEIGHT);
    frame.drawMap(map, colors);
    return frame;
  });
}

export function renderPlayerSheet(palette) {
  return sheet(renderPlayerFrames(palette), WIDTH, HEIGHT);
}

export const PLAYER_FRAME = { width: WIDTH, height: HEIGHT };

export const PLAYER_ANIMATIONS = {
  idle: { frames: [0, 1], frameRate: 2, repeat: -1 },
  run: { frames: [2, 3, 4, 5], frameRate: 12, repeat: -1 },
  jump: { frames: [6], frameRate: 1, repeat: 0 },
  hurt: { frames: [7], frameRate: 1, repeat: 0 },
};

import { Canvas, darken } from './pixel.mjs';
import { COMMON } from './palette.mjs';

const FLESH = 0x6b3444;
const FLESH_DARK = 0x3a1b27;
const FLESH_DEEP = 0x2b131c;
const FLESH_LIGHT = 0x8a4656;
const FLESH_PALE = 0xa8566a;
const BONE = COMMON.bone;
const BONE_SHADE = COMMON.boneShade;
const INK = 0x1a0b0f;

function outlinedEllipse(canvas, cx, cy, rx, ry, outline, fill) {
  canvas.ellipse(cx, cy, rx + 1, ry + 1, outline);
  canvas.ellipse(cx, cy, rx, ry, fill);
}

function drawWormHead(open) {
  const canvas = new Canvas(40, 32);

  // Neck and skull mass. The snout juts to the right so the direction reads at
  // a glance even when the sprite is flipped for the other arena side.
  outlinedEllipse(canvas, 16, 17, 16, 12, INK, FLESH_DARK);
  canvas.ellipse(17, 17, 14, 10, FLESH);
  canvas.ellipse(14, 12, 9, 5, FLESH_LIGHT);
  canvas.ellipse(12, 10, 5, 2, FLESH_PALE);

  // Lower jaw, drawn before the maw so the mouth sits inside it.
  outlinedEllipse(canvas, 33, 25, 7, 4, INK, FLESH_DARK);
  canvas.ellipse(33, 24, 6, 3, FLESH);

  // Bone plate across the crown.
  canvas.ellipse(21, 9, 10, 5, darken(BONE_SHADE, 0.55));
  canvas.ellipse(21, 9, 9, 4, BONE_SHADE);
  canvas.ellipse(20, 8, 8, 3, BONE);
  canvas.line(16, 8, 20, 6, BONE_SHADE);
  canvas.line(23, 6, 25, 9, BONE_SHADE);
  canvas.line(27, 7, 29, 10, BONE_SHADE);

  // Amber eye beneath the bone ridge. The gameplay weak-spot marker sits here.
  canvas.ellipse(27, 12, 5, 5, INK);
  canvas.ellipse(27, 12, 4, 4, BONE_SHADE);
  canvas.ellipse(27, 12, 3, 3, COMMON.lamp);
  canvas.ellipse(28, 12, 1, 2, COMMON.lampBright);
  canvas.set(26, 13, darken(COMMON.lamp, 0.55));

  // Dorsal spikes along the back.
  for (let index = 0; index < 4; index += 1) {
    const x = 4 + index * 4;
    const height = 4 + (index % 2);
    canvas.triangle(x, 6, x + 2, 6 - height, x + 4, 6, FLESH_LIGHT);
    canvas.triangle(x + 1, 5, x + 2, 6 - height, x + 3, 5, BONE_SHADE);
  }

  // Segmented armor rings on the neck.
  for (let x = 2; x <= 12; x += 4) {
    canvas.vline(x, 14, 10, darken(FLESH, 0.25));
    canvas.vline(x + 1, 15, 8, FLESH_LIGHT);
  }

  // Maw: a dark ellipse with a tongue and two rows of bone teeth.
  const mouthY = open ? 19 : 20;
  const mouthRy = open ? 6 : 5;
  canvas.ellipse(33, mouthY, 7, mouthRy, INK);
  canvas.ellipse(33, mouthY, 6, mouthRy - 1, 0x7a1f2b);

  const toothCount = open ? 7 : 5;
  const startX = open ? 27 : 28;
  for (let index = 0; index < toothCount; index += 1) {
    const x = startX + index * 2;
    canvas.triangle(
      x,
      mouthY - mouthRy + 1,
      x + 1,
      mouthY - mouthRy + 4,
      x + 2,
      mouthY - mouthRy + 1,
      BONE,
    );
    canvas.triangle(
      x,
      mouthY + mouthRy - 1,
      x + 1,
      mouthY + mouthRy - 4,
      x + 2,
      mouthY + mouthRy - 1,
      BONE_SHADE,
    );
  }

  canvas.ellipse(32, mouthY + (open ? 3 : 2), 3, 1, 0xc8504a);
  canvas.set(31, mouthY + (open ? 3 : 2), 0xff9a8a);

  // Scars and scale flecks.
  canvas.line(6, 20, 11, 24, FLESH_DEEP);
  canvas.line(12, 23, 15, 27, FLESH_DEEP);
  canvas.set(20, 12, FLESH_PALE);
  canvas.set(10, 18, FLESH_LIGHT);
  canvas.set(34, 12, FLESH_LIGHT);

  return canvas;
}

function drawWormSegment() {
  const canvas = new Canvas(24, 20);

  outlinedEllipse(canvas, 12, 10, 11, 8, INK, FLESH_DARK);
  canvas.ellipse(12, 10, 10, 7, FLESH);
  canvas.ellipse(12, 8, 7, 4, FLESH_LIGHT);

  // Armor bands.
  canvas.vline(6, 5, 11, darken(FLESH, 0.3));
  canvas.vline(12, 4, 13, FLESH_DEEP);
  canvas.vline(18, 5, 11, darken(FLESH, 0.3));
  canvas.vline(7, 6, 9, FLESH_PALE);
  canvas.vline(13, 5, 10, FLESH_PALE);
  canvas.vline(19, 6, 8, FLESH_PALE);

  // Dorsal spike and bone ridge.
  canvas.triangle(9, 4, 12, -2, 15, 4, BONE_SHADE);
  canvas.triangle(10, 3, 12, -1, 14, 3, BONE);
  canvas.hline(5, 13, 14, FLESH_DEEP);
  canvas.set(4, 9, FLESH_LIGHT);
  canvas.set(20, 11, FLESH_LIGHT);

  return canvas;
}

function drawBurrowHole() {
  const canvas = new Canvas(32, 10);

  canvas.ellipse(16, 6, 15, 4, 0x050608);
  canvas.ellipse(16, 5, 14, 4, 0x231318);
  canvas.ellipse(16, 6, 11, 3, 0x08050a);

  // Displaced dirt and flecks of bone.
  const dirt = 0x4a3326;
  const dirtLight = 0x6b4a2f;
  const dirtDark = 0x2c1b10;

  canvas.set(1, 4, dirt);
  canvas.set(2, 4, dirtLight);
  canvas.set(3, 5, dirt);
  canvas.set(27, 4, dirt);
  canvas.set(28, 4, dirtLight);
  canvas.set(29, 5, dirt);
  canvas.set(4, 8, dirtDark);
  canvas.set(7, 8, dirt);
  canvas.set(24, 8, dirt);
  canvas.set(27, 8, dirtDark);
  canvas.set(10, 1, dirtLight);
  canvas.set(21, 1, dirtLight);
  canvas.set(14, 8, BONE_SHADE);
  canvas.set(18, 8, BONE_SHADE);
  canvas.hline(4, 3, 4, darken(FLESH, 0.2));
  canvas.hline(24, 3, 4, darken(FLESH, 0.2));

  return canvas;
}

function drawShockwave(frame) {
  const canvas = new Canvas(18, 12);
  const sizes = [7, 9, 8];
  const height = sizes[frame] ?? 8;
  const leadX = 17;

  // Dust tail.
  canvas.ellipse(4, 8, 4, 3, 0x4a3a2a);
  canvas.ellipse(2, 9, 3, 2, 0x6b5540);
  canvas.ellipse(7, 9, 3, 2, 0x3a2d21);

  // Bright leading edge.
  canvas.triangle(leadX, 6, 4, 6 - height, 4, 6 + height, COMMON.lampDim);
  canvas.triangle(leadX, 6, 6, 7 - height, 6, 5 + height, COMMON.lamp);
  canvas.triangle(leadX - 2, 6, 8, 8 - height, 8, 4 + height, COMMON.lampBright);

  // Crackling teeth on the wave.
  for (let index = 0; index < 3; index += 1) {
    const x = 7 + index * 3 + (frame % 2);
    canvas.line(x, 6, x + 2, 3 - (index % 2), 0xffe6a0);
    canvas.line(x, 6, x + 1, 9 + (index % 2), 0xc9973c);
  }

  return canvas;
}

export function createBossAssets() {
  const headFrames = [drawWormHead(false), drawWormHead(true)];
  const shockFrames = [drawShockwave(0), drawShockwave(1), drawShockwave(2)];

  return [
    {
      key: 'worm-head',
      url: 'assets/sprites/worm-head.png',
      frameWidth: 40,
      frameHeight: 32,
      frames: headFrames,
      animations: [
        { key: 'worm-head-idle', frames: [0], frameRate: 1, repeat: 0 },
        { key: 'worm-head-roar', frames: [1], frameRate: 1, repeat: 0 },
      ],
    },
    {
      key: 'shockwave',
      url: 'assets/sprites/shockwave.png',
      frameWidth: 18,
      frameHeight: 12,
      frames: shockFrames,
      animations: [{ key: 'shockwave-move', frames: [0, 1, 2], frameRate: 14, repeat: -1 }],
    },
  ];
}

export const BOSS_IMAGES = [
  {
    key: 'worm-segment',
    url: 'assets/sprites/worm-segment.png',
    canvas: drawWormSegment(),
  },
  {
    key: 'burrow-hole',
    url: 'assets/sprites/burrow-hole.png',
    canvas: drawBurrowHole(),
  },
];

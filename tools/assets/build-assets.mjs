import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOSS_IMAGES, createBossAssets } from './boss.mjs';
import { buildAudio } from '../audio/build-audio.mjs';
import { ENEMY_ASSETS } from './enemies.mjs';
import { createPixelFont } from './font.mjs';
import { ITEM_IMAGES } from './items.mjs';
import { PLAYER_ANIMATIONS, PLAYER_FRAME, renderPlayerSheet } from './player.mjs';
import { sheet } from './pixel.mjs';
import { TILE_IMAGES, TITLE_BACKDROP } from './tiles.mjs';
import { writePng } from './png.mjs';
import { SKIN_LIST, skinTextureKey } from '../../src/data/skins.ts';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..', '..');
const publicRoot = join(projectRoot, 'public');
const manifestPath = join(projectRoot, 'src', 'data', 'asset-manifest.json');

const images = [];
const spritesheets = [];

function writeImageAsset(asset) {
  const target = join(publicRoot, asset.url);
  mkdirSync(dirname(target), { recursive: true });
  writePng(target, asset.canvas.width, asset.canvas.height, asset.canvas.toBuffer());
  images.push({
    key: asset.key,
    url: asset.url,
    width: asset.canvas.width,
    height: asset.canvas.height,
  });
}

function writeSpritesheetAsset({ key, url, frameWidth, frameHeight, canvas, animations }) {
  const target = join(publicRoot, url);
  mkdirSync(dirname(target), { recursive: true });
  writePng(target, canvas.width, canvas.height, canvas.toBuffer());
  spritesheets.push({
    key,
    url,
    frameWidth,
    frameHeight,
    frameCount: canvas.width / frameWidth,
    animations: animations.map((animation) => ({
      key: animation.key,
      frames: animation.frames,
      frameRate: animation.frameRate,
      repeat: animation.repeat,
    })),
  });
}

for (const skin of SKIN_LIST) {
  const textureKey = skinTextureKey(skin.id);

  writeSpritesheetAsset({
    key: textureKey,
    url: `assets/sprites/player-${skin.id}.png`,
    frameWidth: PLAYER_FRAME.width,
    frameHeight: PLAYER_FRAME.height,
    canvas: renderPlayerSheet(skin.palette),
    animations: Object.entries(PLAYER_ANIMATIONS).map(([state, animation]) => ({
      key: `${textureKey}-${state}`,
      ...animation,
    })),
  });
}

for (const asset of ENEMY_ASSETS) {
  writeSpritesheetAsset({
    key: asset.key,
    url: asset.url,
    frameWidth: asset.frameWidth,
    frameHeight: asset.frameHeight,
    canvas: sheet(asset.frames, asset.frameWidth, asset.frameHeight),
    animations: asset.animations,
  });
}

for (const asset of createBossAssets()) {
  writeSpritesheetAsset({
    key: asset.key,
    url: asset.url,
    frameWidth: asset.frameWidth,
    frameHeight: asset.frameHeight,
    canvas: sheet(asset.frames, asset.frameWidth, asset.frameHeight),
    animations: asset.animations,
  });
}

for (const asset of BOSS_IMAGES) {
  writeImageAsset(asset);
}

for (const asset of ITEM_IMAGES) {
  writeImageAsset(asset);
}

for (const asset of TILE_IMAGES) {
  writeImageAsset(asset);
}

writeImageAsset(TITLE_BACKDROP);

const pixelFont = createPixelFont();
const fontTarget = join(publicRoot, 'assets', 'fonts', 'pixel-5x7.png');
mkdirSync(dirname(fontTarget), { recursive: true });
writePng(fontTarget, pixelFont.canvas.width, pixelFont.canvas.height, pixelFont.canvas.toBuffer());
writeFileSync(join(publicRoot, 'assets', 'fonts', 'pixel-5x7.xml'), pixelFont.xml);

const manifest = {
  version: 1,
  images,
  spritesheets,
  bitmapFonts: [
    {
      key: 'pixel-5x7',
      textureUrl: 'assets/fonts/pixel-5x7.png',
      dataUrl: 'assets/fonts/pixel-5x7.xml',
    },
  ],
  audio: buildAudio(publicRoot, projectRoot),
};

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const imageCount = images.length;
const sheetCount = spritesheets.length;
const animationCount = spritesheets.reduce((total, asset) => total + asset.animations.length, 0);

console.log(
  `Generated ${imageCount} images, ${sheetCount} spritesheets, ${animationCount} animations, ` +
    '1 bitmap font, and the audio pack.',
);

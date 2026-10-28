import { Canvas, darken, lighten, mix, seededRandom } from './pixel.mjs';
import { COMMON, CRYSTAL_PALETTES, THEMES } from './palette.mjs';

const STONE_TILE = 16;
const WOOD_TILE = 16;
const BACKGROUND_TILE = 64;

function hashId(id) {
  let hash = 2166136261;

  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function wrapSet(canvas, x, y, color, alpha = 255) {
  const size = canvas.width;
  canvas.set(((x % size) + size) % size, ((y % size) + size) % size, color, alpha);
}

function wrapEllipse(canvas, cx, cy, radiusX, radiusY, color, alpha = 255) {
  const size = canvas.width;

  for (let offsetY = -size; offsetY <= size; offsetY += size) {
    for (let offsetX = -size; offsetX <= size; offsetX += size) {
      const shiftedX = cx + offsetX;
      const shiftedY = cy + offsetY;

      if (
        shiftedX + radiusX < 0 ||
        shiftedY + radiusY < 0 ||
        shiftedX - radiusX >= size ||
        shiftedY - radiusY >= size
      ) {
        continue;
      }

      canvas.blendEllipse(shiftedX, shiftedY, radiusX, radiusY, color, alpha);
    }
  }
}

function createPillarTile(theme) {
  const canvas = new Canvas(8, 16);
  const wood = theme.wood;
  const random = seededRandom(hashId(`${theme.id}-pillar`));

  canvas.rect(0, 0, 8, 16, wood.base);
  canvas.vline(0, 0, 16, wood.dark);
  canvas.vline(1, 0, 16, wood.light);
  canvas.vline(2, 0, 16, lighten(wood.light, 0.18));
  canvas.vline(7, 0, 16, wood.dark);
  canvas.vline(6, 0, 16, wood.shade);

  for (let index = 0; index < 4; index += 1) {
    const y = 2 + Math.floor(random() * 12);
    const width = 1 + Math.floor(random() * 3);
    canvas.hline(3, y, width, wood.shade);
  }

  // Iron strap at the tile midpoint, repeated every 16 pixels.
  canvas.rect(0, 7, 8, 2, wood.metal);
  canvas.hline(0, 7, 8, lighten(wood.metal, 0.25));
  canvas.set(2, 7, wood.dark);
  canvas.set(5, 8, wood.dark);

  return canvas;
}

function createBeamTile(theme) {
  const canvas = new Canvas(16, 8);
  const wood = theme.wood;
  const random = seededRandom(hashId(`${theme.id}-beam`));

  canvas.rect(0, 0, 16, 8, wood.base);
  canvas.hline(0, 0, 16, wood.dark);
  canvas.hline(0, 1, 16, wood.light);
  canvas.hline(0, 2, 16, lighten(wood.light, 0.18));
  canvas.hline(0, 7, 16, wood.dark);

  for (let index = 0; index < 4; index += 1) {
    const x = Math.floor(random() * 14);
    const y = 3 + Math.floor(random() * 3);
    canvas.hline(x, y, 1 + Math.floor(random() * 3), wood.shade);
  }

  return canvas;
}

/**
 * Two courses of offset blocks. Mortar lines sit on the texture edge so the
 * pattern stays seamless when a solid is wider than one tile.
 */
function createStoneTile(theme) {
  const canvas = new Canvas(STONE_TILE, STONE_TILE);
  const stone = theme.stone;
  const random = seededRandom(hashId(theme.id));

  canvas.rect(0, 0, STONE_TILE, STONE_TILE, stone.mid);
  canvas.hline(0, 0, STONE_TILE, stone.dark);
  canvas.hline(0, 8, STONE_TILE, stone.dark);

  const drawBlock = (x, y, width, height, highlightLeft = true) => {
    canvas.rect(x, y, width, height, stone.base);

    if (highlightLeft) {
      canvas.vline(x, y, height, stone.light);
    }

    canvas.hline(x, y, width, stone.light);
    canvas.hline(x, y + height - 1, width, stone.shade);
    canvas.vline(x + width - 1, y, height, stone.shade);

    const speckles = 2 + Math.floor(random() * 4);

    for (let index = 0; index < speckles; index += 1) {
      const speckX = x + 1 + Math.floor(random() * Math.max(1, width - 3));
      const speckY = y + 1 + Math.floor(random() * Math.max(1, height - 3));
      canvas.set(speckX, speckY, random() > 0.5 ? stone.shade : stone.light);
    }
  };

  drawBlock(1, 1, 7, 7);
  drawBlock(9, 1, 7, 7);

  // Bottom course is offset by half a block. Its left edge wraps across the
  // tile seam, so that segment has no artificial highlight at x = 0.
  drawBlock(5, 9, 7, 7);
  drawBlock(13, 9, 3, 7);
  canvas.rect(0, 9, 4, 7, stone.base);
  canvas.hline(0, 9, 4, stone.light);
  canvas.hline(0, 15, 4, stone.shade);
  canvas.vline(3, 9, 7, stone.shade);

  // Mineral veins appear once per theme, kept faint so they do not read as
  // pickups or hazards.
  const mineralY = 2 + Math.floor(random() * 12);
  canvas.set(4 + Math.floor(random() * 8), mineralY, stone.mineral);
  canvas.set(10 + Math.floor(random() * 4), 5 + Math.floor(random() * 9), stone.mineral);

  // Hairline cracks.
  const crackX = 2 + Math.floor(random() * 12);
  canvas.set(crackX, 3, stone.dark);
  canvas.set(crackX + 1, 4, stone.dark);
  canvas.set(crackX + 1, 5, stone.dark);

  return canvas;
}

function createWoodTile(theme) {
  const canvas = new Canvas(WOOD_TILE, WOOD_TILE);
  const wood = theme.wood;
  const random = seededRandom(hashId(`${theme.id}-wood`));

  canvas.rect(0, 0, WOOD_TILE, WOOD_TILE, wood.base);
  canvas.hline(0, 0, WOOD_TILE, wood.dark);
  canvas.hline(0, 1, WOOD_TILE, wood.light);
  canvas.hline(0, 2, WOOD_TILE, lighten(wood.light, 0.16));
  canvas.hline(0, 11, WOOD_TILE, wood.shade);
  canvas.rect(0, 12, WOOD_TILE, 4, wood.dark);

  // Plank seam at the tile edge, with a lit lip on the next plank.
  canvas.vline(0, 0, 12, wood.dark);
  canvas.vline(1, 2, 9, wood.light);

  for (let index = 0; index < 5; index += 1) {
    const y = 4 + Math.floor(random() * 7);
    const start = 2 + Math.floor(random() * 8);
    const width = 2 + Math.floor(random() * 5);
    canvas.hline(start, y, Math.min(width, WOOD_TILE - start), wood.shade);
  }

  // Iron bracket and rivets.
  canvas.rect(3, 2, 3, 2, wood.metal);
  canvas.set(3, 2, lighten(wood.metal, 0.3));
  canvas.rect(11, 10, 3, 2, wood.metal);
  canvas.set(12, 10, lighten(wood.metal, 0.3));

  return canvas;
}

/**
 * Wrapped rock blobs and quiet strata keep the backdrop from showing a grid
 * while staying dark enough for silhouettes and projectiles.
 */
function createBackgroundTile(theme) {
  const canvas = new Canvas(BACKGROUND_TILE, BACKGROUND_TILE);
  const background = theme.background;
  const random = seededRandom(hashId(`${theme.id}-background`));

  canvas.rect(0, 0, BACKGROUND_TILE, BACKGROUND_TILE, background.deep);

  for (let index = 0; index < 26; index += 1) {
    const x = Math.floor(random() * BACKGROUND_TILE);
    const y = Math.floor(random() * BACKGROUND_TILE);
    const radiusX = 5 + Math.floor(random() * 13);
    const radiusY = 3 + Math.floor(random() * 8);
    wrapEllipse(canvas, x, y, radiusX, radiusY, background.mid, 120);
  }

  for (let index = 0; index < 20; index += 1) {
    const x = Math.floor(random() * BACKGROUND_TILE);
    const y = Math.floor(random() * BACKGROUND_TILE);
    const radiusX = 3 + Math.floor(random() * 8);
    const radiusY = 2 + Math.floor(random() * 5);
    wrapEllipse(canvas, x, y, radiusX, radiusY, background.rock, 110);
  }

  for (let index = 0; index < 12; index += 1) {
    const x = Math.floor(random() * BACKGROUND_TILE);
    const y = Math.floor(random() * BACKGROUND_TILE);
    const radiusX = 2 + Math.floor(random() * 4);
    const radiusY = 1 + Math.floor(random() * 3);
    wrapEllipse(canvas, x, y, radiusX, radiusY, background.rockLight, 70);
  }

  // Short strata dashes.
  for (let index = 0; index < 10; index += 1) {
    const y = Math.floor(random() * BACKGROUND_TILE);
    const start = Math.floor(random() * BACKGROUND_TILE);
    const width = 4 + Math.floor(random() * 12);

    for (let offset = 0; offset < width; offset += 1) {
      wrapSet(canvas, start + offset, y, background.accent, 65);
    }
  }

  // Mineral flecks and dust.
  for (let index = 0; index < 8; index += 1) {
    wrapSet(
      canvas,
      Math.floor(random() * BACKGROUND_TILE),
      Math.floor(random() * BACKGROUND_TILE),
      background.accent,
      140,
    );
  }

  for (let index = 0; index < 4; index += 1) {
    wrapSet(
      canvas,
      Math.floor(random() * BACKGROUND_TILE),
      Math.floor(random() * BACKGROUND_TILE),
      background.glow,
      80,
    );
  }

  return canvas;
}

function createTitleBackdrop() {
  const theme = THEMES['shaft-entrance'];
  const background = theme.background;
  const stone = theme.stone;
  const wood = theme.wood;
  const crystal = CRYSTAL_PALETTES.teal;
  const canvas = new Canvas(480, 270);
  const random = seededRandom(0x5eed);

  // Depth gradient.
  for (let band = 0; band < 15; band += 1) {
    const color =
      band < 5
        ? mix(background.deep, background.mid, band / 5)
        : mix(background.mid, background.rock, (band - 5) / 10);
    canvas.rect(0, band * 18, 480, 18, color);
  }

  // Distant cave shapes.
  canvas.triangle(0, 270, 58, 108, 142, 270, background.rock);
  canvas.triangle(0, 270, 22, 168, 82, 270, background.rockLight);
  canvas.triangle(342, 270, 430, 92, 480, 270, background.rock);
  canvas.triangle(398, 270, 446, 150, 480, 270, background.rockLight);
  canvas.triangle(174, 270, 250, 148, 318, 270, mix(background.rock, background.deep, 0.45));

  // Speckled wall texture.
  for (let index = 0; index < 140; index += 1) {
    const x = Math.floor(random() * 480);
    const y = 24 + Math.floor(random() * 214);
    const color = random() > 0.65 ? background.accent : background.rockLight;
    canvas.set(x, y, color, 110);
  }

  // Mine floor with rails.
  for (let x = 0; x < 480; x += STONE_TILE) {
    canvas.blit(createStoneTile(theme), x, 246);
  }
  canvas.hline(0, 246, 480, stone.light);
  canvas.hline(0, 247, 480, stone.shade);
  canvas.hline(0, 248, 480, 0x2e343b);
  canvas.hline(0, 249, 480, 0x596169);
  canvas.hline(0, 254, 480, 0x241f1b);

  for (let x = 4; x < 480; x += 34) {
    canvas.line(x, 248, x + 12, 254, 0x241f1b);
    canvas.line(x + 12, 254, x, 254, 0x241f1b);
  }

  // Timber frame.
  const drawBeam = (x, y, width, height) => {
    canvas.rect(x + 2, y + 2, width, height, 0x050608, 150);
    canvas.rect(x, y, width, height, wood.base);
    canvas.vline(x, y, height, wood.light);
    canvas.vline(x + 1, y, height, lighten(wood.light, 0.2));
    canvas.vline(x + width - 1, y, height, wood.dark);
    canvas.hline(x, y, width, wood.light);
    canvas.hline(x, y + height - 1, width, wood.dark);
    canvas.set(x + 3, y + 3, wood.metal);
    canvas.set(x + width - 4, y + Math.floor(height / 2), wood.metal);
  };

  drawBeam(24, 62, 10, 184);
  drawBeam(446, 62, 10, 184);
  drawBeam(0, 66, 480, 8);
  drawBeam(0, 74, 480, 2);

  // Hanging lantern.
  const glow = (cx, cy, radius, color, alpha) => {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        const distance = Math.hypot(x, y) / radius;

        if (distance >= 1) {
          continue;
        }

        canvas.blend(cx + x, cy + y, color, Math.round((1 - distance) ** 2 * alpha));
      }
    }
  };

  glow(414, 108, 30, COMMON.lamp, 46);
  canvas.vline(414, 76, 22, 0x3a3f45);
  const lantern = new Canvas(10, 14);
  lantern.rect(3, 0, 4, 2, 0x3a3f45);
  lantern.rect(2, 2, 6, 2, COMMON.steelDark);
  lantern.rect(2, 4, 6, 8, 0x8a7a3a);
  lantern.rect(3, 5, 4, 6, COMMON.lamp);
  lantern.rect(4, 6, 2, 4, COMMON.lampBright);
  lantern.rect(1, 12, 8, 2, COMMON.steelDark);
  canvas.blit(lantern, 409, 98);

  // Crystal cluster in front of the right beam.
  glow(454, 226, 34, crystal.glow, 26);
  const drawShard = (x, baseY, height, width, color, tip) => {
    canvas.triangle(x, baseY, x + Math.floor(width / 2), baseY - height, x + width, baseY, color);
    canvas.line(
      x + Math.floor(width / 2),
      baseY - 2,
      x + Math.floor(width / 2),
      baseY - height + 3,
      tip,
    );
  };

  drawShard(436, 246, 32, 8, crystal.dark, crystal.base);
  drawShard(442, 246, 48, 10, crystal.base, crystal.light);
  drawShard(452, 246, 26, 8, crystal.dark, crystal.base);
  drawShard(457, 246, 58, 10, crystal.base, crystal.bright);
  canvas.rect(432, 244, 38, 3, darken(crystal.dark, 0.25));

  // Loose rock and dust.
  canvas.rect(80, 244, 7, 3, 0x3d4147);
  canvas.rect(92, 245, 4, 2, 0x2f363e);
  for (let index = 0; index < 18; index += 1) {
    canvas.set(60 + Math.floor(random() * 360), 110 + Math.floor(random() * 120), COMMON.dust, 90);
  }

  // Edge shading only.
  canvas.blendRect(0, 0, 480, 18, 0x050608, 80);
  canvas.blendRect(0, 262, 480, 8, 0x050608, 120);
  canvas.blendRect(0, 0, 16, 270, 0x050608, 70);
  canvas.blendRect(464, 0, 16, 270, 0x050608, 70);

  return canvas;
}

/**
 * A short ceiling tooth. Theme colors keep the boss arena ceiling consistent
 * with the local rock.
 */
function createStalactite(theme) {
  const canvas = new Canvas(12, 12);
  const stone = theme.stone;

  canvas.drawMap(
    [
      '..oooooooo..',
      '..oSSSSSSo..',
      '..oSHHHHSo..',
      '...oSHHSo...',
      '...oSHHSo...',
      '....oHSo....',
      '....oHSo....',
      '.....oSo....',
      '.....oSo....',
      '......o.....',
      '......o.....',
      '............',
    ],
    {
      o: stone.dark,
      S: stone.mid,
      H: stone.light,
    },
  );

  return canvas;
}

export const TILE_IMAGES = [];

for (const theme of Object.values(THEMES)) {
  TILE_IMAGES.push(
    {
      key: `tile-stone-${theme.id}`,
      url: `assets/tiles/stone-${theme.id}.png`,
      canvas: createStoneTile(theme),
    },
    {
      key: `tile-wood-${theme.id}`,
      url: `assets/tiles/wood-${theme.id}.png`,
      canvas: createWoodTile(theme),
    },
    {
      key: `bg-${theme.id}`,
      url: `assets/tiles/bg-${theme.id}.png`,
      canvas: createBackgroundTile(theme),
    },
    {
      key: `pillar-${theme.id}`,
      url: `assets/tiles/pillar-${theme.id}.png`,
      canvas: createPillarTile(theme),
    },
    {
      key: `beam-${theme.id}`,
      url: `assets/tiles/beam-${theme.id}.png`,
      canvas: createBeamTile(theme),
    },
    {
      key: `stalactite-${theme.id}`,
      url: `assets/tiles/stalactite-${theme.id}.png`,
      canvas: createStalactite(theme),
    },
  );
}

export const TITLE_BACKDROP = {
  key: 'title-backdrop',
  url: 'assets/title/backdrop.png',
  canvas: createTitleBackdrop(),
};

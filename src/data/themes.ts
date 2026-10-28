export type LevelThemeId =
  'shaft-entrance' | 'goblin-tunnels' | 'crystal-caverns' | 'deep-vein' | 'worm-lair';

export interface LevelTheme {
  id: LevelThemeId;
  name: string;
  backgroundKey: string;
  stoneTileKey: string;
  woodTileKey: string;
  pillarTileKey: string;
  beamTileKey: string;
  stalactiteKey: string;
  crystalKey: string;
  accentColor: number;
}

/**
 * Theme keys point at the generated asset pack. Level maps never reference
 * textures directly, so chapters can be re-skinned without touching gameplay.
 */
export const THEMES: Record<LevelThemeId, LevelTheme> = {
  'shaft-entrance': {
    id: 'shaft-entrance',
    name: 'Shaft Entrance',
    backgroundKey: 'bg-shaft-entrance',
    stoneTileKey: 'tile-stone-shaft-entrance',
    woodTileKey: 'tile-wood-shaft-entrance',
    pillarTileKey: 'pillar-shaft-entrance',
    beamTileKey: 'beam-shaft-entrance',
    stalactiteKey: 'stalactite-shaft-entrance',
    crystalKey: 'crystal-teal',
    accentColor: 0x6fe3c4,
  },
  'goblin-tunnels': {
    id: 'goblin-tunnels',
    name: 'Goblin Tunnels',
    backgroundKey: 'bg-goblin-tunnels',
    stoneTileKey: 'tile-stone-goblin-tunnels',
    woodTileKey: 'tile-wood-goblin-tunnels',
    pillarTileKey: 'pillar-goblin-tunnels',
    beamTileKey: 'beam-goblin-tunnels',
    stalactiteKey: 'stalactite-goblin-tunnels',
    crystalKey: 'crystal-moss',
    accentColor: 0xa8d46a,
  },
  'crystal-caverns': {
    id: 'crystal-caverns',
    name: 'Crystal Caverns',
    backgroundKey: 'bg-crystal-caverns',
    stoneTileKey: 'tile-stone-crystal-caverns',
    woodTileKey: 'tile-wood-crystal-caverns',
    pillarTileKey: 'pillar-crystal-caverns',
    beamTileKey: 'beam-crystal-caverns',
    stalactiteKey: 'stalactite-crystal-caverns',
    crystalKey: 'crystal-teal',
    accentColor: 0x6fe3c4,
  },
  'deep-vein': {
    id: 'deep-vein',
    name: 'The Deep Vein',
    backgroundKey: 'bg-deep-vein',
    stoneTileKey: 'tile-stone-deep-vein',
    woodTileKey: 'tile-wood-deep-vein',
    pillarTileKey: 'pillar-deep-vein',
    beamTileKey: 'beam-deep-vein',
    stalactiteKey: 'stalactite-deep-vein',
    crystalKey: 'crystal-gold',
    accentColor: 0xff8a5a,
  },
  'worm-lair': {
    id: 'worm-lair',
    name: 'The Worm Lair',
    backgroundKey: 'bg-worm-lair',
    stoneTileKey: 'tile-stone-worm-lair',
    woodTileKey: 'tile-wood-worm-lair',
    pillarTileKey: 'pillar-worm-lair',
    beamTileKey: 'beam-worm-lair',
    stalactiteKey: 'stalactite-worm-lair',
    crystalKey: 'crystal-rose',
    accentColor: 0xff9a8a,
  },
};

export const BOSS_THEME = THEMES['worm-lair'];

export function getTheme(themeId: LevelThemeId): LevelTheme {
  return THEMES[themeId];
}

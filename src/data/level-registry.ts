import { getTheme, type LevelTheme, type LevelThemeId } from './themes';

export interface LevelAsset {
  id: string;
  path: string;
  number: number;
  title: string;
  intro: string;
  theme: LevelThemeId;
}

/**
 * Run order is the array order. Each map still owns its authoritative spawn,
 * geometry, enemy, prop, hazard, and exit data.
 */
export const LEVEL_ASSETS: readonly LevelAsset[] = [
  {
    id: 'shaft-entrance',
    path: 'maps/shaft-entrance.json',
    number: 1,
    title: 'Shaft Entrance',
    intro: 'Find the elevator. The first descent is always the quietest.',
    theme: 'shaft-entrance',
  },
  {
    id: 'goblin-tunnels',
    path: 'maps/goblin-tunnels.json',
    number: 2,
    title: 'Goblin Tunnels',
    intro: 'Timber creaks overhead. Scavengers have claimed the lower rails.',
    theme: 'goblin-tunnels',
  },
  {
    id: 'crystal-caverns',
    path: 'maps/crystal-caverns.json',
    number: 3,
    title: 'Crystal Caverns',
    intro: 'The rock hums here. Stay above the teeth and keep moving.',
    theme: 'crystal-caverns',
  },
  {
    id: 'deep-vein',
    path: 'maps/deep-vein.json',
    number: 4,
    title: 'The Deep Vein',
    intro: 'No more scaffolds. Only the gauntlet and the worm below it.',
    theme: 'deep-vein',
  },
];

export const LEVEL_ORDER = LEVEL_ASSETS.map((asset) => asset.id);
export const LEVEL_COUNT = LEVEL_ORDER.length;

export function getLevelAsset(id: string): LevelAsset | undefined {
  return LEVEL_ASSETS.find((asset) => asset.id === id);
}

export function getLevelIndex(id: string): number {
  return LEVEL_ORDER.indexOf(id);
}

export function getLevelTheme(id: string): LevelTheme {
  return getTheme(getLevelAsset(id)?.theme ?? 'shaft-entrance');
}

/**
 * Scene data wins, then a development-only query override, then level one.
 */
export function resolveLevelId(requested?: string): string {
  if (requested && getLevelAsset(requested)) {
    return requested;
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const value = new URLSearchParams(window.location.search).get('level');

    if (value && getLevelAsset(value)) {
      return value;
    }
  }

  return LEVEL_ORDER[0] ?? 'shaft-entrance';
}

export function levelCacheKey(id: string): string {
  return `level-${id}`;
}

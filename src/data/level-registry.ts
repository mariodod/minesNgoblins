export interface LevelAsset {
  id: string;
  path: string;
}

export const LEVEL_ASSETS: readonly LevelAsset[] = [
  {
    id: 'movement-test',
    path: 'maps/movement-test.json',
  },
];

export function levelCacheKey(id: string): string {
  return `level-${id}`;
}

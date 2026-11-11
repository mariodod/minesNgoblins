import { describe, expect, it } from 'vitest';
import {
  getLevelAsset,
  getLevelIndex,
  LEVEL_ASSETS,
  LEVEL_COUNT,
  LEVEL_ORDER,
  resolveLevelId,
} from '../../src/data/level-registry';

describe('level registry', () => {
  it('lists the four levels in run order', () => {
    expect(LEVEL_COUNT).toBe(4);
    expect(LEVEL_ORDER).toEqual([
      'shaft-entrance',
      'goblin-tunnels',
      'crystal-caverns',
      'deep-vein',
    ]);
    expect(LEVEL_ASSETS.map((asset) => asset.number)).toEqual([1, 2, 3, 4]);
  });

  it('resolves authored level metadata and indexes', () => {
    expect(getLevelAsset('crystal-caverns')?.number).toBe(3);
    expect(getLevelIndex('deep-vein')).toBe(3);
    expect(getLevelIndex('missing')).toBe(-1);
  });

  it('accepts a requested authored level', () => {
    expect(resolveLevelId('goblin-tunnels')).toBe('goblin-tunnels');
  });

  it('falls back to level one for missing or invalid ids', () => {
    expect(resolveLevelId('missing')).toBe('shaft-entrance');
    expect(resolveLevelId()).toBe('shaft-entrance');
  });
});

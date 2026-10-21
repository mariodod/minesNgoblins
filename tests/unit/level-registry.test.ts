import { describe, expect, it } from 'vitest';
import {
  getLevelAsset,
  getLevelIndex,
  LEVEL_COUNT,
  resolveLevelId,
} from '../../src/data/level-registry';

describe('level registry', () => {
  it('resolves authored level metadata and indexes', () => {
    expect(LEVEL_COUNT).toBe(4);
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

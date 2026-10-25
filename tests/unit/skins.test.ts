import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import {
  DEFAULT_SKIN_ID,
  isSkinId,
  resolveSkinId,
  SKIN_IDS,
  SKIN_LIST,
  SKINS,
  skinTextureKey,
} from '../../src/data/skins';

describe('skin data', () => {
  it('exposes every skin once with palette and copy', () => {
    expect(SKIN_LIST).toHaveLength(SKIN_IDS.length);
    expect(new Set(SKIN_LIST.map((skin) => skin.id)).size).toBe(SKIN_LIST.length);
    expect(SKIN_LIST[0]?.id).toBe(DEFAULT_SKIN_ID);

    for (const skin of SKIN_LIST) {
      expect(SKINS[skin.id]).toBe(skin);
      expect(skin.name.length).toBeGreaterThan(0);
      expect(skin.description.length).toBeGreaterThan(0);
      expect(skin.unlockHint.length).toBeGreaterThan(0);
      expect(Object.keys(skin.palette)).toHaveLength(11);
      expect(skinTextureKey(skin.id)).toBe(`miner-skin-${skin.id}`);
    }
  });

  it('resolves unknown skin IDs to the default', () => {
    expect(isSkinId('delver')).toBe(true);
    expect(isSkinId('not-a-skin')).toBe(false);
    expect(resolveSkinId('gilded')).toBe('gilded');
    expect(resolveSkinId('not-a-skin')).toBe(DEFAULT_SKIN_ID);
  });

  it('links every skin reward to a real achievement', () => {
    for (const skin of SKIN_LIST) {
      if (skin.unlockAchievementId === null) {
        expect(skin.id).toBe(DEFAULT_SKIN_ID);
        continue;
      }

      const matchingAchievement = ACHIEVEMENTS.find(
        (achievement) => achievement.id === skin.unlockAchievementId,
      );

      expect(matchingAchievement?.skinId).toBe(skin.id);
    }
  });
});

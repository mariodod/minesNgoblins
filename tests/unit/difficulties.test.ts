import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  getDifficulty,
  isDifficultyId,
} from '../../src/data/difficulties';

describe('difficulty data', () => {
  it('defines the four modes with the designed player HP and multipliers', () => {
    expect(DIFFICULTIES.normal).toMatchObject({
      playerMaxHp: 5,
      enemyHpMultiplier: 1,
      enemyDamageMultiplier: 1,
    });
    expect(DIFFICULTIES.hard).toMatchObject({
      playerMaxHp: 5,
      enemyHpMultiplier: 2,
      enemyDamageMultiplier: 2,
    });
    expect(DIFFICULTIES.impossible).toMatchObject({
      playerMaxHp: 4,
      enemyHpMultiplier: 3,
      enemyDamageMultiplier: 2,
    });
    expect(DIFFICULTIES.crazy).toMatchObject({
      playerMaxHp: 1,
      enemyHpMultiplier: 5,
      enemyDamageMultiplier: 5,
      requiresAllEnemiesDead: true,
      pacifistAllowed: false,
    });
  });

  it('defaults to normal and returns the requested config', () => {
    expect(DEFAULT_DIFFICULTY).toBe('normal');
    expect(getDifficulty('hard')).toBe(DIFFICULTIES.hard);
  });

  it('validates only own difficulty ids', () => {
    expect(isDifficultyId('normal')).toBe(true);
    expect(isDifficultyId('impossible')).toBe(true);
    expect(isDifficultyId('nightmare')).toBe(false);
    expect(isDifficultyId('toString')).toBe(false);
  });
});

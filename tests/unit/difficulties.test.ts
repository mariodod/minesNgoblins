import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  getDifficulty,
  isDifficultyId,
  resolveDifficultyId,
  scaleEnemyDamage,
} from '../../src/data/difficulties';
import { applyDamage } from '../../src/systems/damage';

describe('difficulty data', () => {
  it('defines the four modes with the designed player HP and multipliers', () => {
    expect(DIFFICULTIES.normal).toMatchObject({
      playerMaxHp: 5,
      enemyHpMultiplier: 1,
      enemyDamageMultiplier: 1,
      bossHpMultiplier: 1,
    });
    expect(DIFFICULTIES.hard).toMatchObject({
      playerMaxHp: 5,
      enemyHpMultiplier: 2,
      enemyDamageMultiplier: 2,
      bossHpMultiplier: 1.5,
    });
    expect(DIFFICULTIES.impossible).toMatchObject({
      playerMaxHp: 4,
      enemyHpMultiplier: 3,
      enemyDamageMultiplier: 2,
      bossHpMultiplier: 2,
    });
    expect(DIFFICULTIES.crazy).toMatchObject({
      playerMaxHp: 1,
      enemyHpMultiplier: 5,
      enemyDamageMultiplier: 5,
      bossHpMultiplier: 2.5,
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

  it('resolves explicit difficulty before the fallback', () => {
    expect(resolveDifficultyId('hard')).toBe('hard');
    expect(resolveDifficultyId()).toBe('normal');
  });

  it('kills a full-health Impossible run in two enemy hits', () => {
    const damage = scaleEnemyDamage(1, DIFFICULTIES.impossible);
    const firstHit = applyDamage(DIFFICULTIES.impossible.playerMaxHp, damage);
    const secondHit = applyDamage(firstHit.hp, damage);

    expect(damage).toBe(2);
    expect(firstHit.hp).toBe(2);
    expect(secondHit.hp).toBe(0);
    expect(secondHit.lethal).toBe(true);
  });

  it('kills a full-health Crazy run in one enemy hit', () => {
    const damage = scaleEnemyDamage(1, DIFFICULTIES.crazy);
    const hit = applyDamage(DIFFICULTIES.crazy.playerMaxHp, damage);

    expect(damage).toBe(5);
    expect(hit.hp).toBe(0);
    expect(hit.lethal).toBe(true);
  });
});

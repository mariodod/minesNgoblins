import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, scaleEnemyDamage } from '../../src/data/difficulties';
import {
  computeEnemyHp,
  ENEMIES,
  ENEMY_IDS,
  isEnemyId,
  type EnemyId,
} from '../../src/data/enemies';

describe('enemy data', () => {
  it('defines the four standard enemies plus the practice dummy', () => {
    expect(ENEMY_IDS).toEqual([
      'practice-dummy',
      'cave-bat',
      'goblin-scavenger',
      'skeleton-thrower',
      'armored-beetle',
    ]);

    const expectedHp: Record<EnemyId, number> = {
      'practice-dummy': 3,
      'cave-bat': 1,
      'goblin-scavenger': 2,
      'skeleton-thrower': 2,
      'armored-beetle': 3,
    };

    for (const id of ENEMY_IDS) {
      expect(ENEMIES[id].baseHp).toBe(expectedHp[id]);
      expect(ENEMIES[id].contactDamage).toBe(1);
      expect(ENEMIES[id].spriteKey.length).toBeGreaterThan(0);
      expect(ENEMIES[id].hitbox.width).toBeGreaterThan(0);
      expect(ENEMIES[id].hitbox.height).toBeGreaterThan(0);
    }
  });

  it('validates enemy ids', () => {
    expect(isEnemyId('cave-bat')).toBe(true);
    expect(isEnemyId('dragon')).toBe(false);
  });
});

describe('computeEnemyHp', () => {
  it('applies no changes on normal level 1', () => {
    expect(computeEnemyHp(2, 0, 1)).toBe(2);
  });

  it('adds the level HP bonus before multiplying', () => {
    expect(computeEnemyHp(2, 1, 1)).toBe(3);
    expect(computeEnemyHp(1, 2, 1)).toBe(3);
  });

  it('applies difficulty multipliers after level bonuses', () => {
    expect(computeEnemyHp(2, 1, 2)).toBe(6);
    expect(computeEnemyHp(2, 1, 3)).toBe(9);
    expect(computeEnemyHp(2, 2, 5)).toBe(20);
  });

  it('rounds up fractional results and keeps a minimum of one', () => {
    expect(computeEnemyHp(1, 0, 1.5)).toBe(2);
    expect(computeEnemyHp(0, 0, 1)).toBe(1);
  });

  it('combines enemy data with difficulty data', () => {
    const goblin = ENEMIES['goblin-scavenger'];

    expect(computeEnemyHp(goblin.baseHp, 1, DIFFICULTIES.hard.enemyHpMultiplier)).toBe(6);
    expect(computeEnemyHp(goblin.baseHp, 1, DIFFICULTIES.crazy.enemyHpMultiplier)).toBe(15);
  });
});

describe('scaleEnemyDamage', () => {
  it('scales contact and projectile damage per difficulty', () => {
    expect(scaleEnemyDamage(1, DIFFICULTIES.normal)).toBe(1);
    expect(scaleEnemyDamage(1, DIFFICULTIES.hard)).toBe(2);
    expect(scaleEnemyDamage(1, DIFFICULTIES.impossible)).toBe(2);
    expect(scaleEnemyDamage(1, DIFFICULTIES.crazy)).toBe(5);
  });
});

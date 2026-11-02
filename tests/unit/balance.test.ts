import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../src/data/difficulties';
import { computeEnemyHp, ENEMIES } from '../../src/data/enemies';
import { parseLevelDefinition } from '../../src/data/level-definition';
import { LEVEL_ASSETS } from '../../src/data/level-registry';
import { ROCK_TUNING } from '../../src/config/tuning';

const levels = LEVEL_ASSETS.map((asset) =>
  parseLevelDefinition(
    JSON.parse(
      readFileSync(new URL(`../../public/${asset.path}`, import.meta.url), 'utf8'),
    ) as Record<string, unknown>,
  ),
);

function totalEnemyHp(multiplier: number): number {
  return levels.reduce(
    (total, level) =>
      total +
      level.enemies.reduce(
        (sum, spawn) =>
          sum + computeEnemyHp(ENEMIES[spawn.type].baseHp, level.enemyHpBonus, multiplier),
        0,
      ),
    0,
  );
}

function toughestEnemyHp(multiplier: number): number {
  return Math.max(
    ...levels.flatMap((level) =>
      level.enemies.map((spawn) =>
        computeEnemyHp(ENEMIES[spawn.type].baseHp, level.enemyHpBonus, multiplier),
      ),
    ),
  );
}

/**
 * Locks the M7 Crazy balance decision. The x5 enemy multiplier made the
 * heaviest enemy 25 HP and a full clear 515 rock hits; x3 keeps the mode
 * extreme through one-hit death and the all-kill gate without turning every
 * enemy into a damage sponge.
 */
describe('M7 balance budget', () => {
  it('keeps Normal and the higher modes on the authored HP curve', () => {
    expect(totalEnemyHp(DIFFICULTIES.normal.enemyHpMultiplier)).toBe(103);
    expect(totalEnemyHp(DIFFICULTIES.hard.enemyHpMultiplier)).toBe(206);
    expect(totalEnemyHp(DIFFICULTIES.impossible.enemyHpMultiplier)).toBe(309);
    expect(totalEnemyHp(DIFFICULTIES.crazy.enemyHpMultiplier)).toBe(309);
  });

  it('caps the heaviest Crazy enemy at 15 HP', () => {
    expect(toughestEnemyHp(DIFFICULTIES.crazy.enemyHpMultiplier)).toBe(15);
  });

  it('keeps a full Crazy clear inside a 320-rock budget', () => {
    expect(totalEnemyHp(DIFFICULTIES.crazy.enemyHpMultiplier)).toBeLessThanOrEqual(320);
  });

  it('keeps the heaviest Crazy enemy under six seconds of perfect rock throws', () => {
    const shots = toughestEnemyHp(DIFFICULTIES.crazy.enemyHpMultiplier) / ROCK_TUNING.damage;
    const seconds = (shots * ROCK_TUNING.cooldownMs) / 1000;

    expect(seconds).toBeLessThanOrEqual(6);
  });
});

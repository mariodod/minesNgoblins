import { describe, expect, it } from 'vitest';
import {
  BOSS_ARENA,
  BOSS_ATTACK_SEQUENCES,
  BOSS_DEFINITION,
  BOSS_PHASE_TUNING,
  BOSS_WORMLING_HP,
  chooseChargeDirection,
  chooseHoleForAttack,
  computeBossHp,
  nearestHoleIndex,
  resolveBossPartDamage,
  resolveBossPhase,
  selectBossAttack,
} from '../../src/data/boss';
import { DIFFICULTIES } from '../../src/data/difficulties';

describe('boss HP scaling', () => {
  it('maps difficulty boss multipliers to the designed health curve', () => {
    expect(computeBossHp(BOSS_DEFINITION.baseHp, DIFFICULTIES.normal.bossHpMultiplier)).toBe(48);
    expect(computeBossHp(BOSS_DEFINITION.baseHp, DIFFICULTIES.hard.bossHpMultiplier)).toBe(72);
    expect(computeBossHp(BOSS_DEFINITION.baseHp, DIFFICULTIES.impossible.bossHpMultiplier)).toBe(
      96,
    );
    expect(computeBossHp(BOSS_DEFINITION.baseHp, DIFFICULTIES.crazy.bossHpMultiplier)).toBe(120);
  });

  it('keeps a minimum of one HP', () => {
    expect(computeBossHp(0, 0)).toBe(1);
    expect(computeBossHp(-10, 2)).toBe(1);
  });
});

describe('boss phases', () => {
  it('crosses into phase two and three at the 66 and 33 percent thresholds', () => {
    expect(resolveBossPhase(100, 100)).toBe(1);
    expect(resolveBossPhase(67, 100)).toBe(1);
    expect(resolveBossPhase(66, 100)).toBe(2);
    expect(resolveBossPhase(48, 100)).toBe(2);
    expect(resolveBossPhase(34, 100)).toBe(2);
    expect(resolveBossPhase(33, 100)).toBe(3);
    expect(resolveBossPhase(1, 100)).toBe(3);
  });

  it('treats zero HP and invalid max HP as the final phase', () => {
    expect(resolveBossPhase(0, 48)).toBe(3);
    expect(resolveBossPhase(10, 0)).toBe(3);
  });
});

describe('boss attack selection', () => {
  it('cycles each phase sequence deterministically and wraps negative indices', () => {
    for (const phase of [1, 2, 3] as const) {
      const sequence = BOSS_ATTACK_SEQUENCES[phase];

      sequence.forEach((attack, index) => {
        expect(selectBossAttack(phase, index)).toBe(attack);
        expect(selectBossAttack(phase, index + sequence.length)).toBe(attack);
      });

      expect(selectBossAttack(phase, -1)).toBe(sequence[sequence.length - 1]);
    }
  });

  it('uses all five attacks across the fight', () => {
    const attacks = new Set(([1, 2, 3] as const).flatMap((phase) => BOSS_ATTACK_SEQUENCES[phase]));

    expect(attacks).toEqual(
      new Set(['emerge-bite', 'rock-spit', 'burrow-charge', 'quake', 'summon-wormlings']),
    );
  });

  it('increases pressure in later phases', () => {
    expect(BOSS_PHASE_TUNING[3].spitRocks).toBeGreaterThan(BOSS_PHASE_TUNING[1].spitRocks);
    expect(BOSS_PHASE_TUNING[3].quakeRocks).toBeGreaterThan(BOSS_PHASE_TUNING[2].quakeRocks);
    expect(BOSS_PHASE_TUNING[1].maxWormlings).toBe(0);
    expect(BOSS_PHASE_TUNING[3].maxWormlings).toBe(2);
    expect(BOSS_PHASE_TUNING[3].recoveryMs).toBeLessThan(BOSS_PHASE_TUNING[1].recoveryMs);
  });
});

describe('boss holes and parts', () => {
  const holes = BOSS_ARENA.holes;

  it('chooses the nearest hole for bites and the centre hole for stances and spit', () => {
    expect(chooseHoleForAttack('emerge-bite', 60, holes)).toBe(0);
    expect(chooseHoleForAttack('emerge-bite', 500, holes)).toBe(1);
    expect(chooseHoleForAttack('emerge-bite', 940, holes)).toBe(2);

    for (const attack of ['rock-spit', 'quake', 'summon-wormlings'] as const) {
      expect(chooseHoleForAttack(attack, 60, holes)).toBe(1);
      expect(chooseHoleForAttack(attack, 940, holes)).toBe(1);
    }
  });

  it('finds the nearest hole for charge recovery', () => {
    expect(nearestHoleIndex(20, holes)).toBe(0);
    expect(nearestHoleIndex(470, holes)).toBe(1);
    expect(nearestHoleIndex(890, holes)).toBe(2);
    expect(nearestHoleIndex(500, [])).toBe(0);
  });

  it('charges from the side opposite the player', () => {
    expect(chooseChargeDirection(40, BOSS_ARENA.width)).toBe(-1);
    expect(chooseChargeDirection(920, BOSS_ARENA.width)).toBe(1);
  });

  it('only allows head damage', () => {
    expect(resolveBossPartDamage('head', 1)).toBe(1);
    expect(resolveBossPartDamage('head', 4)).toBe(4);
    expect(resolveBossPartDamage('body', 99)).toBe(0);
    expect(resolveBossPartDamage('head', 0)).toBe(0);
    expect(resolveBossPartDamage('head', -1)).toBe(0);
  });

  it('defines boss-only Wormling HP for every difficulty', () => {
    expect(BOSS_WORMLING_HP).toEqual({
      normal: 2,
      hard: 3,
      impossible: 3,
      crazy: 4,
    });
  });

  it('defines the arena, exit, holes, supplies, and one-way platforms', () => {
    expect(BOSS_ARENA.width).toBe(960);
    expect(BOSS_ARENA.height).toBe(270);
    expect(BOSS_ARENA.holes.length).toBe(3);
    expect(BOSS_ARENA.oneWayPlatforms.length).toBe(2);
    expect(BOSS_ARENA.supplySpots.length).toBe(2);
    expect(BOSS_ARENA.exit.x).toBeGreaterThan(BOSS_ARENA.width - 100);
    expect(BOSS_ARENA.spawn.x).toBeLessThan(BOSS_ARENA.holes[0]?.x ?? 0);
  });
});

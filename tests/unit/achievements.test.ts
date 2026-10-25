import { beforeEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, getAchievement, type AchievementId } from '../../src/data/achievements';
import type { DifficultyId } from '../../src/data/difficulties';
import { SECONDARY_ITEM_IDS } from '../../src/data/items';
import { AchievementService } from '../../src/services/achievement-service';
import { MemoryStorage, SaveService } from '../../src/services/save-service';
import { evaluateChallenges } from '../../src/systems/challenges';
import { RunService, type RunSnapshot } from '../../src/systems/run-service';

function createVictory(difficultyId: DifficultyId = 'normal'): RunSnapshot {
  const run = new RunService();
  run.startRun(difficultyId, 1000);
  run.enterLevel(0, 'shaft-entrance', 1000);
  run.completeLevel({ hp: 4, ore: 0, itemId: null, itemUses: 0 });
  run.enterBoss(2000);
  return run.snapshot;
}

function completedRun(difficultyId: DifficultyId = 'normal'): RunSnapshot {
  const run = new RunService();
  run.startRun(difficultyId, 1000);
  run.enterLevel(0, 'shaft-entrance', 1000);
  run.completeLevel({ hp: 4, ore: 0, itemId: null, itemUses: 0 });
  run.enterBoss(2000);
  run.completeBoss(3000);
  return run.snapshot;
}

function ids(unlocks: readonly { id: AchievementId }[]): AchievementId[] {
  return unlocks.map((unlock) => unlock.id);
}

describe('AchievementService', () => {
  let save: SaveService;
  let service: AchievementService;

  beforeEach(() => {
    save = new SaveService(new MemoryStorage());
    service = new AchievementService(save);
  });

  it('unlocks First Descent and Ore Hunter from level completion', () => {
    const run = new RunService();
    run.startRun('normal', 0);
    run.enterLevel(0, 'shaft-entrance', 0);

    expect(ids(service.evaluateLevel(run.snapshot, 0, false))).toEqual(['first_descent']);
    expect(ids(service.evaluateLevel(run.snapshot, 0, false))).toEqual([]);
    expect(ids(service.evaluateLevel(run.snapshot, 1, true))).toEqual(['ore_hunter']);
    expect(ids(service.evaluateLevel(run.snapshot, 2, true))).toEqual([]);
  });

  it('unlocks boss and challenge achievements with their reward skins', () => {
    const run = completedRun();
    const unlocks = service.evaluateRun(run, evaluateChallenges(run), []);

    expect(ids(unlocks)).toEqual([
      'worm_slayer',
      'boss_flawless',
      'pacifist',
      'primitive',
      'untouchable',
      'legend',
    ]);
    expect(unlocks.flatMap((unlock) => (unlock.skinId ? [unlock.skinId] : []))).toEqual([
      'wormhide',
      'pale-wanderer',
      'boneclad',
      'gilded',
      'legend',
    ]);
    expect(save.data.skins['wormhide']).toBeDefined();
    expect(save.data.skins['pale-wanderer']).toBeDefined();
    expect(save.data.skins['boneclad']).toBeDefined();
    expect(save.data.skins['gilded']).toBeDefined();
    expect(save.data.skins['legend']).toBeDefined();
  });

  it('does not unlock the same achievement twice', () => {
    const run = completedRun();

    expect(ids(service.evaluateRun(run, evaluateChallenges(run), []))).not.toHaveLength(0);
    expect(service.evaluateRun(run, evaluateChallenges(run), [])).toEqual([]);
  });

  it('requires a won run for run achievements', () => {
    const run = createVictory();

    expect(service.evaluateRun(run, evaluateChallenges(run), [])).toEqual([]);
  });

  it('withholds Flawless Warden after boss damage', () => {
    const run = new RunService();
    run.startRun('normal', 1000);
    run.enterBoss(2000);
    run.recordDamage(1, 'enemy', true);
    run.completeBoss(3000);

    const runUnlocks = service.evaluateRun(run.snapshot, evaluateChallenges(run.snapshot), []);
    expect(ids(runUnlocks)).not.toContain('boss_flawless');
    expect(ids(runUnlocks)).toContain('worm_slayer');
  });

  it('unlocks Full Arsenal after all three secondary items are used', () => {
    const run = new RunService();
    run.startRun('normal', 0);

    save.recordItemUsed(SECONDARY_ITEM_IDS[0]);
    expect(ids(service.evaluateItemUse(run.snapshot, save.data.stats.usedItems))).toEqual([]);

    save.recordItemUsed(SECONDARY_ITEM_IDS[1]);
    expect(ids(service.evaluateItemUse(run.snapshot, save.data.stats.usedItems))).toEqual([]);

    save.recordItemUsed(SECONDARY_ITEM_IDS[2]);
    expect(ids(service.evaluateItemUse(run.snapshot, save.data.stats.usedItems))).toEqual([
      'full_arsenal',
    ]);
    expect(service.evaluateItemUse(run.snapshot, save.data.stats.usedItems)).toEqual([]);
  });

  it.each([
    ['hard', 'hard_clear'],
    ['impossible', 'impossible_clear'],
    ['crazy', 'crazy_clear'],
  ] as const)('unlocks %s completion once', (difficultyId, achievementId) => {
    const run = completedRun(difficultyId);
    const unlocks = service.evaluateRun(run, evaluateChallenges(run), []);

    expect(ids(unlocks)).toContain(achievementId);
    expect(ids(service.evaluateRun(run, evaluateChallenges(run), []))).not.toContain(achievementId);
  });

  it('does not grant higher-difficulty achievements for a Normal victory', () => {
    const run = completedRun('normal');
    const unlockIds = ids(service.evaluateRun(run, evaluateChallenges(run), []));

    expect(unlockIds).not.toContain('hard_clear');
    expect(unlockIds).not.toContain('impossible_clear');
    expect(unlockIds).not.toContain('crazy_clear');
  });

  it('repairs missing reward skins for an existing achievement', () => {
    save.unlockAchievement('worm_slayer', '2026-10-19T00:00:00.000Z');

    const repaired = new AchievementService(save);

    expect(repaired).toBeInstanceOf(AchievementService);
    expect(save.data.skins['wormhide']?.unlockedAt).toBe('2026-10-19T00:00:00.000Z');
  });
});

describe('achievement data', () => {
  it('keeps achievement IDs unique and resolvable', () => {
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(
      ACHIEVEMENTS.length,
    );

    for (const achievement of ACHIEVEMENTS) {
      expect(getAchievement(achievement.id)).toBe(achievement);
      expect(achievement.name.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
    }
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { RunService } from '../../src/systems/run-service';

describe('RunService', () => {
  let run: RunService;

  beforeEach(() => {
    run = new RunService();
  });

  it('starts inactive and tracks a run from level entry', () => {
    expect(run.isActive).toBe(false);
    expect(run.snapshot.levelId).toBeNull();

    run.startRun('normal', 1000);
    run.enterLevel(0, 'shaft-entrance', 2000);

    const snapshot = run.snapshot;

    expect(snapshot.active).toBe(true);
    expect(snapshot.difficultyId).toBe('normal');
    expect(snapshot.levelIndex).toBe(0);
    expect(snapshot.levelId).toBe('shaft-entrance');
    expect(snapshot.startedAt).toBe(1000);
    expect(snapshot.levelStartedAt).toBe(2000);
  });

  it('requires an active run before entering a level', () => {
    expect(() => run.enterLevel(0, 'shaft-entrance')).toThrow(/active run/);
  });

  it('accumulates kills, damage, deaths, item uses, pickups, and ore', () => {
    run.startRun('hard', 0);
    run.enterLevel(0, 'shaft-entrance', 0);

    run.recordKill();
    run.recordKill();
    run.recordDamage(2);
    run.recordDamage(1);
    run.recordDeath();
    run.recordItemUse();
    run.recordPickup();
    run.recordPickup();
    run.recordOre(25);

    expect(run.snapshot).toMatchObject({
      kills: 2,
      damageTaken: 3,
      deaths: 1,
      itemUses: 1,
      itemsPickedUp: 2,
      oreCollected: 25,
    });
  });

  it('ignores negative or zero damage and ore', () => {
    run.startRun('normal', 0);
    run.recordDamage(-2);
    run.recordDamage(0);
    run.recordOre(-4);

    expect(run.snapshot.damageTaken).toBe(0);
    expect(run.snapshot.oreCollected).toBe(0);
  });

  it('stores carry state for the next level and only consumes it once', () => {
    run.startRun('normal', 0);
    run.enterLevel(0, 'shaft-entrance', 0);
    run.completeLevel({ hp: 3.9, ore: 20.8, itemId: 'knife', itemUses: 2.9 });

    expect(run.snapshot.levelsCompleted).toBe(1);
    expect(run.takeCarry()).toEqual({ hp: 3, ore: 20, itemId: 'knife', itemUses: 2 });
    expect(run.takeCarry()).toBeNull();
  });

  it('clamps carry HP to at least one heart', () => {
    run.startRun('crazy', 0);
    run.enterLevel(0, 'shaft-entrance', 0);
    run.completeLevel({ hp: 0, ore: -5, itemId: null, itemUses: -1 });

    expect(run.takeCarry()).toEqual({ hp: 1, ore: 0, itemId: null, itemUses: 0 });
  });

  it('tracks total and level timers', () => {
    run.startRun('normal', 1000);
    run.enterLevel(0, 'shaft-entrance', 2500);

    expect(run.elapsedMs(4000)).toBe(3000);
    expect(run.levelElapsedMs(4000)).toBe(1500);
  });

  it('keeps final stats readable after ending the run but stops timers', () => {
    run.startRun('normal', 1000);
    run.enterLevel(0, 'shaft-entrance', 1000);
    run.recordKill();
    run.endRun();

    expect(run.isActive).toBe(false);
    expect(run.snapshot.kills).toBe(1);
    expect(run.snapshot.active).toBe(false);
    expect(run.elapsedMs(5000)).toBe(0);
  });

  it('resets all state when a new run starts', () => {
    run.startRun('hard', 1000);
    run.enterLevel(2, 'crystal-caverns', 1000);
    run.recordKill();
    run.completeLevel({ hp: 2, ore: 10, itemId: 'flintlock', itemUses: 1 });
    run.startRun('normal', 9000);

    expect(run.snapshot).toMatchObject({
      active: true,
      difficultyId: 'normal',
      levelIndex: 0,
      levelId: null,
      startedAt: 9000,
      kills: 0,
      levelsCompleted: 0,
    });
    expect(run.takeCarry()).toBeNull();
  });
});

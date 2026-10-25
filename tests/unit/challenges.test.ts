import { describe, expect, it } from 'vitest';
import type { DifficultyId } from '../../src/data/difficulties';
import {
  evaluateChallenges,
  getChallengeProgress,
  isChallengeAvailable,
} from '../../src/systems/challenges';
import { RunService, type RunSnapshot } from '../../src/systems/run-service';

function createRun(difficultyId: DifficultyId = 'normal'): RunService {
  const run = new RunService();
  run.startRun(difficultyId, 1000);
  return run;
}

function completeRun(run: RunService): RunSnapshot {
  run.enterBoss(2000);
  run.completeBoss(3000);
  return run.snapshot;
}

function resultById<T extends { id: string }>(results: readonly T[], id: string): T {
  const result = results.find((challenge) => challenge.id === id);
  if (!result) {
    throw new Error(`Missing challenge result: ${id}`);
  }

  return result;
}

describe('challenge progress', () => {
  it('keeps every badge active on a clean run in progress', () => {
    const progress = getChallengeProgress(createRun().snapshot);

    expect(progress.map((challenge) => challenge.status)).toEqual([
      'active',
      'active',
      'active',
      'active',
    ]);
  });

  it('fails Pacifist on the first standard enemy kill and names the source', () => {
    const run = createRun();
    run.enterLevel(0, 'shaft-entrance', 0);
    run.recordKill('knife', 'cave-goblin');

    const progress = getChallengeProgress(run.snapshot);
    const pacifist = resultById(progress, 'pacifist');

    expect(pacifist.status).toBe('failed');
    expect(pacifist.reason).toBe('A standard enemy died to a knife.');
    expect(resultById(progress, 'legend').reason).toBe('Missing Pacifist, Primitive.');
  });

  it('fails Primitive on item use or any non-rock kill', () => {
    const itemRun = createRun();
    itemRun.recordItemUse('rune-scroll');

    expect(resultById(getChallengeProgress(itemRun.snapshot), 'primitive')).toMatchObject({
      status: 'failed',
      reason: 'Used a secondary item (rune scroll).',
    });

    const magicRun = createRun();
    magicRun.enterLevel(0, 'shaft-entrance', 0);
    magicRun.recordKill('magic', 'goblin-shaman');

    expect(resultById(getChallengeProgress(magicRun.snapshot), 'primitive')).toMatchObject({
      status: 'failed',
      reason: 'A standard enemy died to a rune scroll.',
    });
  });

  it('fails Untouchable after damage or death', () => {
    const damageRun = createRun();
    damageRun.recordDamage(2, 'enemy');

    expect(resultById(getChallengeProgress(damageRun.snapshot), 'untouchable')).toMatchObject({
      status: 'failed',
      reason: 'Took 2 damage.',
    });

    const deathRun = createRun();
    deathRun.recordDeath();

    expect(resultById(getChallengeProgress(deathRun.snapshot), 'untouchable')).toMatchObject({
      status: 'failed',
      reason: 'Died during the run.',
    });
  });

  it('marks Pacifist and Legend unavailable on Crazy', () => {
    const progress = getChallengeProgress(createRun('crazy').snapshot);

    expect(resultById(progress, 'pacifist')).toEqual({
      id: 'pacifist',
      name: 'Pacifist',
      status: 'unavailable',
      reason: 'Unavailable on Crazy: every enemy must die.',
    });
    expect(resultById(progress, 'legend')).toEqual({
      id: 'legend',
      name: 'Legend',
      status: 'unavailable',
      reason: 'Pacifist is unavailable on Crazy.',
    });
    expect(resultById(progress, 'primitive').status).toBe('active');
    expect(resultById(progress, 'untouchable').status).toBe('active');
  });
});

describe('challenge evaluation', () => {
  it('completes all four badges on a clean Normal boss victory', () => {
    const run = createRun();
    run.enterLevel(0, 'shaft-entrance', 0);
    run.completeLevel({ hp: 4, ore: 0, itemId: null, itemUses: 0 });
    const results = evaluateChallenges(completeRun(run));

    expect(results).toHaveLength(4);
    expect(results.every((challenge) => challenge.status === 'complete')).toBe(true);
    expect(results.every((challenge) => challenge.reason === null)).toBe(true);
  });

  it('fails Pacifist for a wormling kill during the boss fight', () => {
    const run = createRun();
    run.enterBoss(2000);
    run.recordKill('rock', 'wormling');
    const results = evaluateChallenges(completeRun(run));

    expect(resultById(results, 'pacifist').status).toBe('failed');
    expect(resultById(results, 'primitive').status).toBe('complete');
  });

  it('turns still-active badges into failures when the run is not won', () => {
    const run = createRun();
    run.enterLevel(0, 'shaft-entrance', 0);
    run.endRun(4000);
    const results = evaluateChallenges(run.snapshot);

    expect(resultById(results, 'pacifist')).toMatchObject({
      status: 'failed',
      reason: 'The run was not completed.',
    });
    expect(resultById(results, 'legend')).toMatchObject({
      status: 'failed',
      reason: 'The run was not completed.',
    });
  });

  it('keeps failed reasons after a Crazy victory', () => {
    const results = evaluateChallenges(completeRun(createRun('crazy')));

    expect(resultById(results, 'pacifist').status).toBe('unavailable');
    expect(resultById(results, 'primitive').status).toBe('complete');
    expect(resultById(results, 'untouchable').status).toBe('complete');
    expect(resultById(results, 'legend').status).toBe('unavailable');
  });

  it('only allows Pacifist and Legend where the difficulty permits them', () => {
    expect(isChallengeAvailable('pacifist', 'normal')).toBe(true);
    expect(isChallengeAvailable('pacifist', 'hard')).toBe(true);
    expect(isChallengeAvailable('pacifist', 'impossible')).toBe(true);
    expect(isChallengeAvailable('pacifist', 'crazy')).toBe(false);
    expect(isChallengeAvailable('legend', 'crazy')).toBe(false);
    expect(isChallengeAvailable('primitive', 'crazy')).toBe(true);
    expect(isChallengeAvailable('untouchable', 'crazy')).toBe(true);
  });
});

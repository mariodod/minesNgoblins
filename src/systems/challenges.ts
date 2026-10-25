import { getDifficulty } from '../data/difficulties';
import type { RunSnapshot } from './run-service';

export type ChallengeId = 'pacifist' | 'primitive' | 'untouchable' | 'legend';
export type ChallengeProgressStatus = 'active' | 'failed' | 'unavailable';
export type ChallengeBadgeStatus = 'complete' | 'failed' | 'unavailable';

export interface ChallengeProgress {
  id: ChallengeId;
  name: string;
  status: ChallengeProgressStatus;
  reason: string | null;
}

export interface ChallengeResult {
  id: ChallengeId;
  name: string;
  status: ChallengeBadgeStatus;
  reason: string | null;
}

const CHALLENGE_NAMES: Record<ChallengeId, string> = {
  pacifist: 'Pacifist',
  primitive: 'Primitive',
  untouchable: 'Untouchable',
  legend: 'Legend',
};

function sourceLabel(source: string): string {
  switch (source) {
    case 'rock':
      return 'a rock';
    case 'knife':
      return 'a knife';
    case 'bullet':
      return 'a flintlock';
    case 'magic':
      return 'a rune scroll';
    case 'environment':
      return 'the environment';
    case 'hazard':
      return 'a hazard';
    case 'enemy':
      return 'an enemy';
    default:
      return 'an unknown source';
  }
}

function pacifistProgress(run: RunSnapshot): ChallengeProgress {
  const difficulty = getDifficulty(run.difficultyId);

  if (!difficulty.pacifistAllowed) {
    return {
      id: 'pacifist',
      name: CHALLENGE_NAMES.pacifist,
      status: 'unavailable',
      reason: 'Unavailable on Crazy: every enemy must die.',
    };
  }

  if (run.kills > 0) {
    const first = run.killRecords[0];
    return {
      id: 'pacifist',
      name: CHALLENGE_NAMES.pacifist,
      status: 'failed',
      reason: first
        ? `A standard enemy died to ${sourceLabel(first.source)}.`
        : 'A standard enemy was killed.',
    };
  }

  return {
    id: 'pacifist',
    name: CHALLENGE_NAMES.pacifist,
    status: 'active',
    reason: null,
  };
}

function primitiveProgress(run: RunSnapshot): ChallengeProgress {
  if (run.itemUses > 0) {
    const first = run.itemUseRecords[0];
    return {
      id: 'primitive',
      name: CHALLENGE_NAMES.primitive,
      status: 'failed',
      reason: first
        ? `Used a secondary item (${first.itemId.replace('-', ' ')}).`
        : 'Used a secondary item.',
    };
  }

  const nonRockKill = run.killRecords.find((kill) => kill.source !== 'rock');

  if (nonRockKill) {
    return {
      id: 'primitive',
      name: CHALLENGE_NAMES.primitive,
      status: 'failed',
      reason: `A standard enemy died to ${sourceLabel(nonRockKill.source)}.`,
    };
  }

  return {
    id: 'primitive',
    name: CHALLENGE_NAMES.primitive,
    status: 'active',
    reason: null,
  };
}

function untouchableProgress(run: RunSnapshot): ChallengeProgress {
  if (run.deaths > 0 && run.damageTaken > 0) {
    return {
      id: 'untouchable',
      name: CHALLENGE_NAMES.untouchable,
      status: 'failed',
      reason: `Took ${run.damageTaken} damage and died.`,
    };
  }

  if (run.deaths > 0) {
    return {
      id: 'untouchable',
      name: CHALLENGE_NAMES.untouchable,
      status: 'failed',
      reason: 'Died during the run.',
    };
  }

  if (run.damageTaken > 0) {
    return {
      id: 'untouchable',
      name: CHALLENGE_NAMES.untouchable,
      status: 'failed',
      reason: `Took ${run.damageTaken} damage.`,
    };
  }

  return {
    id: 'untouchable',
    name: CHALLENGE_NAMES.untouchable,
    status: 'active',
    reason: null,
  };
}

/**
 * Live challenge status. This ignores victory so the pause menu can show which
 * badges are still intact before the run ends.
 */
export function getChallengeProgress(run: RunSnapshot): ChallengeProgress[] {
  const pacifist = pacifistProgress(run);
  const primitive = primitiveProgress(run);
  const untouchable = untouchableProgress(run);
  const failed = [pacifist, primitive, untouchable].filter(
    (challenge) => challenge.status === 'failed',
  );

  let legend: ChallengeProgress;

  if (pacifist.status === 'unavailable') {
    legend = {
      id: 'legend',
      name: CHALLENGE_NAMES.legend,
      status: 'unavailable',
      reason: 'Pacifist is unavailable on Crazy.',
    };
  } else if (failed.length > 0) {
    legend = {
      id: 'legend',
      name: CHALLENGE_NAMES.legend,
      status: 'failed',
      reason: `Missing ${failed.map((challenge) => challenge.name).join(', ')}.`,
    };
  } else {
    legend = {
      id: 'legend',
      name: CHALLENGE_NAMES.legend,
      status: 'active',
      reason: null,
    };
  }

  return [pacifist, primitive, untouchable, legend];
}

/**
 * Final badge evaluation. A badge is only complete after the Great Worm falls;
 * failed progress remains failed even if the run is abandoned.
 */
export function evaluateChallenges(run: RunSnapshot): ChallengeResult[] {
  const victory = run.bossDefeated && run.outcome === 'victory';

  return getChallengeProgress(run).map((challenge) => {
    if (challenge.status === 'unavailable') {
      return {
        id: challenge.id,
        name: challenge.name,
        status: 'unavailable',
        reason: challenge.reason,
      };
    }

    if (challenge.status === 'failed') {
      return {
        id: challenge.id,
        name: challenge.name,
        status: 'failed',
        reason: challenge.reason,
      };
    }

    if (!victory) {
      return {
        id: challenge.id,
        name: challenge.name,
        status: 'failed',
        reason: 'The run was not completed.',
      };
    }

    return {
      id: challenge.id,
      name: challenge.name,
      status: 'complete',
      reason: null,
    };
  });
}

export function isChallengeAvailable(
  id: ChallengeId,
  difficultyId: RunSnapshot['difficultyId'],
): boolean {
  if (id === 'pacifist' || id === 'legend') {
    return getDifficulty(difficultyId).pacifistAllowed;
  }

  return true;
}

import type { SecondaryItemId } from './items';
import { SECONDARY_ITEM_IDS } from './items';
import type { SkinId } from './skins';
import type { ChallengeId, ChallengeResult } from '../systems/challenges';
import type { RunSnapshot } from '../systems/run-service';

export type AchievementId =
  | 'first_descent'
  | 'ore_hunter'
  | 'worm_slayer'
  | 'boss_flawless'
  | 'full_arsenal'
  | 'pacifist'
  | 'primitive'
  | 'untouchable'
  | 'legend'
  | 'hard_clear'
  | 'impossible_clear'
  | 'crazy_clear';

export type AchievementTrigger = 'level' | 'run' | 'item';

export interface AchievementContext {
  run: RunSnapshot;
  levelIndex?: number;
  oreHunter?: boolean;
  usedItems?: readonly SecondaryItemId[];
  challenges?: readonly ChallengeResult[];
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  triggers: readonly AchievementTrigger[];
  skinId?: SkinId;
  isEarned: (context: AchievementContext) => boolean;
}

function wonRun(run: RunSnapshot): boolean {
  return run.bossDefeated && run.outcome === 'victory';
}

function challengeComplete(context: AchievementContext, id: ChallengeId): boolean {
  return (
    wonRun(context.run) &&
    context.challenges?.some(
      (challenge) => challenge.id === id && challenge.status === 'complete',
    ) === true
  );
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first_descent',
    name: 'First Descent',
    description: 'Complete Shaft Entrance.',
    triggers: ['level'],
    isEarned: (context) => context.levelIndex === 0,
  },
  {
    id: 'ore_hunter',
    name: 'Ore Hunter',
    description: 'Collect every piece of ore in a level.',
    triggers: ['level'],
    isEarned: (context) => context.oreHunter === true,
  },
  {
    id: 'worm_slayer',
    name: 'Worm Slayer',
    description: 'Defeat the Great Worm and finish a run.',
    triggers: ['run'],
    skinId: 'wormhide',
    isEarned: (context) => wonRun(context.run),
  },
  {
    id: 'boss_flawless',
    name: 'Flawless Warden',
    description: 'Defeat the Great Worm without taking a hit.',
    triggers: ['run'],
    isEarned: (context) => wonRun(context.run) && context.run.bossDamageTaken === 0,
  },
  {
    id: 'full_arsenal',
    name: 'Full Arsenal',
    description: 'Use the knife, flintlock, and rune scroll once each.',
    triggers: ['item'],
    isEarned: (context) =>
      SECONDARY_ITEM_IDS.every((itemId) => context.usedItems?.includes(itemId) === true),
  },
  {
    id: 'pacifist',
    name: 'Pacifist',
    description: 'Finish a run without killing a standard enemy.',
    triggers: ['run'],
    skinId: 'pale-wanderer',
    isEarned: (context) => challengeComplete(context, 'pacifist'),
  },
  {
    id: 'primitive',
    name: 'Primitive',
    description: 'Finish a run with rocks only.',
    triggers: ['run'],
    skinId: 'boneclad',
    isEarned: (context) => challengeComplete(context, 'primitive'),
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Finish a run without taking damage or dying.',
    triggers: ['run'],
    skinId: 'gilded',
    isEarned: (context) => challengeComplete(context, 'untouchable'),
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Earn all three challenge badges in one run.',
    triggers: ['run'],
    skinId: 'legend',
    isEarned: (context) => challengeComplete(context, 'legend'),
  },
  {
    id: 'hard_clear',
    name: 'Hardened',
    description: 'Clear a run on Hard.',
    triggers: ['run'],
    skinId: 'iron',
    isEarned: (context) => wonRun(context.run) && context.run.difficultyId === 'hard',
  },
  {
    id: 'impossible_clear',
    name: 'Against the Odds',
    description: 'Clear a run on Impossible.',
    triggers: ['run'],
    skinId: 'obsidian',
    isEarned: (context) => wonRun(context.run) && context.run.difficultyId === 'impossible',
  },
  {
    id: 'crazy_clear',
    name: 'Certified Crazy',
    description: 'Clear a full run on Crazy.',
    triggers: ['run'],
    skinId: 'crimson',
    isEarned: (context) => wonRun(context.run) && context.run.difficultyId === 'crazy',
  },
];

export const ACHIEVEMENTS_BY_ID: Record<AchievementId, AchievementDefinition> = Object.fromEntries(
  ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]),
) as Record<AchievementId, AchievementDefinition>;

export function getAchievement(id: AchievementId): AchievementDefinition {
  return ACHIEVEMENTS_BY_ID[id];
}

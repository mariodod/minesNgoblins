export type DifficultyId = 'normal' | 'hard' | 'impossible' | 'crazy';

export interface DifficultyConfig {
  id: DifficultyId;
  displayName: string;
  playerMaxHp: number;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  requiresAllEnemiesDead: boolean;
  pacifistAllowed: boolean;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  normal: {
    id: 'normal',
    displayName: 'Normal',
    playerMaxHp: 5,
    enemyHpMultiplier: 1,
    enemyDamageMultiplier: 1,
    requiresAllEnemiesDead: false,
    pacifistAllowed: true,
  },
  hard: {
    id: 'hard',
    displayName: 'Hard',
    playerMaxHp: 5,
    enemyHpMultiplier: 2,
    enemyDamageMultiplier: 2,
    requiresAllEnemiesDead: false,
    pacifistAllowed: true,
  },
  impossible: {
    id: 'impossible',
    displayName: 'Impossible',
    playerMaxHp: 4,
    enemyHpMultiplier: 3,
    enemyDamageMultiplier: 2,
    requiresAllEnemiesDead: false,
    pacifistAllowed: true,
  },
  crazy: {
    id: 'crazy',
    displayName: 'Crazy',
    playerMaxHp: 1,
    enemyHpMultiplier: 5,
    enemyDamageMultiplier: 5,
    requiresAllEnemiesDead: true,
    pacifistAllowed: false,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

export function isDifficultyId(value: string): value is DifficultyId {
  return Object.prototype.hasOwnProperty.call(DIFFICULTIES, value);
}

export function getDifficulty(id: DifficultyId): DifficultyConfig {
  return DIFFICULTIES[id];
}

/**
 * Enemy damage scales with difficulty; hazards and pits do not.
 */
export function scaleEnemyDamage(baseDamage: number, config: DifficultyConfig): number {
  return Math.max(1, Math.ceil(baseDamage * config.enemyDamageMultiplier));
}

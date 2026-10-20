export type EnemyId =
  'practice-dummy' | 'cave-bat' | 'goblin-scavenger' | 'skeleton-thrower' | 'armored-beetle';

export type EnemyBehavior = 'dummy' | 'bat' | 'goblin' | 'skeleton' | 'beetle';

export interface EnemyDefinition {
  id: EnemyId;
  displayName: string;
  behavior: EnemyBehavior;
  spriteKey: string;
  baseHp: number;
  contactDamage: number;
  /**
   * Enemy damage multiplier applies to contact and projectiles.
   * Damage is scaled by difficulty in `damage.ts`, never here.
   */
  speed: number;
  flying: boolean;
  /** Ground enemies patrol around their spawn point within this radius. */
  patrolRadius: number;
  /** Horizontal/vertical range at which the enemy notices the player. */
  detectRange: number;
  /** Telegraph duration before the dangerous action. */
  windupMs: number;
  /** Duration of the dangerous action itself. */
  attackMs: number;
  /** Recovery after the attack, when the enemy is vulnerable. */
  recoverMs: number;
  chargeSpeed: number;
  /** Skeleton-style ranged attack tuning. */
  projectileCooldownMs: number;
  projectileSpeed: number;
  projectileGravity: number;
  /** Bat-style hover tuning. */
  hoverAmplitude: number;
  hoverFrequency: number;
  hitbox: { width: number; height: number };
  bodyOffset: { x: number; y: number };
}

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  'practice-dummy': {
    id: 'practice-dummy',
    displayName: 'Practice Dummy',
    behavior: 'dummy',
    spriteKey: 'dummy',
    baseHp: 3,
    contactDamage: 1,
    speed: 0,
    flying: false,
    patrolRadius: 0,
    detectRange: 0,
    windupMs: 0,
    attackMs: 0,
    recoverMs: 0,
    chargeSpeed: 0,
    projectileCooldownMs: 0,
    projectileSpeed: 0,
    projectileGravity: 0,
    hoverAmplitude: 0,
    hoverFrequency: 0,
    hitbox: { width: 12, height: 18 },
    bodyOffset: { x: 2, y: 2 },
  },
  'cave-bat': {
    id: 'cave-bat',
    displayName: 'Cave Bat',
    behavior: 'bat',
    spriteKey: 'bat',
    baseHp: 1,
    contactDamage: 1,
    speed: 44,
    flying: true,
    patrolRadius: 0,
    detectRange: 220,
    windupMs: 0,
    attackMs: 0,
    recoverMs: 0,
    chargeSpeed: 0,
    projectileCooldownMs: 0,
    projectileSpeed: 0,
    projectileGravity: 0,
    hoverAmplitude: 10,
    hoverFrequency: 2.4,
    hitbox: { width: 12, height: 8 },
    bodyOffset: { x: 1, y: 1 },
  },
  'goblin-scavenger': {
    id: 'goblin-scavenger',
    displayName: 'Goblin Scavenger',
    behavior: 'goblin',
    spriteKey: 'goblin',
    baseHp: 2,
    contactDamage: 1,
    speed: 30,
    flying: false,
    patrolRadius: 48,
    detectRange: 112,
    windupMs: 380,
    attackMs: 620,
    recoverMs: 700,
    chargeSpeed: 128,
    projectileCooldownMs: 0,
    projectileSpeed: 0,
    projectileGravity: 0,
    hoverAmplitude: 0,
    hoverFrequency: 0,
    hitbox: { width: 12, height: 18 },
    bodyOffset: { x: 2, y: 2 },
  },
  'skeleton-thrower': {
    id: 'skeleton-thrower',
    displayName: 'Skeleton Thrower',
    behavior: 'skeleton',
    spriteKey: 'skeleton',
    baseHp: 2,
    contactDamage: 1,
    speed: 32,
    flying: false,
    patrolRadius: 40,
    detectRange: 230,
    windupMs: 520,
    attackMs: 0,
    recoverMs: 0,
    chargeSpeed: 0,
    projectileCooldownMs: 1700,
    projectileSpeed: 160,
    projectileGravity: 500,
    hoverAmplitude: 0,
    hoverFrequency: 0,
    hitbox: { width: 12, height: 20 },
    bodyOffset: { x: 2, y: 2 },
  },
  'armored-beetle': {
    id: 'armored-beetle',
    displayName: 'Armored Beetle',
    behavior: 'beetle',
    spriteKey: 'beetle',
    baseHp: 3,
    contactDamage: 1,
    speed: 22,
    flying: false,
    patrolRadius: 40,
    detectRange: 96,
    windupMs: 500,
    attackMs: 600,
    recoverMs: 900,
    chargeSpeed: 85,
    projectileCooldownMs: 0,
    projectileSpeed: 0,
    projectileGravity: 0,
    hoverAmplitude: 0,
    hoverFrequency: 0,
    hitbox: { width: 18, height: 12 },
    bodyOffset: { x: 1, y: 1 },
  },
};

export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];

export function isEnemyId(value: string): value is EnemyId {
  return value in ENEMIES;
}

/**
 * effective HP = ceil((base HP + level HP bonus) × difficulty HP multiplier), minimum 1.
 */
export function computeEnemyHp(
  baseHp: number,
  levelHpBonus: number,
  difficultyHpMultiplier: number,
): number {
  return Math.max(1, Math.ceil((baseHp + levelHpBonus) * difficultyHpMultiplier));
}

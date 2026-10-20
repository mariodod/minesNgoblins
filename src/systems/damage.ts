export type DamageSource =
  'rock' | 'knife' | 'bullet' | 'magic' | 'enemy' | 'hazard' | 'environment';

export interface DamageEvent {
  amount: number;
  source: DamageSource;
  sourceX: number;
  sourceY: number;
  sourceEntityId?: string;
  /** Horizontal velocity of the projectile at impact, used for directional armor. */
  impactVx?: number;
}

export interface DamageResult {
  hp: number;
  applied: boolean;
  lethal: boolean;
}

/**
 * Applies a single damage event to an HP value. Negative damage is ignored.
 */
export function applyDamage(currentHp: number, amount: number): DamageResult {
  if (amount <= 0 || currentHp <= 0) {
    return { hp: currentHp, applied: false, lethal: currentHp <= 0 };
  }

  const hp = Math.max(0, currentHp - amount);

  return {
    hp,
    applied: true,
    lethal: hp === 0,
  };
}

export function isProjectileSource(source: DamageSource): boolean {
  return source === 'rock' || source === 'knife' || source === 'bullet' || source === 'magic';
}

/**
 * A projectile moving against the target's facing direction hits its front.
 */
export function isFrontalHit(impactVx: number, targetFacing: number): boolean {
  if (impactVx === 0) {
    return false;
  }

  return Math.sign(impactVx) !== Math.sign(targetFacing);
}

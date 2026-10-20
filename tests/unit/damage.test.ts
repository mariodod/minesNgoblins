import { describe, expect, it } from 'vitest';
import { applyDamage, isFrontalHit, isProjectileSource } from '../../src/systems/damage';

describe('applyDamage', () => {
  it('subtracts damage and reports surviving hits', () => {
    expect(applyDamage(3, 1)).toEqual({ hp: 2, applied: true, lethal: false });
  });

  it('reports lethal hits and clamps at zero', () => {
    expect(applyDamage(2, 3)).toEqual({ hp: 0, applied: true, lethal: true });
  });

  it('ignores zero and negative damage', () => {
    expect(applyDamage(2, 0)).toEqual({ hp: 2, applied: false, lethal: false });
    expect(applyDamage(0, 0)).toEqual({ hp: 0, applied: false, lethal: true });
    expect(applyDamage(2, -1).applied).toBe(false);
  });

  it('does not damage a target that is already dead', () => {
    expect(applyDamage(0, 1)).toEqual({ hp: 0, applied: false, lethal: true });
  });
});

describe('isFrontalHit', () => {
  it('treats a projectile moving against the facing direction as a front hit', () => {
    expect(isFrontalHit(-1, 1)).toBe(true);
    expect(isFrontalHit(1, -1)).toBe(true);
  });

  it('treats a projectile moving with the facing direction as a back hit', () => {
    expect(isFrontalHit(1, 1)).toBe(false);
    expect(isFrontalHit(-1, -1)).toBe(false);
  });

  it('does not classify vertical impacts as front hits', () => {
    expect(isFrontalHit(0, 1)).toBe(false);
  });
});

describe('isProjectileSource', () => {
  it('recognizes player weapon sources', () => {
    expect(isProjectileSource('rock')).toBe(true);
    expect(isProjectileSource('knife')).toBe(true);
    expect(isProjectileSource('bullet')).toBe(true);
    expect(isProjectileSource('magic')).toBe(true);
  });

  it('does not treat contact or hazards as projectile sources', () => {
    expect(isProjectileSource('enemy')).toBe(false);
    expect(isProjectileSource('hazard')).toBe(false);
    expect(isProjectileSource('environment')).toBe(false);
  });
});

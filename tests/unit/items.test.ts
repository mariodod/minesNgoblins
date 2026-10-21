import { describe, expect, it } from 'vitest';
import {
  HEALING_SALVE,
  isPickupId,
  isSecondaryItemId,
  ORE,
  PICKUP_IDS,
  pickupDisplayName,
  pickupTextureKey,
  SECONDARY_ITEMS,
} from '../../src/data/items';

describe('secondary item data', () => {
  it('matches the designed ammo and damage values', () => {
    expect(SECONDARY_ITEMS.knife).toMatchObject({
      initialUses: 5,
      maxUses: 8,
      damage: 3,
      damageSource: 'knife',
    });
    expect(SECONDARY_ITEMS.flintlock).toMatchObject({
      initialUses: 6,
      maxUses: 12,
      damage: 2,
      damageSource: 'bullet',
    });
    expect(SECONDARY_ITEMS['rune-scroll']).toMatchObject({
      initialUses: 2,
      maxUses: 3,
      damage: 4,
      damageSource: 'magic',
      explosionRadius: 28,
      stunMs: 1000,
    });
  });

  it('exposes every pickup id and texture', () => {
    expect(PICKUP_IDS).toEqual(['knife', 'flintlock', 'rune-scroll', 'healing-salve', 'ore']);

    for (const id of PICKUP_IDS) {
      expect(isPickupId(id)).toBe(true);
      expect(pickupTextureKey(id).length).toBeGreaterThan(0);
      expect(pickupDisplayName(id).length).toBeGreaterThan(0);
    }
  });

  it('distinguishes secondary items from instant pickups', () => {
    expect(isSecondaryItemId('knife')).toBe(true);
    expect(isSecondaryItemId('healing-salve')).toBe(false);
    expect(isSecondaryItemId('ore')).toBe(false);
    expect(isPickupId('healing-salve')).toBe(true);
    expect(isPickupId('ore')).toBe(true);
    expect(isPickupId('torch')).toBe(false);
    expect(isSecondaryItemId('toString')).toBe(false);
    expect(isPickupId('constructor')).toBe(false);
  });

  it('defines instant pickup values', () => {
    expect(HEALING_SALVE.healAmount).toBe(2);
    expect(ORE.value).toBe(10);
  });
});

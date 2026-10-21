import type { DamageSource } from '../systems/damage';

export type SecondaryItemId = 'knife' | 'flintlock' | 'rune-scroll';
export type PickupId = SecondaryItemId | 'healing-salve' | 'ore';

export interface SecondaryItemDefinition {
  id: SecondaryItemId;
  displayName: string;
  textureKey: string;
  projectileTextureKey: string;
  initialUses: number;
  maxUses: number;
  damage: number;
  damageSource: DamageSource;
  speed: number;
  gravity: number;
  cooldownMs: number;
  lifetimeMs: number;
  explosionRadius: number;
  stunMs: number;
}

/**
 * Secondary weapons use a single slot. Values mirror the design document and
 * are shared by the inventory, projectile factory, and HUD.
 */
export const SECONDARY_ITEMS: Record<SecondaryItemId, SecondaryItemDefinition> = {
  knife: {
    id: 'knife',
    displayName: 'Knife',
    textureKey: 'knife',
    projectileTextureKey: 'knife',
    initialUses: 5,
    maxUses: 8,
    damage: 3,
    damageSource: 'knife',
    speed: 340,
    gravity: 0,
    cooldownMs: 260,
    lifetimeMs: 900,
    explosionRadius: 0,
    stunMs: 0,
  },
  flintlock: {
    id: 'flintlock',
    displayName: 'Flintlock',
    textureKey: 'flintlock',
    projectileTextureKey: 'bullet',
    initialUses: 6,
    maxUses: 12,
    damage: 2,
    damageSource: 'bullet',
    speed: 460,
    gravity: 0,
    cooldownMs: 320,
    lifetimeMs: 700,
    explosionRadius: 0,
    stunMs: 0,
  },
  'rune-scroll': {
    id: 'rune-scroll',
    displayName: 'Rune Scroll',
    textureKey: 'rune-scroll',
    projectileTextureKey: 'rune-scroll',
    initialUses: 2,
    maxUses: 3,
    damage: 4,
    damageSource: 'magic',
    speed: 240,
    gravity: 620,
    cooldownMs: 700,
    lifetimeMs: 2000,
    explosionRadius: 28,
    stunMs: 1000,
  },
};

export const PICKUP_IDS = [
  'knife',
  'flintlock',
  'rune-scroll',
  'healing-salve',
  'ore',
] as const satisfies readonly PickupId[];

export const HEALING_SALVE = {
  id: 'healing-salve',
  displayName: 'Healing Salve',
  textureKey: 'salve',
  healAmount: 2,
} as const;

export const ORE = {
  id: 'ore',
  displayName: 'Ore',
  textureKey: 'ore',
  value: 10,
} as const;

export function isSecondaryItemId(value: string): value is SecondaryItemId {
  return Object.prototype.hasOwnProperty.call(SECONDARY_ITEMS, value);
}

export function isPickupId(value: string): value is PickupId {
  return value === HEALING_SALVE.id || value === ORE.id || isSecondaryItemId(value);
}

export function pickupDisplayName(id: PickupId): string {
  if (isSecondaryItemId(id)) {
    return SECONDARY_ITEMS[id].displayName;
  }

  return id === HEALING_SALVE.id ? HEALING_SALVE.displayName : ORE.displayName;
}

export function pickupTextureKey(id: PickupId): string {
  if (isSecondaryItemId(id)) {
    return SECONDARY_ITEMS[id].textureKey;
  }

  return id === HEALING_SALVE.id ? HEALING_SALVE.textureKey : ORE.textureKey;
}

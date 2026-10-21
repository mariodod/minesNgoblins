import { SECONDARY_ITEMS, type SecondaryItemDefinition, type SecondaryItemId } from '../data/items';

export interface InventorySnapshot {
  itemId: SecondaryItemId | null;
  uses: number;
  maxUses: number;
}

export interface InventoryCollectResult {
  accepted: boolean;
  replaced: boolean;
  addedUses: number;
  snapshot: InventorySnapshot;
}

/**
 * Pure one-slot inventory. It owns ammo stacking and replacement rules so the
 * player entity and unit tests share the same behavior.
 */
export class ItemInventory {
  private itemId: SecondaryItemId | null = null;
  private uses = 0;

  get snapshot(): InventorySnapshot {
    const definition = this.definition;

    return {
      itemId: this.itemId,
      uses: this.uses,
      maxUses: definition?.maxUses ?? 0,
    };
  }

  get definition(): SecondaryItemDefinition | null {
    return this.itemId ? SECONDARY_ITEMS[this.itemId] : null;
  }

  collect(itemId: SecondaryItemId): InventoryCollectResult {
    const definition = SECONDARY_ITEMS[itemId];

    if (this.itemId === itemId) {
      if (this.uses >= definition.maxUses) {
        return {
          accepted: false,
          replaced: false,
          addedUses: 0,
          snapshot: this.snapshot,
        };
      }

      const previousUses = this.uses;
      this.uses = Math.min(definition.maxUses, this.uses + definition.initialUses);

      return {
        accepted: true,
        replaced: false,
        addedUses: this.uses - previousUses,
        snapshot: this.snapshot,
      };
    }

    const replaced = this.itemId !== null;
    this.itemId = itemId;
    this.uses = definition.initialUses;

    return {
      accepted: true,
      replaced,
      addedUses: this.uses,
      snapshot: this.snapshot,
    };
  }

  consume(): boolean {
    if (!this.itemId || this.uses <= 0) {
      return false;
    }

    this.uses -= 1;

    if (this.uses <= 0) {
      this.itemId = null;
      this.uses = 0;
    }

    return true;
  }

  clear(): void {
    this.itemId = null;
    this.uses = 0;
  }
}

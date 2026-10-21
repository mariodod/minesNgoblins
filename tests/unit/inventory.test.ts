import { describe, expect, it } from 'vitest';
import { ItemInventory } from '../../src/systems/inventory';

describe('ItemInventory', () => {
  it('starts empty', () => {
    const inventory = new ItemInventory();

    expect(inventory.snapshot).toEqual({ itemId: null, uses: 0, maxUses: 0 });
    expect(inventory.definition).toBeNull();
  });

  it('accepts a new item at its initial use count', () => {
    const inventory = new ItemInventory();
    const result = inventory.collect('knife');

    expect(result).toMatchObject({ accepted: true, replaced: false, addedUses: 5 });
    expect(inventory.snapshot).toEqual({ itemId: 'knife', uses: 5, maxUses: 8 });
  });

  it('stacks the same item up to its cap', () => {
    const inventory = new ItemInventory();
    inventory.collect('knife');

    const second = inventory.collect('knife');
    expect(second).toMatchObject({ accepted: true, replaced: false, addedUses: 3 });
    expect(inventory.snapshot.uses).toBe(8);

    const third = inventory.collect('knife');
    expect(third.accepted).toBe(false);
    expect(third.addedUses).toBe(0);
    expect(inventory.snapshot.uses).toBe(8);
  });

  it('replaces a different item and resets its ammo', () => {
    const inventory = new ItemInventory();
    inventory.collect('knife');
    inventory.consume();

    const result = inventory.collect('flintlock');

    expect(result).toMatchObject({ accepted: true, replaced: true, addedUses: 6 });
    expect(inventory.snapshot).toEqual({ itemId: 'flintlock', uses: 6, maxUses: 12 });
  });

  it('consumes ammo and clears an empty slot', () => {
    const inventory = new ItemInventory();
    inventory.collect('rune-scroll');

    expect(inventory.consume()).toBe(true);
    expect(inventory.snapshot.uses).toBe(1);
    expect(inventory.consume()).toBe(true);
    expect(inventory.snapshot).toEqual({ itemId: null, uses: 0, maxUses: 0 });
    expect(inventory.consume()).toBe(false);
  });

  it('can be cleared explicitly', () => {
    const inventory = new ItemInventory();
    inventory.collect('flintlock');
    inventory.clear();

    expect(inventory.snapshot).toEqual({ itemId: null, uses: 0, maxUses: 0 });
  });

  it('restores a carried item and clamps its ammo', () => {
    const inventory = new ItemInventory();
    inventory.restore('knife', 3);

    expect(inventory.snapshot).toEqual({ itemId: 'knife', uses: 3, maxUses: 8 });

    inventory.restore('flintlock', 99);
    expect(inventory.snapshot).toEqual({ itemId: 'flintlock', uses: 12, maxUses: 12 });
  });

  it('clears the slot when restoring an empty or depleted item', () => {
    const inventory = new ItemInventory();
    inventory.collect('knife');

    inventory.restore(null, 3);
    expect(inventory.snapshot).toEqual({ itemId: null, uses: 0, maxUses: 0 });

    inventory.restore('knife', 0);
    expect(inventory.snapshot).toEqual({ itemId: null, uses: 0, maxUses: 0 });
  });
});

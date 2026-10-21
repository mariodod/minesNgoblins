import Phaser from 'phaser';
import { pickupTextureKey, type PickupId } from '../../data/items';

/**
 * A one-time collectible dropped by a crate or placed on a pedestal.
 * Pickups the player cannot accept (full ammo or full health) stay in place.
 */
export class ItemPickup extends Phaser.Physics.Arcade.Image {
  readonly itemId: PickupId;
  nextPromptAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: PickupId) {
    super(scene, x, y, pickupTextureKey(itemId));

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.itemId = itemId;
    this.setDepth(9);
    this.arcadeBody.setAllowGravity(false);
    this.arcadeBody.setImmovable(true);

    scene.tweens.add({
      targets: this,
      y: y - 4,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}

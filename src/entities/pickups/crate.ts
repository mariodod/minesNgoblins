import Phaser from 'phaser';
import type { PickupId } from '../../data/items';

/**
 * A static, breakable crate. Contents are authored in the level and released
 * exactly once when the crate is destroyed.
 */
export class Crate extends Phaser.Physics.Arcade.Image {
  readonly contents: PickupId;

  constructor(scene: Phaser.Scene, x: number, y: number, contents: PickupId) {
    super(scene, x, y, 'crate');

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.contents = contents;
    this.setDepth(6);
  }
}

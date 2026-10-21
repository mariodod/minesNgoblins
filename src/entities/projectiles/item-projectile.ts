import Phaser from 'phaser';
import { PLAYER_TUNING } from '../../config/tuning';
import {
  SECONDARY_ITEMS,
  type SecondaryItemDefinition,
  type SecondaryItemId,
} from '../../data/items';
import type { ProjectileLaunch } from './aim';

/**
 * Shared projectile body for all limited-use secondary weapons. The item
 * definition supplies speed, gravity, damage source, and lifetime.
 */
export class ItemProjectile extends Phaser.Physics.Arcade.Image {
  readonly itemId: SecondaryItemId;
  readonly definition: SecondaryItemDefinition;

  constructor(scene: Phaser.Scene, itemId: SecondaryItemId, launch: ProjectileLaunch) {
    const definition = SECONDARY_ITEMS[itemId];
    super(scene, launch.x, launch.y, definition.projectileTextureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.itemId = itemId;
    this.definition = definition;
    this.setDepth(15);

    if (definition.gravity > 0) {
      this.arcadeBody.setGravityY(definition.gravity - PLAYER_TUNING.gravity);
    } else {
      this.arcadeBody.setAllowGravity(false);
    }

    if (itemId !== 'flintlock') {
      this.setAngularVelocity(launch.velocityX >= 0 ? 540 : -540);
    }

    this.setVelocity(launch.velocityX, launch.velocityY);

    scene.time.delayedCall(definition.lifetimeMs, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}

import Phaser from 'phaser';
import { PLAYER_TUNING } from '../../config/tuning';

/**
 * Arcing projectile spat by the Great Worm. It obeys a custom gravity value so
 * its arc is consistent regardless of the scene's default player gravity.
 */
export class BossRock extends Phaser.Physics.Arcade.Image {
  readonly damage: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    gravity: number,
    damage: number,
  ) {
    super(scene, x, y, 'boulder');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = damage;
    this.setDepth(15);
    this.setAngularVelocity(velocityX >= 0 ? 220 : -220);

    const body = this.arcadeBody;
    body.setSize(10, 10);
    body.setGravityY(gravity - PLAYER_TUNING.gravity);
    this.setVelocity(velocityX, velocityY);

    scene.time.delayedCall(4200, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}

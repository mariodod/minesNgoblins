import Phaser from 'phaser';
import { PLAYER_TUNING, ROCK_TUNING } from '../../config/tuning';
import type { ProjectileLaunch } from './aim';

export class Rock extends Phaser.Physics.Arcade.Image {
  private bounceCount = 0;

  constructor(scene: Phaser.Scene, launch: ProjectileLaunch) {
    super(scene, launch.x, launch.y, 'rock');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(15);
    this.setAngularVelocity(launch.velocityX >= 0 ? 540 : -540);

    const body = this.arcadeBody;
    body.setSize(6, 6);
    body.setGravityY(ROCK_TUNING.gravity - PLAYER_TUNING.gravity);
    this.setBounce(ROCK_TUNING.bounce);
    this.setCollideWorldBounds(true);
    this.setVelocity(launch.velocityX, launch.velocityY);

    scene.time.delayedCall(ROCK_TUNING.lifetimeMs, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Returns false when the rock has already used its one bounce.
   */
  registerBounce(): boolean {
    this.bounceCount += 1;

    if (this.bounceCount > 1) {
      return false;
    }

    this.setBounce(ROCK_TUNING.bounce * 0.55);
    this.scene.time.delayedCall(ROCK_TUNING.bounceLifetimeMs, () => {
      if (this.active) {
        this.destroy();
      }
    });

    return true;
  }
}

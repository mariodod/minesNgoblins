import Phaser from 'phaser';
import { PLAYER_TUNING, PROJECTILE_TUNING } from '../../config/tuning';

export interface BoneLaunch {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
  damage: number;
}

/**
 * Skeleton projectile. Arcs under gravity and breaks on the first surface it hits.
 */
export class Bone extends Phaser.Physics.Arcade.Image {
  readonly damage: number;

  constructor(scene: Phaser.Scene, launch: BoneLaunch) {
    super(scene, launch.x, launch.y, 'bone');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = launch.damage;
    this.setDepth(15);
    this.setAngularVelocity(launch.velocityX >= 0 ? 360 : -360);

    const body = this.arcadeBody;
    body.setSize(5, 3);
    body.setGravityY(launch.gravity - PLAYER_TUNING.gravity);
    this.setVelocity(launch.velocityX, launch.velocityY);
    this.setCollideWorldBounds(true);

    scene.time.delayedCall(PROJECTILE_TUNING.bone.lifetimeMs, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}

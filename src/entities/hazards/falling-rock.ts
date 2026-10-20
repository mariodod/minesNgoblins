import Phaser from 'phaser';

/**
 * A telegraphed ceiling rock. The level scene owns the trigger, shadow, and floor impact.
 */
export class FallingRock extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boulder');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(16);

    const body = this.arcadeBody;
    body.setSize(10, 10);
    body.setAllowGravity(true);
    this.setVelocity(0, 20);

    scene.time.delayedCall(5000, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}

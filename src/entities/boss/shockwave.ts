import Phaser from 'phaser';

/**
 * Ground shockwave from the worm's quake. It travels horizontally along the
 * arena floor and must be jumped rather than attacked.
 */
export class Shockwave extends Phaser.Physics.Arcade.Image {
  readonly damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: -1 | 1, damage: number) {
    super(scene, x, y, 'shockwave');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = damage;
    this.setDepth(13);

    const body = this.arcadeBody;
    body.setAllowGravity(false);
    body.setSize(18, 10);
    body.setVelocityX(direction * 168);

    scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.55 },
      scaleY: { from: 1, to: 1.3 },
      duration: 220,
      yoyo: true,
      repeat: -1,
    });

    scene.time.delayedCall(3200, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}

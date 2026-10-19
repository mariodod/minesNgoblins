import Phaser from 'phaser';

export class PracticeDummy extends Phaser.Physics.Arcade.Sprite {
  static readonly MAX_HP = 3;

  hp = PracticeDummy.MAX_HP;
  isDead = false;

  private readonly pips: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dummy');

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setDepth(12);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(12, 18);
    body.setOffset(2, 2);

    this.createPips();
  }

  get isAlive(): boolean {
    return !this.isDead;
  }

  takeDamage(amount: number, _sourceX: number): boolean {
    if (this.isDead) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.updatePips();
    this.playHitReaction();
    this.emit('enemy-damaged', this.hp);

    if (this.hp <= 0) {
      this.die();
    }

    return true;
  }

  private createPips(): void {
    for (let index = 0; index < PracticeDummy.MAX_HP; index += 1) {
      const pip = this.scene.add
        .rectangle(this.x - 7 + index * 5, this.y - 14, 4, 2, 0xe74c3c)
        .setDepth(13);
      this.pips.push(pip);
    }
  }

  private updatePips(): void {
    this.pips.forEach((pip, index) => {
      pip.setFillStyle(index < this.hp ? 0xe74c3c : 0x3a2426);
    });
  }

  private playHitReaction(): void {
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(60, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.12,
      scaleY: 0.86,
      duration: 55,
      yoyo: true,
    });
  }

  private die(): void {
    this.isDead = true;
    (this.body as Phaser.Physics.Arcade.StaticBody).enable = false;

    for (const pip of this.pips) {
      pip.destroy();
    }
    this.pips.length = 0;

    this.emit('enemy-killed');

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 8,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 220,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}

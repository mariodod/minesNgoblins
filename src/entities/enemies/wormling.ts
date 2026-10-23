import type Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { Enemy, type EnemyUpdateContext } from './enemy';

/**
 * Boss-arena add. It emerges from a burrow hole and crawls toward the player
 * with a short grace period, giving the player a readable summon window.
 */
export class Wormling extends Enemy {
  private readonly activeAt: number;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, ENEMIES.wormling, hp);

    this.activeAt = scene.time.now + 260;
    this.setPhase('idle');
    this.setAlpha(0.35);
    this.setScale(0.7);
    this.arcadeBody.setVelocity(0, 0);

    scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Back.Out',
    });
  }

  protected override think(time: number, _delta: number, context: EnemyUpdateContext): void {
    if (time < this.activeAt) {
      this.setPhase('idle');
      this.arcadeBody.setVelocityX(0);
      return;
    }

    const direction = context.playerX >= this.x ? 1 : -1;
    const distance = Math.abs(context.playerX - this.x);

    this.setFacing(direction);

    if (context.playerAlive && distance > 8) {
      this.setPhase('attack');
      this.arcadeBody.setVelocityX(direction * this.definition.speed);
    } else {
      this.setPhase('idle');
      this.arcadeBody.setVelocityX(0);
    }
  }
}

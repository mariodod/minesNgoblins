import Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { Enemy, type EnemyUpdateContext } from './enemy';

/**
 * Flutters around the player's head height in a sine wave.
 * Its single HP makes it a one-rock nuisance, but its movement is erratic.
 */
export class Bat extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, ENEMIES['cave-bat'], hp);
    this.setPhase('patrol');
  }

  protected override think(time: number, _delta: number, context: EnemyUpdateContext): void {
    const definition = this.definition;
    const dx = context.playerX - this.x;
    const dy = context.playerY - this.y;
    const distance = Math.hypot(dx, dy);
    const isHunting = context.playerAlive && distance <= definition.detectRange;
    const targetX = isHunting ? context.playerX : this.spawnX;
    const targetY = isHunting ? context.playerY - 2 : this.spawnY;
    const targetDx = targetX - this.x;
    const targetDy = targetY - this.y;

    const velocityX = Math.abs(targetDx) > 14 ? Math.sign(targetDx) * definition.speed : 0;
    const hover =
      Math.sin((time / 1000) * Math.PI * 2 * definition.hoverFrequency) * definition.hoverAmplitude;
    const velocityY =
      Phaser.Math.Clamp(targetDy * 1.4, -definition.speed, definition.speed) + hover;

    if (velocityX !== 0) {
      this.setFacing(velocityX);
    }

    this.arcadeBody.setVelocity(velocityX, velocityY);
    this.setPhase(isHunting ? 'attack' : 'patrol');
  }
}

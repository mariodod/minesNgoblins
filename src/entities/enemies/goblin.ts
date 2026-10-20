import { ENEMIES } from '../../data/enemies';
import { Enemy, type EnemyUpdateContext } from './enemy';
import type Phaser from 'phaser';

type GoblinMode = 'patrol' | 'windup' | 'charge' | 'recover';

/**
 * Patrols a short stretch of floor, notices the player, then telegraphs and charges.
 */
export class Goblin extends Enemy {
  private mode: GoblinMode = 'patrol';
  private modeUntil = 0;
  private chargeDirection = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, ENEMIES['goblin-scavenger'], hp);
  }

  protected override think(time: number, _delta: number, context: EnemyUpdateContext): void {
    const definition = this.definition;

    switch (this.mode) {
      case 'patrol':
        this.patrol(time, context);
        break;
      case 'windup':
        this.arcadeBody.setVelocityX(0);
        this.setPhase('windup');

        if (time >= this.modeUntil) {
          this.mode = 'charge';
          this.modeUntil = time + definition.attackMs;
          this.setPhase('attack');
          this.arcadeBody.setVelocityX(this.chargeDirection * definition.chargeSpeed);
        }
        break;
      case 'charge':
        this.setPhase('attack');
        this.arcadeBody.setVelocityX(this.chargeDirection * definition.chargeSpeed);

        if (
          time >= this.modeUntil ||
          this.arcadeBody.blocked.left ||
          this.arcadeBody.blocked.right
        ) {
          this.mode = 'recover';
          this.modeUntil = time + definition.recoverMs;
          this.setPhase('recover');
          this.arcadeBody.setVelocityX(0);
        }
        break;
      case 'recover':
        this.setPhase('recover');
        this.arcadeBody.setVelocityX(0);

        if (time >= this.modeUntil) {
          this.mode = 'patrol';
          this.setPhase('patrol');
        }
        break;
    }
  }

  private patrol(time: number, context: EnemyUpdateContext): void {
    const definition = this.definition;
    this.setPhase('patrol');
    this.patrolWithinSpawn(definition.patrolRadius, definition.speed);

    const dx = context.playerX - this.x;
    const dy = context.playerY - this.y;

    if (context.playerAlive && Math.abs(dx) <= definition.detectRange && Math.abs(dy) <= 28) {
      this.mode = 'windup';
      this.modeUntil = time + definition.windupMs;
      this.chargeDirection = dx >= 0 ? 1 : -1;
      this.setFacing(this.chargeDirection);
      this.setPhase('windup');
      this.arcadeBody.setVelocityX(0);
      this.showTelegraph('!', definition.windupMs);
    }
  }
}

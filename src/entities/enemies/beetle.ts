import type Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { isFrontalHit, isProjectileSource, type DamageEvent } from '../../systems/damage';
import { Enemy, type EnemyUpdateContext } from './enemy';

type BeetleMode = 'patrol' | 'windup' | 'charge' | 'recover';

/**
 * Slow armored bruiser. Rocks, knives, and bullets bounce off its front plate;
 * magic bypasses the plate, and any hit from behind hurts.
 */
export class Beetle extends Enemy {
  private mode: BeetleMode = 'patrol';
  private modeUntil = 0;
  private nextDetectAt = 0;
  private chargeDirection = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, ENEMIES['armored-beetle'], hp);
  }

  protected override adjustIncomingDamage(event: DamageEvent): {
    amount: number;
    deflected: boolean;
  } {
    if (
      event.source !== 'magic' &&
      isProjectileSource(event.source) &&
      isFrontalHit(event.impactVx ?? 0, this.facing)
    ) {
      return { amount: 0, deflected: true };
    }

    return { amount: event.amount, deflected: false };
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
          this.nextDetectAt = time + 500;
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

    if (
      context.playerAlive &&
      time >= this.nextDetectAt &&
      Math.abs(dx) <= definition.detectRange &&
      Math.abs(dy) <= 24
    ) {
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

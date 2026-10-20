import type Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { PROJECTILE_TUNING } from '../../config/tuning';
import { computeAimedArc } from '../projectiles/aim';
import type { BoneLaunch } from '../projectiles/bone';
import { Enemy, type EnemyUpdateContext } from './enemy';

/**
 * Keeps its distance, telegraphs a raised arm, then lobs a bone in an arc.
 * The bone event is consumed by the level scene so the skeleton stays scene-agnostic.
 */
export class Skeleton extends Enemy {
  private nextThrowAt = 0;
  private windupUntil = 0;
  private windingUp = false;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, ENEMIES['skeleton-thrower'], hp);
    this.nextThrowAt = scene.time.now + 900;
  }

  protected override think(time: number, _delta: number, context: EnemyUpdateContext): void {
    const definition = this.definition;
    const dx = context.playerX - this.x;
    const dy = context.playerY - this.y;

    if (this.windingUp) {
      this.setPhase('windup');
      this.arcadeBody.setVelocityX(0);

      if (time >= this.windupUntil) {
        this.windingUp = false;
        this.nextThrowAt = time + definition.projectileCooldownMs;
        this.throwBone(context);
        this.setPhase('idle');
      }

      return;
    }

    const inCombat =
      context.playerAlive && Math.abs(dx) <= definition.detectRange && Math.abs(dy) <= 110;

    if (inCombat && time >= this.nextThrowAt) {
      this.windingUp = true;
      this.windupUntil = time + definition.windupMs;
      this.arcadeBody.setVelocityX(0);
      this.setFacing(dx);
      this.showTelegraph('...', definition.windupMs);
      return;
    }

    if (inCombat) {
      this.setPhase('attack');
      this.setFacing(dx);

      if (Math.abs(dx) < 70) {
        this.arcadeBody.setVelocityX(-Math.sign(dx) * definition.speed);
      } else if (Math.abs(dx) > 160) {
        this.arcadeBody.setVelocityX(Math.sign(dx) * definition.speed);
      } else {
        this.arcadeBody.setVelocityX(0);
      }

      return;
    }

    this.setPhase('patrol');
    this.patrolWithinSpawn(definition.patrolRadius, definition.speed);
  }

  private throwBone(context: EnemyUpdateContext): void {
    const definition = this.definition;
    const direction = context.playerX >= this.x ? 1 : -1;
    const launchX = this.x + direction * 8;
    const launchY = this.y - 8;

    // Aim at the player's chest so the bone crosses the torso before the floor.
    const arc = computeAimedArc({
      originX: launchX,
      originY: launchY,
      targetX: context.playerX,
      targetY: context.playerY - 6,
      speed: definition.projectileSpeed,
      gravity: definition.projectileGravity,
    });

    const launch: BoneLaunch = {
      x: launchX,
      y: launchY,
      velocityX: arc.velocityX,
      velocityY: arc.velocityY,
      gravity: definition.projectileGravity,
      damage: PROJECTILE_TUNING.bone.damage,
    };

    this.emit('enemy-projectile', launch);
  }
}

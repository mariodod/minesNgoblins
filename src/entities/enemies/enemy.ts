import Phaser from 'phaser';
import { ENEMY_TUNING } from '../../config/tuning';
import type { EnemyDefinition, EnemyId } from '../../data/enemies';
import { applyDamage, type DamageEvent } from '../../systems/damage';

export interface EnemyUpdateContext {
  playerX: number;
  playerY: number;
  playerAlive: boolean;
}

export interface EnemyHitResult {
  applied: boolean;
  deflected: boolean;
  killed: boolean;
}

export type EnemyAttackPhase = 'idle' | 'patrol' | 'windup' | 'attack' | 'recover' | 'dead';

/**
 * Shared combat body for every standard enemy. Subclasses only implement think().
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly definition: EnemyDefinition;
  hp: number;
  readonly maxHp: number;
  facing = -1;
  isDead = false;

  protected readonly spawnX: number;
  protected readonly spawnY: number;
  protected phase: EnemyAttackPhase = 'idle';
  protected stunnedUntil = 0;
  private hitFlashUntil = 0;
  private readonly pips: Phaser.GameObjects.Rectangle[] = [];
  private readonly telegraph: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition, hp: number) {
    super(scene, x, y, definition.spriteKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.definition = definition;
    this.hp = hp;
    this.maxHp = hp;
    this.spawnX = x;
    this.spawnY = y;

    this.setDepth(12);
    this.setCollideWorldBounds(true);

    const body = this.arcadeBody;
    body.setSize(definition.hitbox.width, definition.hitbox.height);
    body.setOffset(definition.bodyOffset.x, definition.bodyOffset.y);

    if (definition.flying || definition.behavior === 'dummy') {
      body.setAllowGravity(false);
    }

    if (definition.behavior === 'dummy') {
      body.setImmovable(true);
    }

    this.telegraph = scene.add
      .text(x, y - 18, '', {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '8px',
        color: '#ffcf5a',
      })
      .setOrigin(0.5)
      .setDepth(18)
      .setVisible(false);

    this.createPips();
    this.setPhase(definition.behavior === 'dummy' ? 'idle' : 'patrol');
  }

  get isAlive(): boolean {
    return !this.isDead;
  }

  get isStunned(): boolean {
    return this.scene.time.now < this.stunnedUntil;
  }

  get contactDamage(): number {
    return this.definition.contactDamage;
  }

  get enemyId(): EnemyId {
    return this.definition.id;
  }

  get attackPhase(): EnemyAttackPhase {
    return this.phase;
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  override update(time: number, delta: number, context: EnemyUpdateContext): void {
    if (!this.active || this.isDead) {
      return;
    }

    this.updateStatusVisuals(time);
    this.updatePipsPosition();
    this.updateTelegraphPosition();

    if (this.isStunned) {
      this.arcadeBody.setVelocityX(0);
      return;
    }

    this.think(time, delta, context);
  }

  takeDamage(event: DamageEvent): EnemyHitResult {
    if (this.isDead) {
      return { applied: false, deflected: false, killed: true };
    }

    const adjusted = this.adjustIncomingDamage(event);

    if (adjusted.deflected) {
      this.flashHit(70);
      this.emit('enemy-deflected', { enemy: this, event });
      return { applied: false, deflected: true, killed: false };
    }

    const result = applyDamage(this.hp, adjusted.amount);

    if (!result.applied) {
      return { applied: false, deflected: false, killed: this.isDead };
    }

    this.hp = result.hp;
    this.updatePips();
    this.flashHit(ENEMY_TUNING.hurtFlashMs);
    this.applyKnockback(event);
    this.emit('enemy-damaged', { enemy: this, event, hp: this.hp, maxHp: this.maxHp });

    if (result.lethal) {
      this.die(event);
      return { applied: true, deflected: false, killed: true };
    }

    return { applied: true, deflected: false, killed: false };
  }

  stun(durationMs: number): void {
    if (this.isDead) {
      return;
    }

    this.stunnedUntil = Math.max(this.stunnedUntil, this.scene.time.now + durationMs);
    this.arcadeBody.setVelocityX(0);
    this.setPhase('idle');
  }

  override destroy(fromScene?: boolean): void {
    this.destroyPips();

    if (this.telegraph.active) {
      this.telegraph.destroy();
    }

    super.destroy(fromScene);
  }

  protected think(_time: number, _delta: number, _context: EnemyUpdateContext): void {
    // Base enemies are stationary targets.
  }

  protected adjustIncomingDamage(event: DamageEvent): { amount: number; deflected: boolean } {
    return { amount: event.amount, deflected: false };
  }

  protected setPhase(phase: EnemyAttackPhase): void {
    this.phase = phase;
  }

  protected setFacing(direction: number): void {
    if (direction === 0) {
      return;
    }

    this.facing = direction < 0 ? -1 : 1;
    this.setFlipX(this.facing < 0);
  }

  protected showTelegraph(symbol: string, durationMs: number): void {
    this.telegraph.setText(symbol).setVisible(true).setAlpha(1).setScale(1);

    this.scene.tweens.add({
      targets: this.telegraph,
      scale: 1.35,
      duration: Math.max(80, durationMs / 2),
      yoyo: true,
    });

    this.scene.time.delayedCall(durationMs, () => {
      if (this.telegraph.active) {
        this.telegraph.setVisible(false);
      }
    });
  }

  protected patrolWithinSpawn(radius: number, speed: number): void {
    if (this.x <= this.spawnX - radius) {
      this.setFacing(1);
    } else if (this.x >= this.spawnX + radius) {
      this.setFacing(-1);
    }

    const body = this.arcadeBody;

    if (body.blocked.left) {
      this.setFacing(1);
    } else if (body.blocked.right) {
      this.setFacing(-1);
    }

    body.setVelocityX(this.facing * speed);
  }

  private adjustMovementKnockback(direction: number): void {
    if (this.definition.behavior === 'dummy') {
      return;
    }

    this.arcadeBody.setVelocity(direction * ENEMY_TUNING.knockbackX, -ENEMY_TUNING.knockbackY);
  }

  private applyKnockback(event: DamageEvent): void {
    const direction = this.x < event.sourceX ? -1 : 1;
    this.adjustMovementKnockback(direction);
  }

  private flashHit(durationMs: number): void {
    this.hitFlashUntil = this.scene.time.now + durationMs;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  }

  private updateStatusVisuals(time: number): void {
    if (time < this.hitFlashUntil) {
      return;
    }

    if (this.isStunned) {
      this.setTint(0x7ec8ff);
      return;
    }

    this.clearTint();
  }

  private createPips(): void {
    if (this.maxHp < ENEMY_TUNING.minHpForPips) {
      return;
    }

    const count = Math.min(this.maxHp, 8);

    for (let index = 0; index < count; index += 1) {
      const pip = this.scene.add
        .rectangle(0, 0, ENEMY_TUNING.hpPipWidth, ENEMY_TUNING.hpPipHeight, 0xe74c3c)
        .setDepth(13);
      this.pips.push(pip);
    }

    this.updatePips();
    this.updatePipsPosition();
  }

  private updatePips(): void {
    const visibleHp = Math.ceil((this.hp / this.maxHp) * this.pips.length);

    this.pips.forEach((pip, index) => {
      pip.setFillStyle(index < visibleHp ? 0xe74c3c : 0x3a2426);
      pip.setVisible(this.hp > 0);
    });
  }

  private updatePipsPosition(): void {
    if (this.pips.length === 0) {
      return;
    }

    const totalWidth = (this.pips.length - 1) * ENEMY_TUNING.hpPipSpacing;
    const top = this.y - this.displayHeight / 2 - ENEMY_TUNING.hpPipOffsetY;

    this.pips.forEach((pip, index) => {
      pip.x = this.x - totalWidth / 2 + index * ENEMY_TUNING.hpPipSpacing;
      pip.y = top;
    });
  }

  private updateTelegraphPosition(): void {
    if (this.telegraph.visible) {
      this.telegraph.setPosition(this.x, this.y - this.displayHeight / 2 - 12);
    }
  }

  private destroyPips(): void {
    for (const pip of this.pips) {
      pip.destroy();
    }

    this.pips.length = 0;
  }

  private die(event: DamageEvent): void {
    if (this.isDead) {
      return;
    }

    this.isDead = true;
    this.setPhase('dead');
    this.arcadeBody.enable = false;
    this.clearTint();
    this.telegraph.setVisible(false);
    this.destroyPips();
    this.emit('enemy-killed', { enemy: this, event });

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 8,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: ENEMY_TUNING.deathDurationMs,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}

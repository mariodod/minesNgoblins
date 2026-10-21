import Phaser from 'phaser';
import { PLAYER_TUNING, ROCK_TUNING } from '../config/tuning';
import { HEALING_SALVE, ORE, type PickupId, type SecondaryItemId } from '../data/items';
import type { InputService } from '../services/input-service';
import type { LevelPoint } from '../data/level-definition';
import { ItemInventory } from '../systems/inventory';
import type { DamageSource } from '../systems/damage';
import {
  computeProjectileLaunch,
  type AimDirection,
  type ProjectileLaunch,
} from './projectiles/aim';

export interface PlayerItemUse {
  itemId: SecondaryItemId;
  source: DamageSource;
  launch: ProjectileLaunch;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp: number;
  hp: number;
  ore = 0;
  isDead = false;
  readonly inventory = new ItemInventory();

  private readonly inputService: InputService;
  private facing = 1;
  private coyoteUntil = 0;
  private jumpBufferUntil = 0;
  private jumpCutApplied = false;
  private dropThroughUntil = 0;
  private wasOnGround = true;
  private lastFallSpeed = 0;
  private invulnerableUntil = 0;
  private nextThrowAt = 0;
  private nextItemUseAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    inputService: InputService,
    maxHp: number = PLAYER_TUNING.maxHp,
  ) {
    super(scene, x, y, 'miner');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.inputService = inputService;
    this.maxHp = Math.max(1, Math.floor(maxHp));
    this.hp = this.maxHp;
    this.setDepth(20);
    this.setMaxVelocity(300, PLAYER_TUNING.maxFallSpeed);

    const body = this.arcadeBody;
    body.setSize(10, 20);
    body.setOffset(3, 4);
    this.setCollideWorldBounds(true);
  }

  override update(time: number, delta: number): void {
    if (!this.active || this.isDead) {
      return;
    }

    const body = this.arcadeBody;
    const deltaSeconds = delta / 1000;
    const onGround = this.isGrounded();

    if (onGround) {
      this.coyoteUntil = time + PLAYER_TUNING.coyoteMs;
      this.jumpCutApplied = false;
    }

    if (this.inputService.isJumpJustPressed()) {
      this.jumpBufferUntil = time + PLAYER_TUNING.jumpBufferMs;
    }

    const wantsDropThrough =
      onGround && this.inputService.isAimDownDown() && this.jumpBufferUntil > time;

    if (wantsDropThrough) {
      this.dropThroughUntil = time + PLAYER_TUNING.dropThroughMs;
      this.jumpBufferUntil = 0;
      body.setVelocityY(60);
    } else if (this.jumpBufferUntil > time && (onGround || time < this.coyoteUntil)) {
      body.setVelocityY(-PLAYER_TUNING.jumpVelocity);
      this.jumpBufferUntil = 0;
      this.coyoteUntil = 0;
      this.jumpCutApplied = false;
      this.emit('player-jumped');
    }

    const jumpHeld = this.inputService.isJumpDown();
    if (!jumpHeld && !this.jumpCutApplied && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PLAYER_TUNING.jumpCutMultiplier);
      this.jumpCutApplied = true;
    }

    const direction = this.readMoveDirection();
    if (direction !== 0) {
      const targetSpeed = direction * PLAYER_TUNING.runSpeed;
      const acceleration = onGround
        ? PLAYER_TUNING.groundAcceleration
        : PLAYER_TUNING.airAcceleration;

      body.setVelocityX(approach(body.velocity.x, targetSpeed, acceleration * deltaSeconds));
      this.facing = direction;
      this.setFlipX(direction < 0);
    } else {
      const friction = onGround ? PLAYER_TUNING.groundFriction : PLAYER_TUNING.airDrag;
      body.setVelocityX(approach(body.velocity.x, 0, friction * deltaSeconds));
    }

    if (!this.wasOnGround && onGround && this.lastFallSpeed > 120) {
      this.emit('player-landed', this.lastFallSpeed);
    }

    this.handleThrow(time);
    this.handleUseItem(time);
    this.updateInvulnerabilityVisual(time);

    this.wasOnGround = onGround;
    this.lastFallSpeed = body.velocity.y;
  }

  get facingDirection(): number {
    return this.facing;
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  collectPickup(id: PickupId): boolean {
    if (id === ORE.id) {
      this.ore += ORE.value;
      this.emit('player-ore-changed', this.ore);
      return true;
    }

    if (id === HEALING_SALVE.id) {
      return this.heal(HEALING_SALVE.healAmount) > 0;
    }

    const previousItemId = this.inventory.snapshot.itemId;
    const result = this.inventory.collect(id);

    if (!result.accepted) {
      return false;
    }

    if (previousItemId !== result.snapshot.itemId) {
      this.nextItemUseAt = 0;
    }

    this.emit('player-inventory-changed', result.snapshot);
    return true;
  }

  heal(amount: number): number {
    if (this.isDead || amount <= 0) {
      return 0;
    }

    const healed = Math.min(amount, this.maxHp - this.hp);

    if (healed <= 0) {
      return 0;
    }

    this.hp += healed;
    this.emit('player-healed', this.hp);
    return healed;
  }

  takeDamage(amount: number, sourceX: number): boolean {
    const time = this.scene.time.now;

    if (this.isDead || time < this.invulnerableUntil) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = time + PLAYER_TUNING.invulnerableMs;

    this.setTint(0xff6b6b).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(90, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    const knockbackDirection = this.x < sourceX ? -1 : 1;
    this.arcadeBody.setVelocity(
      knockbackDirection * PLAYER_TUNING.knockbackX,
      -PLAYER_TUNING.knockbackY,
    );

    this.emit('player-damaged', this.hp);

    if (this.hp <= 0) {
      this.die();
    }

    return true;
  }

  die(): void {
    if (this.isDead) {
      return;
    }

    this.isDead = true;
    this.setAlpha(1);
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.emit('player-died');
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  isGrounded(): boolean {
    const body = this.arcadeBody;
    return body.blocked.down || body.touching.down;
  }

  isDroppingThrough(): boolean {
    return this.scene.time.now < this.dropThroughUntil;
  }

  respawn(point: LevelPoint): void {
    this.setPosition(point.x, point.y);
    this.arcadeBody.reset(point.x, point.y);
    this.jumpBufferUntil = 0;
    this.coyoteUntil = 0;
    this.dropThroughUntil = 0;
  }

  private readMoveDirection(): number {
    const left = this.inputService.isLeftDown();
    const right = this.inputService.isRightDown();

    if (left === right) {
      return 0;
    }

    return right ? 1 : -1;
  }

  private handleThrow(time: number): void {
    if (!this.inputService.isThrowJustPressed() || time < this.nextThrowAt) {
      return;
    }

    this.nextThrowAt = time + ROCK_TUNING.cooldownMs;
    this.emit('player-throw', this.readLaunch(ROCK_TUNING.speed));
  }

  private handleUseItem(time: number): void {
    if (!this.inputService.isUseItemJustPressed()) {
      return;
    }

    const definition = this.inventory.definition;

    if (!definition) {
      this.emit('player-item-empty');
      return;
    }

    if (time < this.nextItemUseAt) {
      return;
    }

    if (!this.inventory.consume()) {
      this.emit('player-item-empty');
      return;
    }

    this.nextItemUseAt = time + definition.cooldownMs;
    this.emit('player-inventory-changed', this.inventory.snapshot);
    const use: PlayerItemUse = {
      itemId: definition.id,
      source: definition.damageSource,
      launch: this.readLaunch(definition.speed),
    };
    this.emit('player-item-use', use);
  }

  private readLaunch(speed: number): ProjectileLaunch {
    const aim: AimDirection = this.inputService.isAimUpDown()
      ? 'up'
      : this.inputService.isAimDownDown()
        ? 'down'
        : 'level';

    return computeProjectileLaunch({
      originX: this.x,
      originY: this.y,
      facing: this.facing,
      aim,
      speed,
    });
  }

  private updateInvulnerabilityVisual(time: number): void {
    if (time < this.invulnerableUntil) {
      this.setAlpha(Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
      return;
    }

    this.setAlpha(1);
  }
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) {
    return Math.min(value + maxDelta, target);
  }

  if (value > target) {
    return Math.max(value - maxDelta, target);
  }

  return target;
}

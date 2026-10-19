import Phaser from 'phaser';
import { PLAYER_TUNING } from '../config/tuning';
import type { InputService } from '../services/input-service';
import type { LevelPoint } from '../data/level-definition';

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp = PLAYER_TUNING.maxHp;

  private readonly inputService: InputService;
  private facing = 1;
  private coyoteUntil = 0;
  private jumpBufferUntil = 0;
  private jumpCutApplied = false;
  private dropThroughUntil = 0;
  private wasOnGround = true;
  private lastFallSpeed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, inputService: InputService) {
    super(scene, x, y, 'miner');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.inputService = inputService;
    this.setDepth(20);
    this.setMaxVelocity(300, PLAYER_TUNING.maxFallSpeed);

    const body = this.arcadeBody;
    body.setSize(10, 20);
    body.setOffset(3, 4);
    this.setCollideWorldBounds(true);
  }

  override update(time: number, delta: number): void {
    if (!this.active) {
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

    this.wasOnGround = onGround;
    this.lastFallSpeed = body.velocity.y;
  }

  get facingDirection(): number {
    return this.facing;
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

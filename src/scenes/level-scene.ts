import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import {
  parseLevelDefinition,
  type LevelDefinition,
  type LevelRect,
} from '../data/level-definition';
import { levelCacheKey } from '../data/level-registry';
import { Player } from '../entities/player';
import { InputService } from '../services/input-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

interface LevelSceneData {
  levelId?: string;
}

type ColliderTarget =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

export class LevelScene extends Phaser.Scene {
  private levelId = 'movement-test';
  private level!: LevelDefinition;
  private player!: Player;
  private inputService!: InputService;
  private solidGroup!: Phaser.GameObjects.Group;
  private oneWayGroup!: Phaser.GameObjects.Group;
  private testHookAccumulator = 0;

  constructor() {
    super('Level');
  }

  init(data: LevelSceneData): void {
    this.levelId = data.levelId ?? 'movement-test';
  }

  create(): void {
    const raw = this.cache.json.get(levelCacheKey(this.levelId)) as unknown;

    try {
      this.level = parseLevelDefinition(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown level error.';
      console.error(`Failed to load level "${this.levelId}": ${message}`);
      this.showLevelError(message);
      return;
    }

    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight + 160);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.setBackgroundColor('#0b0c10');

    this.inputService = new InputService(this);
    this.createBackground();
    this.createPlatforms();
    this.createProps();

    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y, this.inputService);

    this.physics.add.collider(this.player, this.solidGroup);
    this.physics.add.collider(
      this.player,
      this.oneWayGroup,
      undefined,
      this.shouldCollideOneWay,
      this,
    );

    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
    this.cameras.main.setDeadzone(80, 48);
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.createLabels();
    this.publishTestHook();
    setTestHook({
      ready: true,
      scene: 'Level',
      levelId: this.level.id,
    });

    this.events.once('shutdown', () => {
      this.inputService.destroy();
    });
  }

  override update(time: number, delta: number): void {
    if (!this.player || !this.level) {
      return;
    }

    this.player.update(time, delta);

    if (this.player.y > this.level.killY) {
      this.cameras.main.flash(120, 120, 40, 40);
      this.player.respawn(this.level.spawn);
    }

    this.testHookAccumulator += delta;
    if (this.testHookAccumulator >= 100) {
      this.testHookAccumulator = 0;
      this.publishTestHook();
    }
  }

  private createBackground(): void {
    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-cave')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-20);

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050608, 0.35)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-19);

    for (let x = 0; x < this.level.worldWidth; x += 160) {
      this.add.rectangle(x, 0, 8, this.level.worldHeight, 0x1a1210, 0.9).setOrigin(0).setDepth(-10);
      this.add
        .rectangle(x + 2, 0, 2, this.level.worldHeight, 0x2f2318, 0.7)
        .setOrigin(0)
        .setDepth(-9);
    }

    this.add
      .rectangle(this.level.worldWidth / 2, 56, this.level.worldWidth, 8, 0x241a13, 0.95)
      .setDepth(-8);
  }

  private createPlatforms(): void {
    this.solidGroup = this.add.group();
    this.oneWayGroup = this.add.group();

    for (const rect of this.level.solids) {
      this.add
        .tileSprite(rect.x, rect.y, rect.width, rect.height, 'tile-stone')
        .setOrigin(0)
        .setDepth(0);
      this.addSolidBody(rect, this.solidGroup);
    }

    for (const rect of this.level.oneWayPlatforms) {
      this.add
        .tileSprite(rect.x, rect.y, rect.width, rect.height, 'tile-wood')
        .setOrigin(0)
        .setDepth(1);
      this.add.rectangle(rect.x, rect.y, rect.width, 2, 0x9aa0a6, 0.35).setOrigin(0).setDepth(2);
      this.addSolidBody(rect, this.oneWayGroup);
    }
  }

  private addSolidBody(rect: LevelRect, group: Phaser.GameObjects.Group): void {
    const zone = this.add.zone(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
    );
    this.physics.add.existing(zone, true);
    group.add(zone);
  }

  private createProps(): void {
    this.level.props.forEach((prop, index) => {
      if (prop.type === 'crate') {
        this.add.image(prop.x, prop.y, 'crate').setDepth(5);
        return;
      }

      const glow = this.add
        .image(prop.x, prop.y, 'lantern-glow')
        .setDepth(4)
        .setScale(1.4)
        .setAlpha(0.5);

      this.tweens.add({
        targets: glow,
        alpha: 0.75,
        duration: 900 + (index % 3) * 140,
        yoyo: true,
        repeat: -1,
      });

      this.add.rectangle(prop.x, prop.y + 1, 3, 5, 0xffe6a0, 0.9).setDepth(5);
    });
  }

  private createLabels(): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, 18, 0x050608, 0.78)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(90);

    this.add
      .text(6, 5, this.level.name.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#f4d35e',
      })
      .setScrollFactor(0)
      .setDepth(91);

    this.add
      .text(GAME_WIDTH - 6, 5, 'M1 MOVEMENT TEST', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(91);
  }

  private shouldCollideOneWay(object1: ColliderTarget, object2: ColliderTarget): boolean {
    const playerObject = object1 as Phaser.Types.Physics.Arcade.GameObjectWithBody;
    const platformObject = object2 as Phaser.Types.Physics.Arcade.GameObjectWithBody;
    const playerBody = playerObject.body as Phaser.Physics.Arcade.Body;
    const platformBody = platformObject.body as Phaser.Physics.Arcade.StaticBody;

    if (this.player.isDroppingThrough()) {
      return false;
    }

    if (playerBody.velocity.y < 0) {
      return false;
    }

    return playerBody.bottom <= platformBody.top + 6;
  }

  private publishTestHook(): void {
    if (!this.player || !this.level) {
      return;
    }

    const body = this.player.arcadeBody;
    setTestHook({
      scene: 'Level',
      levelId: this.level.id,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      playerVx: Math.round(body.velocity.x),
      playerVy: Math.round(body.velocity.y),
      grounded: this.player.isGrounded(),
      hp: this.player.hp,
    });
  }

  private showLevelError(message: string): void {
    this.cameras.main.setBackgroundColor('#0b0c10');
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `LEVEL ERROR\n${message}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        color: '#f4d35e',
        align: 'center',
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5);
  }
}

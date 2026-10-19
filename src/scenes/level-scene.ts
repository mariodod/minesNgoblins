import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ROCK_TUNING } from '../config/tuning';
import {
  parseLevelDefinition,
  type LevelDefinition,
  type LevelRect,
} from '../data/level-definition';
import { levelCacheKey } from '../data/level-registry';
import { Player } from '../entities/player';
import { PracticeDummy } from '../entities/practice-dummy';
import { Rock } from '../entities/rock';
import type { RockLaunch } from '../entities/rock-aim';
import type { AudioService } from '../services/audio-service';
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
  private audio!: AudioService;
  private solidGroup!: Phaser.GameObjects.Group;
  private oneWayGroup!: Phaser.GameObjects.Group;
  private enemyGroup!: Phaser.GameObjects.Group;
  private rockGroup!: Phaser.GameObjects.Group;
  private firstDummy: PracticeDummy | undefined;
  private rocksThrown = 0;
  private restarting = false;
  private testHookAccumulator = 0;
  private frameCount = 0;
  private debugEnabled = false;
  private debugText: Phaser.GameObjects.Text | undefined;

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

    this.rocksThrown = 0;
    this.restarting = false;
    this.firstDummy = undefined;
    this.frameCount = 0;

    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight + 160);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.setBackgroundColor('#0b0c10');

    this.inputService = new InputService(this);
    this.audio = this.registry.get('audioService') as AudioService;
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

    this.createEnemies();
    this.createCombatColliders();

    this.player.on('player-throw', this.handlePlayerThrow, this);
    this.player.on('player-jumped', this.handlePlayerJumped, this);
    this.player.on('player-landed', this.handlePlayerLanded, this);
    this.player.on('player-damaged', this.handlePlayerDamaged, this);
    this.player.on('player-died', this.handlePlayerDied, this);

    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
    this.cameras.main.setDeadzone(80, 48);
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.setupDebugOverlay();

    this.scene.launch('HUD', {
      levelName: this.level.name,
      player: this.player,
    });

    this.publishTestHook();

    this.events.once('shutdown', () => {
      this.player.off('player-throw', this.handlePlayerThrow, this);
      this.player.off('player-jumped', this.handlePlayerJumped, this);
      this.player.off('player-landed', this.handlePlayerLanded, this);
      this.player.off('player-damaged', this.handlePlayerDamaged, this);
      this.player.off('player-died', this.handlePlayerDied, this);
      this.inputService.destroy();
      this.scene.stop('HUD');
    });
  }

  override update(time: number, delta: number): void {
    if (!this.player || !this.level) {
      return;
    }

    this.frameCount += 1;
    this.player.update(time, delta);

    if (!this.player.isDead && this.player.y > this.level.killY) {
      this.player.die();
    }

    this.testHookAccumulator += delta;
    if (this.testHookAccumulator >= 100) {
      this.testHookAccumulator = 0;
      this.publishTestHook();
    }

    this.updateDebugOverlay();
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

  private createEnemies(): void {
    this.enemyGroup = this.add.group();
    this.rockGroup = this.add.group();

    for (const spawn of this.level.enemies) {
      if (spawn.type === 'practice-dummy') {
        const dummy = new PracticeDummy(this, spawn.x, spawn.y);
        this.enemyGroup.add(dummy);

        if (!this.firstDummy) {
          this.firstDummy = dummy;
        }
      }
    }
  }

  private createCombatColliders(): void {
    this.physics.add.collider(
      this.rockGroup,
      this.solidGroup,
      this.handleRockBounce,
      undefined,
      this,
    );
    this.physics.add.collider(
      this.rockGroup,
      this.oneWayGroup,
      this.handleRockBounce,
      this.shouldCollideOneWay,
      this,
    );
    this.physics.add.overlap(
      this.rockGroup,
      this.enemyGroup,
      this.handleRockHitEnemy,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemyGroup,
      this.handlePlayerEnemyContact,
      undefined,
      this,
    );
  }

  private handlePlayerThrow(launch: RockLaunch): void {
    if (this.restarting) {
      return;
    }

    const rock = new Rock(this, launch);
    this.rockGroup.add(rock);
    this.rocksThrown += 1;
    this.audio.play('throw');
    this.spawnHitBurst(launch.x, launch.y, 0xc9a227, 3);
  }

  private handlePlayerJumped(): void {
    this.audio.play('jump');
  }

  private handlePlayerLanded(): void {
    this.audio.play('land');
  }

  private handleRockBounce(rockObject: ColliderTarget): void {
    const rock = rockObject as Rock;

    if (!rock.active) {
      return;
    }

    this.audio.play('bounce');

    if (!rock.registerBounce()) {
      rock.destroy();
    }
  }

  private handleRockHitEnemy(rockObject: ColliderTarget, enemyObject: ColliderTarget): void {
    const rock = rockObject as Rock;
    const enemy = enemyObject as PracticeDummy;

    if (!rock.active || !enemy.isAlive) {
      return;
    }

    enemy.takeDamage(ROCK_TUNING.damage, rock.x);
    this.audio.play(enemy.isAlive ? 'hit' : 'enemy-down');
    this.spawnHitBurst(rock.x, rock.y, 0xf2f2f2, 5);
    rock.destroy();
  }

  private handlePlayerEnemyContact(
    _playerObject: ColliderTarget,
    enemyObject: ColliderTarget,
  ): void {
    const enemy = enemyObject as PracticeDummy;

    if (!enemy.isAlive || this.player.isDead) {
      return;
    }

    this.player.takeDamage(1, enemy.x);
  }

  private handlePlayerDamaged(): void {
    this.audio.play('hurt');
    this.cameras.main.shake(120, 0.006);
  }

  private handlePlayerDied(): void {
    if (this.restarting) {
      return;
    }

    this.restarting = true;
    this.audio.play('death');
    this.cameras.main.shake(220, 0.01);
    this.time.delayedCall(1300, () => {
      this.restartLevel();
    });
  }

  private restartLevel(): void {
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ levelId: this.level.id });
    });
  }

  private spawnHitBurst(x: number, y: number, color: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const particle = this.add.rectangle(x, y, 2, 2, color).setDepth(16);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 12,
        y: y + Math.sin(angle) * 12,
        alpha: 0,
        duration: 220,
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  private setupDebugOverlay(): void {
    this.debugEnabled = false;
    this.physics.world.drawDebug = false;

    if (this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.setVisible(false);
    }

    if (!import.meta.env.DEV) {
      return;
    }

    this.debugText = this.add
      .text(6, 24, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#7fffd4',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        padding: { x: 2, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(150)
      .setVisible(false);

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.F3]);
    keyboard.on('keydown-F3', this.toggleDebug, this);

    this.events.once('shutdown', () => {
      keyboard.off('keydown-F3', this.toggleDebug, this);
    });
  }

  private toggleDebug(): void {
    this.debugEnabled = !this.debugEnabled;
    this.physics.world.drawDebug = this.debugEnabled;

    if (this.debugEnabled) {
      if (!this.physics.world.debugGraphic) {
        this.physics.world.createDebugGraphic();
      }
      this.physics.world.debugGraphic.setVisible(true);
    } else if (this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.setVisible(false);
    }

    this.debugText?.setVisible(this.debugEnabled);
  }

  private updateDebugOverlay(): void {
    if (!this.debugEnabled || !this.debugText) {
      return;
    }

    const body = this.player.arcadeBody;

    this.debugText.setText([
      `FPS ${Math.round(this.game.loop.actualFps)}  HP ${this.player.hp}  DEAD ${this.player.isDead}`,
      `POS ${Math.round(this.player.x)},${Math.round(this.player.y)}  VEL ${Math.round(body.velocity.x)},${Math.round(body.velocity.y)}`,
      `GROUND ${this.player.isGrounded()}  ROCKS ${this.rocksThrown}  ENEMIES ${this.countAliveEnemies()}`,
    ]);
  }

  private shouldCollideOneWay(object1: ColliderTarget, object2: ColliderTarget): boolean {
    const mover = object1 as Phaser.Types.Physics.Arcade.GameObjectWithBody;
    const platform = object2 as Phaser.Types.Physics.Arcade.GameObjectWithBody;
    const moverBody = mover.body as Phaser.Physics.Arcade.Body;
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;

    if (mover === this.player && this.player.isDroppingThrough()) {
      return false;
    }

    if (moverBody.velocity.y < 0) {
      return false;
    }

    return moverBody.bottom <= platformBody.top + 6;
  }

  private publishTestHook(): void {
    if (!this.player || !this.level) {
      return;
    }

    const body = this.player.arcadeBody;
    setTestHook({
      ready: true,
      scene: 'Level',
      levelId: this.level.id,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      playerVx: Math.round(body.velocity.x),
      playerVy: Math.round(body.velocity.y),
      grounded: this.player.isGrounded(),
      hp: this.player.hp,
      rocksThrown: this.rocksThrown,
      enemyCount: this.countAliveEnemies(),
      dummyHp: this.firstDummy && this.firstDummy.active ? this.firstDummy.hp : 0,
      dead: this.player.isDead,
      fps: Math.round(this.game.loop.actualFps),
      frameCount: this.frameCount,
      debug: this.debugEnabled,
    });
  }

  private countAliveEnemies(): number {
    let count = 0;

    for (const child of this.enemyGroup.getChildren()) {
      if ((child as PracticeDummy).isAlive) {
        count += 1;
      }
    }

    return count;
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

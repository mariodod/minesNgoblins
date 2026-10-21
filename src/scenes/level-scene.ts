import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { FEEDBACK_TUNING, HAZARD_TUNING, ROCK_TUNING } from '../config/tuning';
import { getDifficulty, scaleEnemyDamage, type DifficultyConfig } from '../data/difficulties';
import { computeEnemyHp, ENEMIES, type EnemyDefinition } from '../data/enemies';
import {
  HEALING_SALVE,
  ORE,
  pickupDisplayName,
  pickupTextureKey,
  type PickupId,
} from '../data/items';
import {
  parseLevelDefinition,
  type HazardSpawn,
  type LevelDefinition,
  type LevelRect,
} from '../data/level-definition';
import { levelCacheKey } from '../data/level-registry';
import { Bat } from '../entities/enemies/bat';
import { Beetle } from '../entities/enemies/beetle';
import type { Enemy, EnemyHitResult } from '../entities/enemies/enemy';
import { Goblin } from '../entities/enemies/goblin';
import { PracticeDummy } from '../entities/enemies/practice-dummy';
import { Skeleton } from '../entities/enemies/skeleton';
import { FallingRock } from '../entities/hazards/falling-rock';
import { Crate } from '../entities/pickups/crate';
import { ItemPickup } from '../entities/pickups/item-pickup';
import { Player, type PlayerItemUse } from '../entities/player';
import type { ProjectileLaunch } from '../entities/projectiles/aim';
import { Bone, type BoneLaunch } from '../entities/projectiles/bone';
import { ItemProjectile } from '../entities/projectiles/item-projectile';
import { Rock } from '../entities/projectiles/rock';
import type { AudioService } from '../services/audio-service';
import { InputService } from '../services/input-service';
import type { DamageEvent } from '../systems/damage';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

interface LevelSceneData {
  levelId?: string;
}

interface PedestalState {
  x: number;
  y: number;
  itemId: PickupId;
  icon: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Ellipse;
  base: Phaser.GameObjects.Rectangle;
  top: Phaser.GameObjects.Rectangle;
  claimed: boolean;
}

type ColliderTarget =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

export class LevelScene extends Phaser.Scene {
  private levelId = 'movement-test';
  private level!: LevelDefinition;
  private difficulty: DifficultyConfig = getDifficulty('normal');
  private player!: Player;
  private inputService!: InputService;
  private audio!: AudioService;
  private solidGroup!: Phaser.GameObjects.Group;
  private oneWayGroup!: Phaser.GameObjects.Group;
  private enemyGroup!: Phaser.GameObjects.Group;
  private rockGroup!: Phaser.GameObjects.Group;
  private enemyProjectileGroup!: Phaser.GameObjects.Group;
  private itemProjectileGroup!: Phaser.GameObjects.Group;
  private spikeGroup!: Phaser.GameObjects.Group;
  private fallingRockGroup!: Phaser.GameObjects.Group;
  private hazardTriggerGroup!: Phaser.GameObjects.Group;
  private crateGroup!: Phaser.GameObjects.Group;
  private pickupGroup!: Phaser.GameObjects.Group;
  private enemies: Enemy[] = [];
  private pedestals: PedestalState[] = [];
  private firstDummy: Enemy | undefined;
  private interactPrompt: Phaser.GameObjects.Text | undefined;
  private rocksThrown = 0;
  private itemsUsed = 0;
  private itemsCollected = 0;
  private cratesBroken = 0;
  private bonesThrown = 0;
  private boneHits = 0;
  private boneBreaks = 0;
  private deflects = 0;
  private hazardsTriggered = 0;
  private restarting = false;
  private hitStopActive = false;
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
    this.itemsUsed = 0;
    this.itemsCollected = 0;
    this.cratesBroken = 0;
    this.bonesThrown = 0;
    this.boneHits = 0;
    this.boneBreaks = 0;
    this.deflects = 0;
    this.hazardsTriggered = 0;
    this.restarting = false;
    this.hitStopActive = false;
    this.firstDummy = undefined;
    this.enemies = [];
    this.pedestals = [];
    this.interactPrompt = undefined;
    this.frameCount = 0;
    this.difficulty = getDifficulty('normal');

    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight + 160);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.setBackgroundColor('#0b0c10');

    this.inputService = new InputService(this);
    this.audio = this.registry.get('audioService') as AudioService;
    this.createBackground();
    this.createPlatforms();
    this.createProps();
    this.createHazards();

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
    this.player.on('player-item-use', this.handlePlayerItemUse, this);
    this.player.on('player-item-empty', this.handlePlayerItemEmpty, this);
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
      this.player.off('player-item-use', this.handlePlayerItemUse, this);
      this.player.off('player-item-empty', this.handlePlayerItemEmpty, this);
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

    if (!this.hitStopActive) {
      this.player.update(time, delta);

      if (!this.player.isDead && this.player.y > this.level.killY) {
        this.player.die();
      }

      this.updateEnemies(time, delta);
      this.cleanupFallenEnemies();
    }

    this.updatePedestalInteraction();

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
    this.crateGroup = this.add.group();
    this.pickupGroup = this.add.group();
    this.interactPrompt = this.add
      .text(0, 0, 'E', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#ffcf5a',
        backgroundColor: '#11161b',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setVisible(false);

    this.level.props.forEach((prop, index) => {
      if (prop.type === 'crate') {
        const crate = new Crate(this, prop.x, prop.y, prop.contents);
        this.crateGroup.add(crate);
        return;
      }

      if (prop.type === 'pedestal') {
        this.createPedestal(prop.x, prop.y, prop.item);
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

  private createPedestal(x: number, y: number, itemId: PickupId): void {
    const base = this.add.rectangle(x, y + 3, 14, 6, 0x4a3320, 1).setDepth(4);
    const top = this.add.rectangle(x, y, 14, 2, 0x8a5f3a, 1).setDepth(5);

    const glow = this.add.ellipse(x, y - 8, 20, 10, 0xffcf5a, 0.12).setDepth(5);
    this.tweens.add({
      targets: glow,
      alpha: 0.28,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const icon = this.add.image(x, y - 8, pickupTextureKey(itemId)).setDepth(9);
    this.tweens.add({
      targets: icon,
      y: y - 12,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.pedestals.push({
      x,
      y,
      itemId,
      icon,
      glow,
      base,
      top,
      claimed: false,
    });
  }

  private createHazards(): void {
    this.spikeGroup = this.add.group();
    this.fallingRockGroup = this.add.group();
    this.hazardTriggerGroup = this.add.group();

    for (const hazard of this.level.hazards) {
      if (hazard.type === 'spikes') {
        this.createSpikes(hazard);
      } else {
        this.createFallingRockTrigger(hazard);
      }
    }
  }

  private createSpikes(hazard: HazardSpawn): void {
    this.add
      .tileSprite(hazard.x, hazard.y, hazard.width, hazard.height, 'spike')
      .setOrigin(0)
      .setDepth(4);

    const zone = this.add.zone(
      hazard.x + hazard.width / 2,
      hazard.y + hazard.height / 2,
      hazard.width,
      hazard.height,
    );
    this.physics.add.existing(zone, true);
    this.spikeGroup.add(zone);
  }

  private createFallingRockTrigger(hazard: HazardSpawn): void {
    const centerX = hazard.x + hazard.width / 2;
    const groundY = this.findGroundY(centerX, hazard.y + hazard.height);

    // The hazard rect marks the ceiling source; the pressure trigger sits on the
    // floor directly beneath it so walking under the loose rock arms the trap.
    const zone = this.add.zone(centerX, groundY - 12, hazard.width, 24);
    this.physics.add.existing(zone, true);
    zone.setData('hazard', hazard);
    zone.setData('triggered', false);
    this.hazardTriggerGroup.add(zone);
  }

  private createEnemies(): void {
    this.enemyGroup = this.add.group();
    this.rockGroup = this.add.group();
    this.enemyProjectileGroup = this.add.group();
    this.itemProjectileGroup = this.add.group();

    for (const spawn of this.level.enemies) {
      const definition = ENEMIES[spawn.type];
      const hp = computeEnemyHp(
        definition.baseHp,
        this.level.enemyHpBonus,
        this.difficulty.enemyHpMultiplier,
      );
      const enemy = this.createEnemy(definition, spawn.x, spawn.y, hp);

      this.enemyGroup.add(enemy);
      this.enemies.push(enemy);

      if (enemy instanceof Skeleton) {
        enemy.on('enemy-projectile', this.handleEnemyProjectile, this);
      }

      if (!this.firstDummy && enemy instanceof PracticeDummy) {
        this.firstDummy = enemy;
      }
    }
  }

  private createEnemy(definition: EnemyDefinition, x: number, y: number, hp: number): Enemy {
    switch (definition.behavior) {
      case 'bat':
        return new Bat(this, x, y, hp);
      case 'goblin':
        return new Goblin(this, x, y, hp);
      case 'skeleton':
        return new Skeleton(this, x, y, hp);
      case 'beetle':
        return new Beetle(this, x, y, hp);
      case 'dummy':
        return new PracticeDummy(this, x, y, hp);
    }
  }

  private createCombatColliders(): void {
    // Actor overlaps are registered before terrain collisions so a hit that
    // lands on the same frame as a floor impact still connects.
    this.physics.add.overlap(
      this.player,
      this.enemyGroup,
      this.handlePlayerEnemyContact,
      undefined,
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
      this.enemyProjectileGroup,
      this.handleBoneHitPlayer,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.spikeGroup,
      this.handleSpikeOverlap,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.hazardTriggerGroup,
      this.handleFallingRockTrigger,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.fallingRockGroup,
      this.handleFallingRockHitPlayer,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.itemProjectileGroup,
      this.enemyGroup,
      this.handleItemProjectileHitEnemy,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.itemProjectileGroup,
      this.crateGroup,
      this.handleItemProjectileHitCrate,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.rockGroup,
      this.crateGroup,
      this.handleRockHitCrate,
      undefined,
      this,
    );
    this.physics.add.overlap(this.player, this.pickupGroup, this.handleItemPickup, undefined, this);

    this.physics.add.collider(this.player, this.crateGroup);
    this.physics.add.collider(this.enemyGroup, this.crateGroup);
    this.physics.add.collider(this.enemyGroup, this.solidGroup);
    this.physics.add.collider(
      this.enemyGroup,
      this.oneWayGroup,
      undefined,
      this.shouldCollideOneWay,
      this,
    );
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
    this.physics.add.collider(
      this.enemyProjectileGroup,
      this.solidGroup,
      this.handleBoneBreak,
      undefined,
      this,
    );
    this.physics.add.collider(
      this.enemyProjectileGroup,
      this.oneWayGroup,
      this.handleBoneBreak,
      this.shouldCollideOneWay,
      this,
    );
    this.physics.add.collider(
      this.itemProjectileGroup,
      this.solidGroup,
      this.handleItemProjectileImpact,
      undefined,
      this,
    );
    this.physics.add.collider(
      this.itemProjectileGroup,
      this.oneWayGroup,
      this.handleItemProjectileImpact,
      this.shouldCollideOneWay,
      this,
    );
    this.physics.add.collider(
      this.fallingRockGroup,
      this.solidGroup,
      this.handleFallingRockImpact,
      undefined,
      this,
    );
    this.physics.add.collider(
      this.fallingRockGroup,
      this.oneWayGroup,
      this.handleFallingRockImpact,
      undefined,
      this,
    );
  }

  private updateEnemies(time: number, delta: number): void {
    const context = {
      playerX: this.player.x,
      playerY: this.player.y,
      playerAlive: !this.player.isDead,
    };

    for (const enemy of this.enemies) {
      if (enemy.active && !enemy.isDead) {
        enemy.update(time, delta, context);
      }
    }
  }

  private cleanupFallenEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.active && enemy.y > this.level.killY) {
        enemy.destroy();
      }
    }
  }

  private handlePlayerThrow(launch: ProjectileLaunch): void {
    if (this.restarting) {
      return;
    }

    const rock = new Rock(this, launch);
    this.rockGroup.add(rock);
    this.rocksThrown += 1;
    this.audio.play('throw');
    this.spawnHitBurst(launch.x, launch.y, 0xc9a227, 3);
  }

  private handlePlayerItemUse(use: PlayerItemUse): void {
    if (this.restarting) {
      return;
    }

    const projectile = new ItemProjectile(this, use.itemId, use.launch);
    this.itemProjectileGroup.add(projectile);
    this.itemsUsed += 1;

    if (use.itemId === 'knife') {
      this.audio.play('knife');
    } else if (use.itemId === 'flintlock') {
      this.audio.play('gunshot');
    } else {
      this.audio.play('magic');
    }

    this.spawnMuzzleFlash(use.itemId, use.launch);
  }

  private handlePlayerItemEmpty(): void {
    if (!this.restarting) {
      this.audio.play('empty');
    }
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
    const enemy = enemyObject as Enemy;

    if (!rock.active || !enemy.active || enemy.isDead) {
      return;
    }

    const event: DamageEvent = {
      amount: ROCK_TUNING.damage,
      source: 'rock',
      sourceX: rock.x,
      sourceY: rock.y,
      impactVx: rock.arcadeBody.velocity.x,
    };
    const result = enemy.takeDamage(event);
    this.playEnemyHitFeedback(result, rock.x, rock.y, 0xb8c0c8);
    rock.destroy();
  }

  private handleItemProjectileHitEnemy(
    projectileObject: ColliderTarget,
    enemyObject: ColliderTarget,
  ): void {
    const projectile = projectileObject as ItemProjectile;
    const enemy = enemyObject as Enemy;

    if (!projectile.active || !enemy.active || enemy.isDead) {
      return;
    }

    if (projectile.itemId === 'rune-scroll') {
      this.explodeRune(projectile);
      projectile.destroy();
      return;
    }

    const event: DamageEvent = {
      amount: projectile.definition.damage,
      source: projectile.definition.damageSource,
      sourceX: projectile.x,
      sourceY: projectile.y,
      impactVx: projectile.arcadeBody.velocity.x,
    };
    const result = enemy.takeDamage(event);
    this.playEnemyHitFeedback(result, projectile.x, projectile.y, 0xf2f2f2);
    projectile.destroy();
  }

  private playEnemyHitFeedback(result: EnemyHitResult, x: number, y: number, color: number): void {
    if (result.deflected) {
      this.deflects += 1;
      this.audio.play('deflect');
      this.spawnHitBurst(x, y, 0xb8c0c8, FEEDBACK_TUNING.hitParticles);
      return;
    }

    if (!result.applied) {
      return;
    }

    this.audio.play(result.killed ? 'enemy-down' : 'hit');
    this.spawnHitBurst(
      x,
      y,
      color,
      result.killed ? FEEDBACK_TUNING.killParticles : FEEDBACK_TUNING.hitParticles,
    );

    if (result.killed) {
      this.cameras.main.shake(FEEDBACK_TUNING.screenShakeMs, FEEDBACK_TUNING.screenShakeIntensity);
      this.triggerHitStop();
    }
  }

  private handleItemProjectileImpact(projectileObject: ColliderTarget): void {
    const projectile = projectileObject as ItemProjectile;

    if (!projectile.active) {
      return;
    }

    if (projectile.itemId === 'rune-scroll') {
      this.explodeRune(projectile);
    } else {
      this.spawnHitBurst(projectile.x, projectile.y, 0xd8dde3, 3);
    }

    projectile.destroy();
  }

  private handleItemProjectileHitCrate(
    projectileObject: ColliderTarget,
    crateObject: ColliderTarget,
  ): void {
    const projectile = projectileObject as ItemProjectile;
    const crate = crateObject as Crate;

    if (!projectile.active || !crate.active) {
      return;
    }

    if (projectile.itemId === 'rune-scroll') {
      this.explodeRune(projectile);
    }

    this.breakCrate(crate);
    projectile.destroy();
  }

  private handleRockHitCrate(rockObject: ColliderTarget, crateObject: ColliderTarget): void {
    const rock = rockObject as Rock;
    const crate = crateObject as Crate;

    if (!rock.active || !crate.active) {
      return;
    }

    this.breakCrate(crate);
    rock.destroy();
  }

  private breakCrate(crate: Crate): void {
    if (!crate.active) {
      return;
    }

    const { x, y, contents } = crate;
    crate.destroy();
    this.cratesBroken += 1;
    this.audio.play('crate-break');
    this.spawnHitBurst(x, y, 0x8a5f3a, 7);

    const pickup = new ItemPickup(this, x, y - 8, contents);
    this.pickupGroup.add(pickup);
  }

  private explodeRune(projectile: ItemProjectile): void {
    const definition = projectile.definition;
    const { x, y } = projectile;

    this.audio.play('rune-blast');
    this.cameras.main.shake(150, 0.008);
    this.spawnExplosion(x, y, definition.explosionRadius);

    let damagedAny = false;
    let killedAny = false;

    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDead) {
        continue;
      }

      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) > definition.explosionRadius) {
        continue;
      }

      const result = enemy.takeDamage({
        amount: definition.damage,
        source: definition.damageSource,
        sourceX: x,
        sourceY: y,
        impactVx: 0,
      });

      if (!result.applied) {
        continue;
      }

      damagedAny = true;
      killedAny = killedAny || result.killed;
      this.spawnHitBurst(enemy.x, enemy.y, 0x6fe3c4, 5);

      if (!result.killed) {
        enemy.stun(definition.stunMs);
      }
    }

    if (damagedAny) {
      this.audio.play(killedAny ? 'enemy-down' : 'hit');
    }

    if (killedAny) {
      this.triggerHitStop();
    }
  }

  private handleItemPickup(_playerObject: ColliderTarget, pickupObject: ColliderTarget): void {
    const pickup = pickupObject as ItemPickup;

    if (!pickup.active || this.player.isDead) {
      return;
    }

    if (this.player.collectPickup(pickup.itemId)) {
      this.itemsCollected += 1;
      this.audio.play(this.pickupSfx(pickup.itemId));
      this.showFloatingText(pickup.x, pickup.y - 8, pickupDisplayName(pickup.itemId), '#f4d35e');
      pickup.destroy();
      return;
    }

    if (this.time.now >= pickup.nextPromptAt) {
      pickup.nextPromptAt = this.time.now + 1000;
      this.showFloatingText(pickup.x, pickup.y - 8, 'FULL', '#e74c3c');
      this.audio.play('empty');
    }
  }

  private updatePedestalInteraction(): void {
    const nearby = this.findNearbyPedestal();

    if (this.interactPrompt) {
      if (nearby && !this.player.isDead && !this.restarting) {
        this.interactPrompt.setPosition(nearby.x, nearby.y - 22).setVisible(true);
      } else {
        this.interactPrompt.setVisible(false);
      }
    }

    const pressed = this.inputService.isInteractJustPressed();

    if (!pressed || !nearby || this.player.isDead || this.restarting) {
      return;
    }

    if (this.player.collectPickup(nearby.itemId)) {
      this.itemsCollected += 1;
      nearby.claimed = true;
      nearby.icon.destroy();
      nearby.glow.destroy();
      nearby.base.destroy();
      nearby.top.destroy();
      this.interactPrompt?.setVisible(false);
      this.audio.play(this.pickupSfx(nearby.itemId));
      this.showFloatingText(nearby.x, nearby.y - 18, pickupDisplayName(nearby.itemId), '#f4d35e');
      return;
    }

    this.audio.play('empty');
    this.showFloatingText(nearby.x, nearby.y - 18, 'FULL', '#e74c3c');
  }

  private findNearbyPedestal(): PedestalState | undefined {
    return this.pedestals.find(
      (pedestal) =>
        !pedestal.claimed &&
        Math.abs(this.player.x - pedestal.x) <= 24 &&
        Math.abs(this.player.y - pedestal.y) <= 28,
    );
  }

  private pickupSfx(itemId: PickupId): 'pickup' | 'heal' | 'ore' {
    if (itemId === HEALING_SALVE.id) {
      return 'heal';
    }

    return itemId === ORE.id ? 'ore' : 'pickup';
  }

  private showFloatingText(x: number, y: number, message: string, color: string): void {
    const label = this.add
      .text(x, y, message.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color,
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.tweens.add({
      targets: label,
      y: y - 10,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        label.destroy();
      },
    });
  }

  private spawnExplosion(x: number, y: number, radius: number): void {
    const ring = this.add.circle(x, y, 6, 0xffcf5a, 0.4).setDepth(16).setScale(0.4);
    this.tweens.add({
      targets: ring,
      scale: radius / 6,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        ring.destroy();
      },
    });

    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const distance = 8 + (index % 3) * 5;
      const particle = this.add
        .rectangle(x, y, 2, 2, index % 2 === 0 ? 0x6fe3c4 : 0xffcf5a)
        .setDepth(17);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 220,
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  private spawnMuzzleFlash(itemId: PlayerItemUse['itemId'], launch: ProjectileLaunch): void {
    const color = itemId === 'flintlock' ? 0xffcf5a : itemId === 'knife' ? 0xd8dde3 : 0x6fe3c4;
    const flash = this.add
      .rectangle(launch.x, launch.y, itemId === 'flintlock' ? 9 : 4, 3, color, 0.9)
      .setDepth(16);
    const direction = launch.velocityX >= 0 ? 1 : -1;

    this.tweens.add({
      targets: flash,
      x: launch.x + direction * 7,
      alpha: 0,
      duration: 90,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  private handlePlayerEnemyContact(
    _playerObject: ColliderTarget,
    enemyObject: ColliderTarget,
  ): void {
    const enemy = enemyObject as Enemy;

    if (!enemy.active || enemy.isDead || this.player.isDead) {
      return;
    }

    const damage = scaleEnemyDamage(enemy.contactDamage, this.difficulty);
    this.player.takeDamage(damage, enemy.x);
  }

  private handleEnemyProjectile(launch: BoneLaunch): void {
    if (this.restarting) {
      return;
    }

    const bone = new Bone(this, launch);
    this.enemyProjectileGroup.add(bone);
    this.bonesThrown += 1;
    this.audio.play('bone-throw');
  }

  private handleBoneBreak(boneObject: ColliderTarget): void {
    const bone = boneObject as Bone;

    if (!bone.active) {
      return;
    }

    this.boneBreaks += 1;
    this.spawnHitBurst(bone.x, bone.y, 0xe8e2d0, 3);
    bone.destroy();
  }

  private handleBoneHitPlayer(_playerObject: ColliderTarget, boneObject: ColliderTarget): void {
    const bone = boneObject as Bone;

    if (!bone.active || this.player.isDead) {
      return;
    }

    this.boneHits += 1;
    this.player.takeDamage(scaleEnemyDamage(bone.damage, this.difficulty), bone.x);
    this.spawnHitBurst(bone.x, bone.y, 0xe8e2d0, 3);
    bone.destroy();
  }

  private handleSpikeOverlap(_playerObject: ColliderTarget, spikeObject: ColliderTarget): void {
    if (this.player.isDead) {
      return;
    }

    const spike = spikeObject as Phaser.GameObjects.Zone;
    this.player.takeDamage(HAZARD_TUNING.spikeDamage, spike.x);
  }

  private handleFallingRockTrigger(
    _playerObject: ColliderTarget,
    triggerObject: ColliderTarget,
  ): void {
    const trigger = triggerObject as Phaser.GameObjects.Zone;

    if (trigger.getData('triggered') === true || this.restarting) {
      return;
    }

    trigger.setData('triggered', true);
    this.hazardsTriggered += 1;

    const hazard = trigger.getData('hazard') as HazardSpawn;
    const centerX = hazard.x + hazard.width / 2;
    const groundY = this.findGroundY(centerX, hazard.y + hazard.height);
    const shadow = this.add
      .ellipse(
        centerX,
        groundY - 2,
        HAZARD_TUNING.fallingRockShadowWidth,
        HAZARD_TUNING.fallingRockShadowHeight,
        0x000000,
        0.5,
      )
      .setDepth(3);

    this.tweens.add({
      targets: shadow,
      alpha: 0.2,
      duration: 180,
      yoyo: true,
      repeat: 3,
    });

    this.audio.play('rumble');
    this.cameras.main.shake(90, 0.002);
    this.spawnHitBurst(centerX, hazard.y + hazard.height, 0x8b7d6b, 4);

    this.time.delayedCall(HAZARD_TUNING.fallingRockTelegraphMs, () => {
      if (this.restarting || !this.scene.isActive()) {
        return;
      }

      shadow.destroy();
      const rock = new FallingRock(this, centerX, hazard.y + hazard.height);
      this.fallingRockGroup.add(rock);
      this.audio.play('boulder');
    });
  }

  private handleFallingRockImpact(rockObject: ColliderTarget): void {
    const rock = rockObject as FallingRock;

    if (!rock.active) {
      return;
    }

    this.spawnHitBurst(rock.x, rock.y, 0x8b7d6b, 7);
    this.cameras.main.shake(110, 0.005);
    this.audio.play('boulder');
    rock.destroy();
  }

  private handleFallingRockHitPlayer(
    _playerObject: ColliderTarget,
    rockObject: ColliderTarget,
  ): void {
    const rock = rockObject as FallingRock;

    if (!rock.active || this.player.isDead) {
      return;
    }

    if (this.player.takeDamage(HAZARD_TUNING.fallingRockDamage, rock.x)) {
      this.spawnHitBurst(rock.x, rock.y, 0x8b7d6b, 5);
      rock.destroy();
    }
  }

  private findGroundY(x: number, fromY: number): number {
    let groundY = this.level.killY;

    for (const rect of [...this.level.solids, ...this.level.oneWayPlatforms]) {
      const containsX = x >= rect.x && x <= rect.x + rect.width;

      if (containsX && rect.y >= fromY && rect.y < groundY) {
        groundY = rect.y;
      }
    }

    return groundY;
  }

  private handlePlayerDamaged(): void {
    this.audio.play('hurt');
    this.cameras.main.shake(FEEDBACK_TUNING.screenShakeMs, FEEDBACK_TUNING.screenShakeIntensity);
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

  private triggerHitStop(): void {
    if (this.hitStopActive) {
      return;
    }

    this.hitStopActive = true;
    this.physics.world.pause();
    this.time.delayedCall(FEEDBACK_TUNING.hitStopMs, () => {
      this.hitStopActive = false;

      if (this.physics.world) {
        this.physics.world.resume();
      }
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
    if (!this.debugEnabled || !this.debugText || !this.player.body) {
      return;
    }

    const body = this.player.arcadeBody;

    this.debugText.setText([
      `FPS ${Math.round(this.game.loop.actualFps)}  HP ${this.player.hp}  DEAD ${this.player.isDead}`,
      `POS ${Math.round(this.player.x)},${Math.round(this.player.y)}  VEL ${Math.round(body.velocity.x)},${Math.round(body.velocity.y)}`,
      `GROUND ${this.player.isGrounded()}  ROCKS ${this.rocksThrown}  ENEMIES ${this.countAliveEnemies()}`,
      `DEFLECTS ${this.deflects}  HAZARDS ${this.hazardsTriggered}  BONES ${this.bonesThrown}`,
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

    if (!this.player.body) {
      setTestHook({
        ready: true,
        scene: 'Level',
        levelId: this.level.id,
        playerX: Math.round(this.player.x),
        playerY: Math.round(this.player.y),
        hp: this.player.hp,
        dead: this.player.isDead,
        playerBody: false,
        message: 'Player physics body is missing.',
      });
      return;
    }

    const body = this.player.arcadeBody;
    const livingEnemies = this.enemies.filter((enemy) => enemy.active && !enemy.isDead);

    setTestHook({
      ready: true,
      scene: 'Level',
      levelId: this.level.id,
      playerBody: true,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      playerVx: Math.round(body.velocity.x),
      playerVy: Math.round(body.velocity.y),
      grounded: this.player.isGrounded(),
      hp: this.player.hp,
      rocksThrown: this.rocksThrown,
      itemId: this.player.inventory.snapshot.itemId,
      itemUses: this.player.inventory.snapshot.uses,
      itemMaxUses: this.player.inventory.snapshot.maxUses,
      ore: this.player.ore,
      itemsUsed: this.itemsUsed,
      itemsCollected: this.itemsCollected,
      cratesBroken: this.cratesBroken,
      crates: this.crateGroup
        ? this.crateGroup
            .getChildren()
            .filter((child) => (child as Phaser.GameObjects.GameObject).active).length
        : 0,
      pickups: this.pickupGroup
        ? this.pickupGroup
            .getChildren()
            .filter((child) => (child as Phaser.GameObjects.GameObject).active).length
        : 0,
      pedestals: this.pedestals.filter((pedestal) => !pedestal.claimed).length,
      itemProjectiles: this.itemProjectileGroup
        ? this.itemProjectileGroup
            .getChildren()
            .filter((child) => (child as Phaser.GameObjects.GameObject).active).length
        : 0,
      enemyCount: livingEnemies.length,
      dummyHp:
        this.firstDummy && this.firstDummy.active && !this.firstDummy.isDead
          ? this.firstDummy.hp
          : 0,
      dead: this.player.isDead,
      fps: Math.round(this.game.loop.actualFps),
      frameCount: this.frameCount,
      debug: this.debugEnabled,
      enemies: livingEnemies.map((enemy) => ({
        type: enemy.enemyId,
        hp: enemy.hp,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        facing: enemy.facing,
        phase: enemy.attackPhase,
        stunned: enemy.isStunned,
      })),
      enemyProjectiles: this.enemyProjectileGroup
        ? this.enemyProjectileGroup
            .getChildren()
            .filter((child) => (child as Phaser.GameObjects.GameObject).active).length
        : 0,
      enemyProjectilePositions: this.enemyProjectileGroup
        ? this.enemyProjectileGroup
            .getChildren()
            .filter((child) => (child as Phaser.GameObjects.GameObject).active)
            .map((child) => {
              const bone = child as Bone;
              return { x: Math.round(bone.x), y: Math.round(bone.y) };
            })
        : [],
      fallingRocks: this.fallingRockGroup
        ? this.fallingRockGroup
            .getChildren()
            .filter((child) => (child as Phaser.GameObjects.GameObject).active).length
        : 0,
      fallingRockPositions: this.fallingRockGroup
        ? this.fallingRockGroup
            .getChildren()
            .filter((child) => (child as Phaser.GameObjects.GameObject).active)
            .map((child) => {
              const rock = child as FallingRock;
              return {
                x: Math.round(rock.x),
                y: Math.round(rock.y),
                vy: Math.round(rock.arcadeBody.velocity.y),
                blockedDown: rock.arcadeBody.blocked.down,
              };
            })
        : [],
      deflects: this.deflects,
      bonesThrown: this.bonesThrown,
      boneHits: this.boneHits,
      boneBreaks: this.boneBreaks,
      hazardsTriggered: this.hazardsTriggered,
    });
  }

  private countAliveEnemies(): number {
    return this.enemies.filter((enemy) => enemy.active && !enemy.isDead).length;
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

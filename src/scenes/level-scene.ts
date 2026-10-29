import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { FEEDBACK_TUNING, HAZARD_TUNING, ROCK_TUNING } from '../config/tuning';
import {
  getDifficulty,
  resolveDifficultyId,
  scaleEnemyDamage,
  type DifficultyConfig,
  type DifficultyId,
} from '../data/difficulties';
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
import {
  getLevelAsset,
  getLevelIndex,
  getLevelTheme,
  LEVEL_COUNT,
  LEVEL_ORDER,
  levelCacheKey,
  resolveLevelId,
} from '../data/level-registry';
import { resolveSkinId, skinTextureKey } from '../data/skins';
import type { LevelTheme } from '../data/themes';
import { Bat } from '../entities/enemies/bat';
import { Beetle } from '../entities/enemies/beetle';
import type { Enemy, EnemyHitResult } from '../entities/enemies/enemy';
import { Goblin } from '../entities/enemies/goblin';
import { PracticeDummy } from '../entities/enemies/practice-dummy';
import { Skeleton } from '../entities/enemies/skeleton';
import { Wormling } from '../entities/enemies/wormling';
import { FallingRock } from '../entities/hazards/falling-rock';
import { Crate } from '../entities/pickups/crate';
import { ItemPickup } from '../entities/pickups/item-pickup';
import { Player, type PlayerDamageEvent, type PlayerItemUse } from '../entities/player';
import type { ProjectileLaunch } from '../entities/projectiles/aim';
import { Bone, type BoneLaunch } from '../entities/projectiles/bone';
import { ItemProjectile } from '../entities/projectiles/item-projectile';
import { Rock } from '../entities/projectiles/rock';
import type { AchievementService } from '../services/achievement-service';
import type { AudioService } from '../services/audio-service';
import { InputService } from '../services/input-service';
import type { SaveService } from '../services/save-service';
import type { DamageEvent, DamageSource } from '../systems/damage';
import { runService, type RunCarryState } from '../systems/run-service';
import { showAchievementToast } from '../ui/toast';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

interface LevelSceneData {
  levelId?: string;
  difficultyId?: DifficultyId;
  carry?: RunCarryState;
  refillHp?: boolean;
  spawnAtExit?: boolean;
}

interface PedestalState {
  x: number;
  y: number;
  itemId: PickupId;
  icon: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  stand: Phaser.GameObjects.Image;
  claimed: boolean;
}

type ColliderTarget =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

export class LevelScene extends Phaser.Scene {
  private levelId = 'shaft-entrance';
  private level!: LevelDefinition;
  private theme!: LevelTheme;
  private levelIndex = 0;
  private difficulty: DifficultyConfig = getDifficulty('normal');
  private entryCarry: RunCarryState | null = null;
  private refillHp = false;
  private debugSpawnAtExit = false;
  private player!: Player;
  private inputService!: InputService;
  private audio!: AudioService;
  private saveService!: SaveService;
  private achievementService!: AchievementService;
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
  private exitPrompt: Phaser.GameObjects.Text | undefined;
  private leavingLevel = false;
  private pauseOpen = false;
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
    this.levelId = resolveLevelId(data.levelId);
    this.difficulty = getDifficulty(resolveDifficultyId(data.difficultyId));
    this.entryCarry = data.carry ?? runService.takeCarry();
    this.refillHp = data.refillHp ?? false;
    this.debugSpawnAtExit = data.spawnAtExit ?? false;
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
    this.leavingLevel = false;
    this.hitStopActive = false;
    this.firstDummy = undefined;
    this.enemies = [];
    this.pedestals = [];
    this.interactPrompt = undefined;
    this.exitPrompt = undefined;
    this.frameCount = 0;
    this.levelIndex = Math.max(0, getLevelIndex(this.level.id));
    this.theme = getLevelTheme(this.level.id);
    this.saveService = this.registry.get('saveService') as SaveService;
    this.achievementService = this.registry.get('achievementService') as AchievementService;

    if (!runService.isActive) {
      runService.startRun(this.difficulty.id);
      this.saveService.recordRunStarted();
    }

    runService.enterLevel(this.levelIndex, this.level.id, Date.now(), this.countLevelOre());

    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight + 160);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.setBackgroundColor('#0b0c10');

    this.inputService = new InputService(this);
    this.audio = this.registry.get('audioService') as AudioService;
    this.audio.playMusic('music-mines');
    this.createBackground();
    this.createPlatforms();
    this.createProps();
    this.createHazards();
    this.createExit();
    this.createAmbientFx();

    this.player = new Player(
      this,
      this.level.spawn.x,
      this.level.spawn.y,
      this.inputService,
      this.difficulty.playerMaxHp,
      skinTextureKey(resolveSkinId(this.saveService.settings.equippedSkin)),
    );

    if (this.entryCarry) {
      this.player.applyCarryState(this.entryCarry, this.refillHp);
    }

    if (this.debugSpawnAtExit) {
      this.player.respawn({
        x: this.level.exit.x + this.level.exit.width / 2,
        y: this.level.exit.y + this.level.exit.height - 12,
      });
    }

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
    this.setupPauseInput();

    this.scene.launch('HUD', {
      levelName: this.level.name,
      levelNumber: this.levelIndex + 1,
      levelCount: LEVEL_COUNT,
      player: this.player,
      difficultyName: this.difficulty.displayName,
      requiresAllEnemiesDead: this.difficulty.requiresAllEnemiesDead,
      getEnemiesRemaining: () => this.countAliveEnemies(),
    });

    this.showLevelIntro();
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
    this.updateExitInteraction();

    this.testHookAccumulator += delta;
    if (this.testHookAccumulator >= 100) {
      this.testHookAccumulator = 0;
      this.publishTestHook();
    }

    this.updateDebugOverlay();
  }

  private createBackground(): void {
    const theme = this.theme;

    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, theme.backgroundKey)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-20);

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050608, 0.35)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-19);

    // Timber supports and the ceiling beam use the chapter's own wood palette.
    for (let x = 0; x < this.level.worldWidth; x += 160) {
      this.add
        .tileSprite(x, 0, 8, this.level.worldHeight, theme.pillarTileKey)
        .setOrigin(0)
        .setDepth(-10);

      if (x % 320 === 0) {
        this.add
          .image(x + 4, 14, 'lantern')
          .setOrigin(0.5, 0)
          .setScale(0.8)
          .setDepth(-9);
        this.add
          .image(x + 4, 30, 'lantern-glow')
          .setTint(0xffcf5a)
          .setScale(0.6)
          .setAlpha(0.28)
          .setDepth(-9);
      }
    }

    this.add
      .tileSprite(0, 52, this.level.worldWidth, 8, theme.beamTileKey)
      .setOrigin(0)
      .setDepth(-8);
  }

  private createAmbientFx(): void {
    const dustCount = Math.max(8, Math.min(24, Math.floor(this.level.worldWidth / 90)));

    for (let index = 0; index < dustCount; index += 1) {
      const x = 24 + ((index * 149) % Math.max(1, this.level.worldWidth - 48));
      const y = 70 + ((index * 47) % 110);
      const dust = this.add
        .image(x, y, 'dust')
        .setAlpha(0.18 + (index % 4) * 0.05)
        .setDepth(-6);

      this.tweens.add({
        targets: dust,
        x: x + 6 + (index % 4) * 3,
        y: y - 8 - (index % 5) * 2,
        alpha: 0.02,
        duration: 2600 + (index % 6) * 320,
        delay: (index % 7) * 240,
        yoyo: true,
        repeat: -1,
      });
    }

    // Sparse ceiling drips sit behind the terrain so they never read as hazards.
    for (let index = 0; index < 4; index += 1) {
      const sweep = Math.floor(this.level.worldWidth / 5);
      const x = 100 + index * Math.max(120, sweep);
      const drip = this.add.image(x, 62, 'drip').setAlpha(0).setDepth(-6);

      this.tweens.add({
        targets: drip,
        y: this.level.worldHeight - 24,
        alpha: { from: 0, to: 0.45 },
        duration: 1100,
        delay: index * 620,
        repeat: -1,
        repeatDelay: 2600,
      });
    }
  }

  private createPlatforms(): void {
    this.solidGroup = this.add.group();
    this.oneWayGroup = this.add.group();

    for (const rect of this.level.solids) {
      this.add
        .tileSprite(rect.x, rect.y, rect.width, rect.height, this.theme.stoneTileKey)
        .setOrigin(0)
        .setDepth(0);
      this.addSolidBody(rect, this.solidGroup);
    }

    for (const rect of this.level.oneWayPlatforms) {
      this.add
        .tileSprite(rect.x, rect.y, rect.width, rect.height, this.theme.woodTileKey)
        .setOrigin(0)
        .setDepth(1);
      this.add
        .tileSprite(rect.x, rect.y, rect.width, Math.min(rect.height, 8), this.theme.beamTileKey)
        .setOrigin(0)
        .setDepth(2);
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

      if (prop.type === 'crystal') {
        this.createCrystal(prop.x, prop.y);
        return;
      }

      const glow = this.add
        .image(prop.x, prop.y - 4, 'lantern-glow')
        .setDepth(4)
        .setScale(1.1)
        .setAlpha(0.5);

      this.tweens.add({
        targets: glow,
        alpha: 0.75,
        duration: 900 + (index % 3) * 140,
        yoyo: true,
        repeat: -1,
      });

      this.add
        .image(prop.x, prop.y + 4, 'lantern')
        .setOrigin(0.5, 1)
        .setDepth(5);
    });
  }

  private createCrystal(x: number, y: number): void {
    const glow = this.add
      .image(x, y - 2, 'lantern-glow')
      .setTint(this.theme.accentColor)
      .setScale(1)
      .setAlpha(0.16)
      .setDepth(2);

    this.tweens.add({
      targets: glow,
      alpha: 0.3,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .image(x, y + 14, this.theme.crystalKey)
      .setOrigin(0.5, 1)
      .setScale(1.2)
      .setDepth(3);
  }

  private createPedestal(x: number, y: number, itemId: PickupId): void {
    const stand = this.add
      .image(x, y + 8, 'pedestal')
      .setOrigin(0.5, 1)
      .setDepth(4);

    const glow = this.add
      .image(x, y - 8, 'lantern-glow')
      .setTint(0xffcf5a)
      .setScale(0.5)
      .setAlpha(0.28)
      .setDepth(5);
    this.tweens.add({
      targets: glow,
      alpha: 0.45,
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
      stand,
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

  private createExit(): void {
    const exit = this.level.exit;
    const centerX = exit.x + exit.width / 2;
    const centerY = exit.y + exit.height / 2;

    const glow = this.add
      .image(centerX, centerY, 'lantern-glow')
      .setTint(0xffcf5a)
      .setScale(1.6)
      .setAlpha(0.22)
      .setDepth(2);

    this.tweens.add({
      targets: glow,
      alpha: 0.38,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .image(centerX, centerY, 'elevator-door')
      .setDisplaySize(exit.width, exit.height)
      .setDepth(4);

    this.add
      .text(centerX, exit.y - 8, 'ELEVATOR', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#e8c170',
        backgroundColor: '#11161b',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.exitPrompt = this.add
      .text(centerX, centerY, 'E RIDE', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#ffcf5a',
        backgroundColor: '#11161b',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setVisible(false);
  }

  private showLevelIntro(): void {
    const asset = getLevelAsset(this.level.id);
    const levelNumber = asset?.number ?? this.levelIndex + 1;
    const intro = asset?.intro ?? 'Find the elevator and keep descending.';

    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(180);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050608, 0.68).setOrigin(0);
    const rule = this.add.rectangle(GAME_WIDTH / 2, 104, 220, 1, 0x8a6b32, 0.8);
    const progress = this.add
      .text(GAME_WIDTH / 2, 86, `LEVEL ${levelNumber} / ${LEVEL_COUNT}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#c85c5c',
      })
      .setOrigin(0.5);
    const title = this.add
      .text(GAME_WIDTH / 2, 122, this.level.name.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);
    const subtitle = this.add
      .text(GAME_WIDTH / 2, 148, intro, {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
        align: 'center',
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5);

    container.add([shade, rule, progress, title, subtitle]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      delay: 1050,
      duration: 420,
      onComplete: () => {
        container.destroy(true);
      },
    });
  }

  private updateExitInteraction(): void {
    if (!this.exitPrompt || this.leavingLevel || this.restarting || !this.level || !this.player) {
      return;
    }

    if (this.player.isDead) {
      this.exitPrompt.setVisible(false);
      return;
    }

    const exit = this.level.exit;
    const body = this.player.arcadeBody;
    const inside =
      body.right > exit.x &&
      body.left < exit.x + exit.width &&
      body.bottom > exit.y &&
      body.top < exit.y + exit.height;

    if (!inside) {
      this.exitPrompt.setVisible(false);
      return;
    }

    const alive = this.countAliveEnemies();
    const locked = this.difficulty.requiresAllEnemiesDead && alive > 0;
    this.exitPrompt.setText(locked ? `LOCKED: ${alive} LEFT` : 'E RIDE').setVisible(true);

    if (!this.inputService.isInteractJustPressed()) {
      return;
    }

    if (locked) {
      this.showFloatingText(exit.x + exit.width / 2, exit.y - 18, 'CLEAR THE LEVEL', '#e74c3c');
      this.audio.play('empty');
      return;
    }

    this.completeLevel();
  }

  private completeLevel(): void {
    if (this.leavingLevel) {
      return;
    }

    this.leavingLevel = true;
    this.restarting = true;
    this.exitPrompt?.setVisible(false);
    this.player.setVelocity(0, 0);
    this.runServiceCompleteLevel();
    this.audio.play('elevator');
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const nextIndex = this.levelIndex + 1;

      if (nextIndex >= LEVEL_COUNT) {
        this.scene.start('Boss', { difficultyId: this.difficulty.id });
        return;
      }

      const nextLevelId = LEVEL_ORDER[nextIndex];

      if (!nextLevelId) {
        this.scene.start('Boss', { difficultyId: this.difficulty.id });
        return;
      }

      this.scene.start('Level', {
        levelId: nextLevelId,
        difficultyId: this.difficulty.id,
      });
    });
  }

  private runServiceCompleteLevel(): void {
    runService.completeLevel(this.player.getCarryState());

    const run = runService.snapshot;
    const oreHunter = run.levelOreTotal > 0 && run.levelOreCollected >= run.levelOreTotal;
    const unlocks = this.achievementService.evaluateLevel(run, this.levelIndex, oreHunter);
    showAchievementToast(this, unlocks);
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
      case 'wormling':
        return new Wormling(this, x, y, hp);
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
        this.recordEnemyKill(enemy, 'environment');
        enemy.destroy();
      }
    }
  }

  private recordEnemyKill(enemy: Enemy, source: DamageSource): void {
    runService.recordKill(source, enemy.definition.id);
    this.saveService.recordKills();
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
    runService.recordItemUse(use.itemId);
    this.saveService.recordItemUsed(use.itemId);

    const unlocks = this.achievementService.evaluateItemUse(
      runService.snapshot,
      this.saveService.data.stats.usedItems,
    );
    showAchievementToast(this, unlocks);

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

    if (result.killed) {
      this.recordEnemyKill(enemy, 'rock');
    }

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
    const color = projectile.itemId === 'flintlock' ? 0xffcf5a : 0xd8dde3;
    this.playEnemyHitFeedback(result, projectile.x, projectile.y, color);

    if (result.killed) {
      this.recordEnemyKill(enemy, projectile.definition.damageSource);
    }

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
      this.shakeScreen(FEEDBACK_TUNING.screenShakeMs, FEEDBACK_TUNING.screenShakeIntensity);
    }

    this.triggerHitStop();
  }

  private handleItemProjectileImpact(projectileObject: ColliderTarget): void {
    const projectile = projectileObject as ItemProjectile;

    if (!projectile.active) {
      return;
    }

    if (projectile.itemId === 'rune-scroll') {
      this.explodeRune(projectile);
    } else {
      const color = projectile.itemId === 'flintlock' ? 0xffcf5a : 0xd8dde3;
      this.spawnHitBurst(projectile.x, projectile.y, color, 3);
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
    this.shakeScreen(150, 0.008);
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

      if (result.killed) {
        this.recordEnemyKill(enemy, definition.damageSource);
      }

      this.spawnHitBurst(enemy.x, enemy.y, 0x6fe3c4, 5);

      if (!result.killed) {
        enemy.stun(definition.stunMs);
      }
    }

    if (damagedAny) {
      this.audio.play(killedAny ? 'enemy-down' : 'hit');
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
      this.recordPickup(pickup.itemId);
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

    if (!nearby || this.player.isDead || this.restarting) {
      return;
    }

    if (!this.inputService.isInteractJustPressed()) {
      return;
    }

    if (this.player.collectPickup(nearby.itemId)) {
      this.itemsCollected += 1;
      this.recordPickup(nearby.itemId);
      nearby.claimed = true;
      nearby.icon.destroy();
      nearby.glow.destroy();
      nearby.stand.destroy();
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

  private recordPickup(itemId: PickupId): void {
    runService.recordPickup();

    if (itemId === ORE.id) {
      runService.recordOre(ORE.value);
    }
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
    this.player.takeDamage(damage, enemy.x, 'enemy');
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
    this.player.takeDamage(scaleEnemyDamage(bone.damage, this.difficulty), bone.x, 'enemy');
    this.spawnHitBurst(bone.x, bone.y, 0xe8e2d0, 3);
    bone.destroy();
  }

  private handleSpikeOverlap(_playerObject: ColliderTarget, spikeObject: ColliderTarget): void {
    if (this.player.isDead) {
      return;
    }

    const spike = spikeObject as Phaser.GameObjects.Zone;
    this.player.takeDamage(HAZARD_TUNING.spikeDamage, spike.x, 'hazard');
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
    this.shakeScreen(90, 0.002);
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
    this.shakeScreen(110, 0.005);
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

    if (this.player.takeDamage(HAZARD_TUNING.fallingRockDamage, rock.x, 'hazard')) {
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

  private handlePlayerDamaged(event: PlayerDamageEvent): void {
    runService.recordDamage(event.amount, event.source);
    this.audio.play('hurt');
    this.shakeScreen(FEEDBACK_TUNING.screenShakeMs, FEEDBACK_TUNING.screenShakeIntensity);
    this.spawnHitBurst(this.player.x, this.player.y, 0xff6b6b, FEEDBACK_TUNING.hitParticles);

    if (event.hp > 0) {
      this.triggerHitStop();
    }
  }

  private handlePlayerDied(): void {
    if (this.restarting) {
      return;
    }

    runService.recordDeath();
    this.saveService.recordDeath();
    this.restarting = true;
    this.audio.play('death');
    this.shakeScreen(220, 0.01);
    this.time.delayedCall(1300, () => {
      this.restartLevel();
    });
  }

  public closePause(): void {
    this.pauseOpen = false;
  }

  public restartFromPause(): void {
    this.closePause();
    this.restartLevel();
  }

  private restartLevel(): void {
    this.pauseOpen = false;
    this.restarting = true;
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({
        levelId: this.level.id,
        difficultyId: this.difficulty.id,
        carry: this.entryCarry ?? undefined,
        refillHp: true,
      });
    });
  }

  private shakeScreen(duration: number, intensity: number): void {
    const saveService = this.registry.get('saveService') as SaveService | undefined;
    const setting = saveService?.settings.screenShake ?? 'full';

    if (setting === 'off') {
      return;
    }

    this.cameras.main.shake(duration, setting === 'reduced' ? intensity * 0.45 : intensity);
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

  private setupPauseInput(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    keyboard.on('keydown-ESC', this.openPause, this);
    keyboard.on('keydown-P', this.openPause, this);

    this.events.once('shutdown', () => {
      keyboard.off('keydown-ESC', this.openPause, this);
      keyboard.off('keydown-P', this.openPause, this);
    });
  }

  private openPause(): void {
    if (this.pauseOpen || this.leavingLevel || this.restarting || this.player.isDead) {
      return;
    }

    this.pauseOpen = true;
    this.scene.launch('Pause', {
      sceneKey: 'Level',
      levelName: this.level.name,
      levelNumber: this.levelIndex + 1,
      levelCount: LEVEL_COUNT,
      difficultyName: this.difficulty.displayName,
      runTimeMs: runService.elapsedMs(),
    });
    this.scene.pause();
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

    keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.F3, Phaser.Input.Keyboard.KeyCodes.F4]);
    keyboard.on('keydown-F3', this.toggleDebug, this);
    keyboard.on('keydown-F4', this.debugCompleteLevel, this);

    this.events.once('shutdown', () => {
      keyboard.off('keydown-F3', this.toggleDebug, this);
      keyboard.off('keydown-F4', this.debugCompleteLevel, this);
    });
  }

  private debugCompleteLevel(): void {
    if (import.meta.env.DEV && !this.leavingLevel) {
      this.completeLevel();
    }
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
      `FPS ${Math.round(this.game.loop.actualFps)}  HP ${this.player.hp}/${this.player.maxHp}  DEAD ${this.player.isDead}  DIFF ${this.difficulty.id.toUpperCase()}`,
      `POS ${Math.round(this.player.x)},${Math.round(this.player.y)}  VEL ${Math.round(body.velocity.x)},${Math.round(body.velocity.y)}`,
      `GROUND ${this.player.isGrounded()}  ROCKS ${this.rocksThrown}  ITEMS ${this.itemsUsed}  ENEMIES ${this.countAliveEnemies()}`,
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
        playerMaxHp: this.player.maxHp,
        difficulty: this.difficulty.id,
        dead: this.player.isDead,
        playerBody: false,
        message: 'Player physics body is missing.',
      });
      return;
    }

    const body = this.player.arcadeBody;
    const livingEnemies = this.enemies.filter((enemy) => enemy.active && !enemy.isDead);
    const run = runService.snapshot;

    setTestHook({
      ready: true,
      scene: 'Level',
      levelId: this.level.id,
      music: this.audio.currentMusic ?? 'none',
      levelNumber: this.levelIndex + 1,
      levelCount: LEVEL_COUNT,
      exit: {
        x: this.level.exit.x,
        y: this.level.exit.y,
        width: this.level.exit.width,
        height: this.level.exit.height,
      },
      playerBody: true,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      playerVx: Math.round(body.velocity.x),
      playerVy: Math.round(body.velocity.y),
      grounded: this.player.isGrounded(),
      hp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      difficulty: this.difficulty.id,
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
      runActive: run.active,
      runLevelIndex: run.levelIndex,
      runKills: run.kills,
      runDamageTaken: run.damageTaken,
      runDeaths: run.deaths,
      runItemUses: run.itemUses,
      runOre: run.oreCollected,
      runItemsPickedUp: run.itemsPickedUp,
      runLevelsCompleted: run.levelsCompleted,
      runTimeMs: runService.elapsedMs(),
      ...(this.difficulty.requiresAllEnemiesDead
        ? { crazyEnemiesRemaining: livingEnemies.length }
        : {}),
      runBossDamageTaken: run.bossDamageTaken,
    });
  }

  private countAliveEnemies(): number {
    return this.enemies.filter((enemy) => enemy.active && !enemy.isDead).length;
  }

  private countLevelOre(): number {
    const orePickups = this.level.props.filter((prop) => {
      if (prop.type === 'crate') {
        return prop.contents === ORE.id;
      }

      return prop.type === 'pedestal' && prop.item === ORE.id;
    }).length;

    return orePickups * ORE.value;
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

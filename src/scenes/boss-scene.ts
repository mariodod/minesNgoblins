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
import {
  BOSS_ARENA,
  BOSS_ATTACK_NAMES,
  BOSS_ATTACK_TUNING,
  BOSS_DEFINITION,
  BOSS_PHASE_NAMES,
  BOSS_PHASE_TUNING,
  BOSS_SUPPLIES,
  BOSS_WORMLING_HP,
  chooseChargeDirection,
  chooseHoleForAttack,
  computeBossHp,
  nearestHoleIndex,
  resolveBossPartDamage,
  resolveBossPhase,
  selectBossAttack,
  type BossAttack,
  type BossFightState,
  type BossHole,
  type BossPart,
  type BossPhase,
} from '../data/boss';
import {
  HEALING_SALVE,
  ORE,
  pickupDisplayName,
  pickupTextureKey,
  type PickupId,
} from '../data/items';
import { BossRock } from '../entities/boss/boss-rock';
import { GreatWorm } from '../entities/boss/great-worm';
import { Shockwave } from '../entities/boss/shockwave';
import type { Enemy, EnemyHitResult } from '../entities/enemies/enemy';
import { Wormling } from '../entities/enemies/wormling';
import { FallingRock } from '../entities/hazards/falling-rock';
import { Player, type PlayerDamageEvent, type PlayerItemUse } from '../entities/player';
import { computeAimedArc, type ProjectileLaunch } from '../entities/projectiles/aim';
import { ItemProjectile } from '../entities/projectiles/item-projectile';
import { Rock } from '../entities/projectiles/rock';
import type { AudioService } from '../services/audio-service';
import { InputService } from '../services/input-service';
import type { SaveService } from '../services/save-service';
import type { DamageEvent } from '../systems/damage';
import { runService, type RunCarryState } from '../systems/run-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';
const BOSS_BAR_WIDTH = 280;
const BOSS_BAR_X = 100;
const BOSS_BAR_Y = 35;

interface BossSceneData {
  difficultyId?: DifficultyId;
  carry?: RunCarryState;
  refillHp?: boolean;
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

/**
 * The M4 finale: a two-screen arena, a three-phase Great Worm, supplies
 * between phases, and the run's victory elevator.
 */
export class BossScene extends Phaser.Scene {
  private difficulty: DifficultyConfig = getDifficulty('normal');
  private entryCarry: RunCarryState | null = null;
  private refillHp = false;

  private player!: Player;
  private inputService!: InputService;
  private audio!: AudioService;

  private solidGroup!: Phaser.GameObjects.Group;
  private oneWayGroup!: Phaser.GameObjects.Group;
  private bossGroup!: Phaser.GameObjects.Group;
  private wormlingGroup!: Phaser.GameObjects.Group;
  private rockGroup!: Phaser.GameObjects.Group;
  private itemProjectileGroup!: Phaser.GameObjects.Group;
  private bossProjectileGroup!: Phaser.GameObjects.Group;
  private fallingRockGroup!: Phaser.GameObjects.Group;
  private shockwaveGroup!: Phaser.GameObjects.Group;

  private boss!: GreatWorm;
  private wormlings: Wormling[] = [];
  private pedestals: PedestalState[] = [];

  private interactPrompt: Phaser.GameObjects.Text | undefined;
  private exitPrompt: Phaser.GameObjects.Text | undefined;
  private exitLabel: Phaser.GameObjects.Text | undefined;
  private exitGlow: Phaser.GameObjects.Image | undefined;
  private exitBars: Phaser.GameObjects.Rectangle[] = [];
  private victoryPrompt: Phaser.GameObjects.Text | undefined;

  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private phasePips: Phaser.GameObjects.Rectangle[] = [];
  private phaseText!: Phaser.GameObjects.Text;
  private attackLabel!: Phaser.GameObjects.Text;
  private offscreenMarker!: Phaser.GameObjects.Text;

  private state: BossFightState = 'intro';
  private phase: BossPhase = 1;
  private attackIndex = 0;
  private currentAttack: BossAttack | null = null;
  private fightToken = 0;
  private fightActive = false;
  private introActive = true;

  private charging = false;
  private chargeDirection: -1 | 1 = 1;
  private chargeX = 0;
  private chargeEndX = 0;
  private chargeDustAccumulator = 0;
  private chargeWarnings: Phaser.GameObjects.Rectangle[] = [];
  private attackMarkers: Phaser.GameObjects.GameObject[] = [];

  private supplyPhase = 0;
  private victory = false;
  private exitOpen = false;
  private leaving = false;
  private restarting = false;
  private playerDead = false;
  private pauseOpen = false;
  private hitStopActive = false;

  private bossHeadHits = 0;
  private bossBodyHits = 0;
  private bossDeflects = 0;
  private rocksThrown = 0;
  private itemsUsed = 0;
  private itemsCollected = 0;

  private frameCount = 0;
  private testHookAccumulator = 0;
  private debugEnabled = false;
  private debugText: Phaser.GameObjects.Text | undefined;

  constructor() {
    super('Boss');
  }

  init(data: BossSceneData): void {
    this.difficulty = getDifficulty(resolveDifficultyId(data.difficultyId));
    this.entryCarry = data.carry ?? runService.takeCarry();
    this.refillHp = data.refillHp ?? false;
  }

  create(): void {
    this.resetRuntimeState();

    this.physics.world.timeScale = 1;
    if (this.physics.world.isPaused) {
      this.physics.world.resume();
    }

    if (!runService.isActive) {
      runService.startRun(this.difficulty.id);
    }

    runService.enterBoss();

    this.physics.world.setBounds(0, 0, BOSS_ARENA.width, BOSS_ARENA.height);
    this.cameras.main.setBounds(0, 0, BOSS_ARENA.width, BOSS_ARENA.height);
    this.cameras.main.setBackgroundColor('#08090d');
    this.cameras.main.scrollY = 0;

    this.inputService = new InputService(this);
    this.audio = this.registry.get('audioService') as AudioService;

    this.createGroups();
    this.createArena();
    this.createExit();
    this.createBoss();
    this.createPlayer();
    this.createCombatColliders();
    this.createBossHud();
    this.createPrompts();

    this.scene.launch('HUD', {
      levelName: BOSS_DEFINITION.name,
      levelNumber: 5,
      levelCount: 5,
      difficultyName: this.difficulty.displayName,
      player: this.player,
      isBoss: true,
    });

    this.player.on('player-throw', this.handlePlayerThrow, this);
    this.player.on('player-item-use', this.handlePlayerItemUse, this);
    this.player.on('player-item-empty', this.handlePlayerItemEmpty, this);
    this.player.on('player-jumped', this.handlePlayerJumped, this);
    this.player.on('player-landed', this.handlePlayerLanded, this);
    this.player.on('player-damaged', this.handlePlayerDamaged, this);
    this.player.on('player-died', this.handlePlayerDied, this);

    this.setupPauseInput();
    this.setupDebugOverlay();
    this.publishTestHook();

    this.showIntro();
    this.cameras.main.fadeIn(220, 0, 0, 0);

    this.events.once('shutdown', this.handleShutdown, this);
  }

  override update(time: number, delta: number): void {
    if (!this.player || !this.boss) {
      return;
    }

    this.frameCount += 1;

    if (!this.hitStopActive) {
      this.player.update(time, delta);
      this.updateWormlings(time, delta);
      this.updateCharge(delta);
    }

    this.boss.update(time);
    this.updateCamera();
    this.updatePedestalInteraction();
    this.updateVictoryInteraction();
    this.updateOffscreenMarker();

    this.testHookAccumulator += delta;
    if (this.testHookAccumulator >= 100) {
      this.testHookAccumulator = 0;
      this.publishTestHook();
    }

    this.updateDebugOverlay();
  }

  private resetRuntimeState(): void {
    this.state = 'intro';
    this.phase = 1;
    this.attackIndex = 0;
    this.currentAttack = null;
    this.fightToken = 0;
    this.fightActive = false;
    this.introActive = true;
    this.charging = false;
    this.chargeWarnings = [];
    this.attackMarkers = [];
    this.supplyPhase = 0;
    this.victory = false;
    this.exitOpen = false;
    this.leaving = false;
    this.restarting = false;
    this.playerDead = false;
    this.pauseOpen = false;
    this.hitStopActive = false;
    this.bossHeadHits = 0;
    this.bossBodyHits = 0;
    this.bossDeflects = 0;
    this.rocksThrown = 0;
    this.itemsUsed = 0;
    this.itemsCollected = 0;
    this.wormlings = [];
    this.pedestals = [];
    this.exitBars = [];
    this.frameCount = 0;
    this.testHookAccumulator = 0;
    this.debugEnabled = false;
    this.debugText = undefined;
  }

  private createGroups(): void {
    this.solidGroup = this.add.group();
    this.oneWayGroup = this.add.group();
    this.bossGroup = this.add.group();
    this.wormlingGroup = this.add.group();
    this.rockGroup = this.add.group();
    this.itemProjectileGroup = this.add.group();
    this.bossProjectileGroup = this.add.group();
    this.fallingRockGroup = this.add.group();
    this.shockwaveGroup = this.add.group();
  }

  private createArena(): void {
    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-cave')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-20);
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050608, 0.34)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-19);

    for (let x = 0; x < BOSS_ARENA.width; x += 160) {
      this.add.rectangle(x, 0, 9, BOSS_ARENA.floorY, 0x1a1210, 0.94).setOrigin(0).setDepth(-10);
      this.add
        .rectangle(x + 2, 0, 2, BOSS_ARENA.floorY, 0x2f2318, 0.7)
        .setOrigin(0)
        .setDepth(-9);
    }

    this.add.rectangle(0, 4, BOSS_ARENA.width, 10, 0x241a13, 1).setOrigin(0).setDepth(-8);
    this.add.rectangle(0, 14, BOSS_ARENA.width, 5, 0x171015, 1).setOrigin(0).setDepth(-7);

    // Ceiling teeth make the quake rocks readable before they fall.
    for (const rock of BOSS_ARENA.ceilingRocks) {
      this.add.triangle(rock.x, 19, 0, 0, 10, 0, 5, 12, 0x2a2f36, 1).setDepth(-6);
      this.add.triangle(rock.x + 2, 19, 0, 0, 6, 0, 3, 8, 0x4a515a, 0.7).setDepth(-5);
    }

    this.add
      .tileSprite(
        0,
        BOSS_ARENA.floorY,
        BOSS_ARENA.width,
        BOSS_ARENA.height - BOSS_ARENA.floorY,
        'tile-stone',
      )
      .setOrigin(0)
      .setDepth(2);
    this.add
      .rectangle(0, BOSS_ARENA.floorY, BOSS_ARENA.width, 2, 0x3d454f, 1)
      .setOrigin(0)
      .setDepth(3);
    this.add
      .rectangle(0, BOSS_ARENA.floorY - 2, BOSS_ARENA.width, 1, 0x596169, 0.45)
      .setOrigin(0)
      .setDepth(3);

    this.addSolidBody(
      {
        x: 0,
        y: BOSS_ARENA.floorY,
        width: BOSS_ARENA.width,
        height: BOSS_ARENA.height - BOSS_ARENA.floorY,
      },
      this.solidGroup,
    );

    for (const platform of BOSS_ARENA.oneWayPlatforms) {
      this.add
        .tileSprite(platform.x, platform.y, platform.width, platform.height, 'tile-wood')
        .setOrigin(0)
        .setDepth(4);
      this.add
        .rectangle(platform.x, platform.y, platform.width, 2, 0x9aa0a6, 0.35)
        .setOrigin(0)
        .setDepth(5);
      this.addSolidBody(platform, this.oneWayGroup);
    }

    for (const hole of BOSS_ARENA.holes) {
      this.add.image(hole.x, hole.y + 2, 'burrow-hole').setDepth(6);
      this.add.ellipse(hole.x, hole.y - 1, 20, 3, 0x0b0c10, 0.8).setDepth(5);
    }

    for (const lanternX of [120, 600, 840]) {
      const glow = this.add
        .image(lanternX, 105, 'lantern-glow')
        .setTint(0xffcf5a)
        .setScale(1.3)
        .setAlpha(0.12)
        .setDepth(-3);
      this.tweens.add({
        targets: glow,
        alpha: 0.22,
        duration: 1200 + (lanternX % 3) * 120,
        yoyo: true,
        repeat: -1,
      });
      this.add.rectangle(lanternX, 110, 3, 5, 0xffe6a0, 0.75).setDepth(-2);
    }

    this.add.rectangle(2, BOSS_ARENA.floorY / 2, 4, BOSS_ARENA.floorY, 0x15100d, 1).setDepth(8);
    this.add
      .rectangle(BOSS_ARENA.width - 2, BOSS_ARENA.floorY / 2, 4, BOSS_ARENA.floorY, 0x15100d, 1)
      .setDepth(8);
  }

  private addSolidBody(
    rect: { x: number; y: number; width: number; height: number },
    group: Phaser.GameObjects.Group,
  ): void {
    const zone = this.add.zone(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
    );
    this.physics.add.existing(zone, true);
    group.add(zone);
  }

  private createExit(): void {
    const exit = BOSS_ARENA.exit;
    const centerX = exit.x + exit.width / 2;
    const centerY = exit.y + exit.height / 2;

    this.add
      .rectangle(exit.x, exit.y, exit.width, exit.height, 0x080d11, 0.94)
      .setOrigin(0)
      .setDepth(5)
      .setStrokeStyle(1, 0x8a6b32);

    this.exitGlow = this.add
      .image(centerX, centerY, 'lantern-glow')
      .setTint(0xffcf5a)
      .setScale(1.4)
      .setAlpha(0.1)
      .setDepth(6);

    this.exitBars = [];
    for (let bar = 8; bar < exit.height - 4; bar += 8) {
      const rectangle = this.add
        .rectangle(exit.x + 4, exit.y + bar, exit.width - 8, 2, 0x6f5427, 0.9)
        .setOrigin(0)
        .setDepth(7);
      this.exitBars.push(rectangle);
    }

    this.add
      .rectangle(centerX, exit.y + exit.height - 6, exit.width - 12, 4, 0x2f3640, 1)
      .setDepth(8);
    this.add.rectangle(centerX, exit.y + exit.height - 11, 5, 6, 0xffcf5a, 0.9).setDepth(8);

    this.exitLabel = this.add
      .text(centerX, exit.y - 9, 'SEALED', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#c85c5c',
        backgroundColor: '#11161b',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.exitPrompt = this.add
      .text(centerX, centerY, 'E ASCEND', {
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

  private createBoss(): void {
    const hp = computeBossHp(BOSS_DEFINITION.baseHp, this.difficulty.bossHpMultiplier);
    this.boss = new GreatWorm(this, this.bossGroup, hp);
  }

  private createPlayer(): void {
    this.player = new Player(
      this,
      BOSS_ARENA.spawn.x,
      BOSS_ARENA.spawn.y,
      this.inputService,
      this.difficulty.playerMaxHp,
    );

    if (this.entryCarry) {
      this.player.applyCarryState(this.entryCarry, this.refillHp);
    }
  }

  private createCombatColliders(): void {
    this.physics.add.collider(this.player, this.solidGroup);
    this.physics.add.collider(
      this.player,
      this.oneWayGroup,
      undefined,
      this.shouldCollideOneWay,
      this,
    );

    // Damage overlaps are registered before terrain collisions.
    this.physics.add.overlap(
      this.player,
      this.wormlingGroup,
      this.handlePlayerWormlingContact,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.boss.head,
      this.handlePlayerBossContact,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.rockGroup,
      this.wormlingGroup,
      this.handleRockHitWormling,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.rockGroup,
      this.bossGroup,
      this.handleRockHitBoss,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.itemProjectileGroup,
      this.wormlingGroup,
      this.handleItemProjectileHitWormling,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.itemProjectileGroup,
      this.bossGroup,
      this.handleItemProjectileHitBoss,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.bossProjectileGroup,
      this.handleBossProjectileHitPlayer,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.shockwaveGroup,
      this.handleShockwaveHitPlayer,
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

    this.physics.add.collider(this.wormlingGroup, this.solidGroup);
    this.physics.add.collider(
      this.wormlingGroup,
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
      this.bossProjectileGroup,
      this.solidGroup,
      this.handleBossProjectileBreak,
      undefined,
      this,
    );
    this.physics.add.collider(
      this.bossProjectileGroup,
      this.oneWayGroup,
      this.handleBossProjectileBreak,
      undefined,
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

  private createBossHud(): void {
    this.add
      .rectangle(0, 20, GAME_WIDTH, 34, 0x050608, 0.72)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(110);

    this.add
      .text(GAME_WIDTH / 2, 26, 'THE GREAT WORM', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111)
      .setShadow(1, 1, '#000000', 0, true, true);

    this.add
      .rectangle(BOSS_BAR_X, BOSS_BAR_Y, BOSS_BAR_WIDTH, 6, 0x1b1f24, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(111)
      .setStrokeStyle(1, 0x4a515a);

    this.bossBarFill = this.add
      .rectangle(BOSS_BAR_X, BOSS_BAR_Y, BOSS_BAR_WIDTH, 4, 0xc85c5c, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(112);

    this.phasePips = [0, 1, 2].map((index) =>
      this.add
        .rectangle(389 + index * 9, BOSS_BAR_Y, 6, 5, 0x3d454f, 1)
        .setScrollFactor(0)
        .setDepth(112),
    );

    this.phaseText = this.add
      .text(GAME_WIDTH - 8, 26, 'PHASE I', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(111);

    this.attackLabel = this.add
      .text(GAME_WIDTH / 2, 46, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(113);

    this.offscreenMarker = this.add
      .text(0, 68, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: '#e8c170',
        backgroundColor: '#11161b',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(119)
      .setVisible(false);

    this.updateBossHud();
  }

  private createPrompts(): void {
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

    this.victoryPrompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#ffcf5a',
        backgroundColor: '#11161b',
        padding: { x: 3, y: 2 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(170)
      .setVisible(false);
  }

  private showIntro(): void {
    this.state = 'intro';
    this.introActive = true;

    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(180);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050608, 0.68).setOrigin(0);
    const rule = this.add.rectangle(GAME_WIDTH / 2, 104, 230, 1, 0x8a6b32, 0.8);
    const progress = this.add
      .text(GAME_WIDTH / 2, 86, 'BOSS ENCOUNTER', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#c85c5c',
      })
      .setOrigin(0.5);
    const title = this.add
      .text(GAME_WIDTH / 2, 122, 'THE GREAT WORM', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);
    const subtitle = this.add
      .text(GAME_WIDTH / 2, 148, 'AIM FOR THE HEAD. BODY HITS DO NOTHING.', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
        align: 'center',
        wordWrap: { width: 340 },
      })
      .setOrigin(0.5);

    container.add([shade, rule, progress, title, subtitle]);
    this.audio.play('boss-roar');
    this.shakeScreen(650, 0.008);

    this.time.delayedCall(520, () => {
      if (this.victory || this.playerDead) {
        return;
      }

      this.surfaceBossAtHole(1, false);
      this.audio.play('boss-burrow');
      this.spawnDust(BOSS_ARENA.holes[1]?.x ?? BOSS_ARENA.width / 2, BOSS_ARENA.floorY, 10);
      // Frame the reveal cleanly instead of easing in from the spawn edge.
      this.cameras.main.scrollX = Phaser.Math.Clamp(
        this.boss.x - GAME_WIDTH / 2,
        0,
        BOSS_ARENA.width - GAME_WIDTH,
      );
    });

    this.tweens.add({
      targets: container,
      alpha: 0,
      delay: 1500,
      duration: 450,
      onComplete: () => {
        container.destroy(true);
      },
    });

    this.time.delayedCall(2100, () => {
      if (this.victory || this.playerDead || this.restarting) {
        return;
      }

      this.introActive = false;
      this.fightActive = true;
      this.state = 'recovering';
      this.boss.setVulnerable(true);
      this.announce('AIM FOR THE HEAD', '#ffcf5a');
      this.schedule(1300, () => {
        this.startNextAttack();
      });
    });
  }

  private startNextAttack(): void {
    if (
      !this.fightActive ||
      this.introActive ||
      this.victory ||
      this.playerDead ||
      this.restarting ||
      this.state === 'transition'
    ) {
      return;
    }

    if (this.boss.hp <= 0) {
      this.startBossDeath();
      return;
    }

    const phaseFromHp = resolveBossPhase(this.boss.hp, this.boss.maxHp);
    if (phaseFromHp > this.phase) {
      this.beginPhaseTransition(phaseFromHp);
      return;
    }

    const attack = selectBossAttack(this.phase, this.attackIndex);
    this.attackIndex += 1;
    this.currentAttack = attack;
    this.state = 'telegraph';
    this.clearAttackMarkers();
    this.announce(BOSS_ATTACK_NAMES[attack], '#e8c170');

    switch (attack) {
      case 'emerge-bite':
        this.startEmergeBite();
        break;
      case 'rock-spit':
        this.startRockSpit();
        break;
      case 'burrow-charge':
        this.startBurrowCharge();
        break;
      case 'quake':
        this.startQuake();
        break;
      case 'summon-wormlings':
        this.startSummonWormlings();
        break;
    }
  }

  private startEmergeBite(): void {
    const hole = this.surfaceAtAttackHole('emerge-bite');
    this.audio.play('rumble');
    this.shakeScreen(150, 0.004);
    this.addAttackMarker(hole.x, hole.y - 50, '!');

    const token = this.fightToken;
    const telegraphMs = this.telegraphMs('emerge-bite');

    this.schedule(telegraphMs, () => {
      if (token !== this.fightToken) {
        return;
      }

      this.state = 'attacking';
      this.clearAttackMarkers();
      this.audio.play('boss-charge');
      const direction = this.player.x >= this.boss.x ? 1 : -1;
      this.boss.setFacing(direction);

      this.tweens.add({
        targets: this.boss.head,
        x: this.boss.x + direction * 82,
        y: this.boss.y - 6,
        duration: 220,
        hold: 100,
        yoyo: true,
        ease: 'Quad.Out',
        onComplete: () => {
          if (token === this.fightToken) {
            this.finishAttack();
          }
        },
      });
    });
  }

  private startRockSpit(): void {
    this.surfaceAtAttackHole('rock-spit');
    this.audio.play('rumble');
    this.shakeScreen(110, 0.003);

    const token = this.fightToken;
    const count = this.phaseTuning.spitRocks;
    const telegraphMs = this.telegraphMs('rock-spit');

    this.schedule(telegraphMs, () => {
      if (token !== this.fightToken) {
        return;
      }

      this.state = 'attacking';

      for (let index = 0; index < count; index += 1) {
        this.schedule(index * 260, () => {
          if (token === this.fightToken) {
            this.spitRock();
          }
        });
      }

      this.schedule(count * 260 + 180, () => {
        if (token === this.fightToken) {
          this.finishAttack();
        }
      });
    });
  }

  private spitRock(): void {
    const direction = this.player.x >= this.boss.x ? 1 : -1;
    this.boss.setFacing(direction);
    const originX = this.boss.x + direction * 17;
    const originY = this.boss.y - 1;
    const arc = computeAimedArc({
      originX,
      originY,
      targetX: this.player.x,
      targetY: this.player.y - 4,
      speed: 300,
      gravity: 300,
      minFlightTime: 0.45,
      maxFlightTime: 2.4,
      maxRiseSpeed: 420,
    });

    const damage = scaleEnemyDamage(BOSS_ATTACK_TUNING['rock-spit'].baseDamage, this.difficulty);
    const rock = new BossRock(this, originX, originY, arc.velocityX, arc.velocityY, 300, damage);
    this.bossProjectileGroup.add(rock);
    this.audio.play('boss-spit');
    this.spawnDust(originX, originY, 4);
    this.tweens.add({
      targets: this.boss.head,
      x: this.boss.x - direction * 4,
      duration: 80,
      yoyo: true,
    });
  }

  private startBurrowCharge(): void {
    this.boss.setVulnerable(false);
    this.boss.burrow();
    this.state = 'telegraph';
    this.audio.play('boss-burrow');
    this.shakeScreen(340, 0.006);

    const direction = chooseChargeDirection(this.player.x, BOSS_ARENA.width);
    const startX = direction === 1 ? 24 : BOSS_ARENA.width - 24;
    const endX = direction === 1 ? BOSS_ARENA.width - 24 : 24;
    this.chargeDirection = direction;
    this.chargeX = startX;
    this.chargeEndX = endX;
    this.drawChargeWarnings();
    this.announce('BURROW CHARGE - JUMP', '#e74c3c');

    const token = this.fightToken;
    this.schedule(this.telegraphMs('burrow-charge'), () => {
      if (token !== this.fightToken) {
        return;
      }

      this.clearChargeWarnings();
      this.state = 'attacking';
      this.charging = true;
      this.chargeX = startX;
      this.chargeDustAccumulator = 0;
      this.boss.surfaceAt(
        startX,
        BOSS_ARENA.floorY - 22,
        direction,
        startX - direction * 45,
        BOSS_ARENA.floorY + 8,
      );
      this.boss.setVulnerable(true);
      this.audio.play('boss-charge');
    });
  }

  private updateCharge(delta: number): void {
    if (!this.charging) {
      return;
    }

    const step = this.chargeDirection * 700 * (Math.min(delta, 50) / 1000);
    this.chargeX += step;
    this.boss.head.setPosition(this.chargeX, BOSS_ARENA.floorY - 22);
    this.boss.setFacing(this.chargeDirection);

    this.chargeDustAccumulator += delta;
    if (this.chargeDustAccumulator >= 75) {
      this.chargeDustAccumulator = 0;
      this.spawnDust(this.boss.x, BOSS_ARENA.floorY - 2, 3);
    }

    const reachedEnd =
      this.chargeDirection === 1
        ? this.chargeX >= this.chargeEndX
        : this.chargeX <= this.chargeEndX;

    if (reachedEnd) {
      this.endCharge();
    }
  }

  private endCharge(): void {
    this.charging = false;
    this.boss.burrow();
    this.audio.play('boss-burrow');
    this.shakeScreen(180, 0.007);
    this.spawnDust(this.chargeEndX, BOSS_ARENA.floorY, 8);
    const token = this.fightToken;
    const endX = this.chargeEndX;

    this.schedule(520, () => {
      if (token !== this.fightToken) {
        return;
      }

      const holeIndex = nearestHoleIndex(endX, BOSS_ARENA.holes);
      const hole = this.surfaceBossAtHole(holeIndex, true);
      this.spawnDust(hole.x, BOSS_ARENA.floorY, 8);
      this.audio.play('rumble');
      this.state = 'recovering';
      this.showFloatingText(hole.x, BOSS_ARENA.floorY - 66, 'STUNNED', '#ffcf5a');
      this.finishAttack();
    });
  }

  private startQuake(): void {
    const hole = this.surfaceAtAttackHole('quake');
    this.audio.play('boss-quake');
    this.shakeScreen(400, 0.005);
    this.announce('QUAKE - JUMP THE WAVES', '#e74c3c');

    const token = this.fightToken;
    this.schedule(this.telegraphMs('quake'), () => {
      if (token !== this.fightToken) {
        return;
      }

      this.state = 'attacking';
      this.audio.play('boss-quake');
      this.shakeScreen(420, 0.01);
      this.spawnDust(hole.x, BOSS_ARENA.floorY, 12);

      this.tweens.add({
        targets: this.boss.head,
        y: BOSS_ARENA.floorY - 18,
        duration: 130,
        hold: 60,
        yoyo: true,
        ease: 'Quad.In',
        onComplete: () => {
          if (token === this.fightToken) {
            this.finishAttack();
          }
        },
      });

      this.schedule(160, () => {
        if (token === this.fightToken) {
          this.spawnShockwaves(hole.x);
        }
      });

      this.schedule(480, () => {
        if (token === this.fightToken) {
          this.spawnCeilingRocks();
        }
      });
    });
  }

  private startSummonWormlings(): void {
    const hole = this.surfaceAtAttackHole('summon-wormlings');
    this.audio.play('boss-summon');
    this.shakeScreen(260, 0.004);
    this.announce('SUMMON WORMLINGS', '#c85c5c');

    const token = this.fightToken;
    this.schedule(this.telegraphMs('summon-wormlings'), () => {
      if (token !== this.fightToken) {
        return;
      }

      this.state = 'attacking';
      this.audio.play('boss-roar');
      this.shakeScreen(260, 0.005);
      this.spawnDust(hole.x, BOSS_ARENA.floorY, 12);

      const tuning = this.phaseTuning;
      const available = Math.max(0, tuning.maxWormlings - this.countAliveWormlings());
      const spawnCount = Math.min(available, tuning.summonCount);

      for (let index = 0; index < spawnCount; index += 1) {
        const holeIndex = index % 2 === 0 ? 0 : 2;
        this.spawnWormling(holeIndex, index);
      }

      this.schedule(550, () => {
        if (token === this.fightToken) {
          this.finishAttack();
        }
      });
    });
  }

  private finishAttack(recoveryMs = this.phaseTuning.recoveryMs): void {
    if (!this.fightActive || this.victory || this.playerDead || this.restarting) {
      return;
    }

    this.state = 'recovering';
    this.boss.setVulnerable(true);
    this.schedule(recoveryMs, () => {
      if (!this.fightActive || this.victory || this.playerDead || this.restarting) {
        return;
      }

      this.boss.setVulnerable(false);
      this.boss.burrow();
      this.audio.play('boss-burrow');
      this.state = 'idle';
      this.schedule(560, () => {
        this.startNextAttack();
      });
    });
  }

  private surfaceAtAttackHole(attack: BossAttack): BossHole {
    const index = chooseHoleForAttack(attack, this.player.x, BOSS_ARENA.holes);
    return this.surfaceBossAtHole(index, true);
  }

  private surfaceBossAtHole(index: number, vulnerable: boolean): BossHole {
    const hole = BOSS_ARENA.holes[index] ??
      BOSS_ARENA.holes[1] ?? {
        x: BOSS_ARENA.width / 2,
        y: BOSS_ARENA.floorY,
      };
    const facing = this.player.x >= hole.x ? 1 : -1;
    this.boss.surfaceAt(
      hole.x,
      BOSS_ARENA.floorY - BOSS_DEFINITION.headSurfaceOffset,
      facing,
      hole.x,
      BOSS_ARENA.floorY + 12,
    );
    this.boss.setVulnerable(vulnerable);
    return hole;
  }

  private telegraphMs(attack: BossAttack): number {
    return Math.round(BOSS_ATTACK_TUNING[attack].telegraphMs * this.phaseTuning.telegraphScale);
  }

  private get phaseTuning(): (typeof BOSS_PHASE_TUNING)[BossPhase] {
    return BOSS_PHASE_TUNING[this.phase];
  }

  private beginPhaseTransition(nextPhase: BossPhase): void {
    if (this.victory || this.playerDead || this.state === 'transition' || nextPhase <= this.phase) {
      return;
    }

    this.phase = nextPhase;
    this.boss.setPhase(nextPhase);
    this.attackIndex = 0;
    this.fightToken += 1;
    this.state = 'transition';
    this.currentAttack = null;
    this.charging = false;
    this.clearChargeWarnings();
    this.clearAttackMarkers();
    this.destroyHostiles();
    this.tweens.killTweensOf(this.boss.head);
    this.boss.setVulnerable(false);
    this.boss.burrow();
    this.boss.hp = Math.max(1, this.boss.hp);
    this.updateBossHud();
    this.spawnSupplyPedestals(nextPhase);
    this.audio.play('boss-phase');
    this.audio.play('boss-roar');
    this.shakeScreen(650, 0.011);
    this.cameras.main.flash(220, 120, 30, 30);
    this.showPhaseBanner(nextPhase);

    this.schedule(1850, () => {
      if (this.victory || this.playerDead || this.restarting) {
        return;
      }

      this.surfaceBossAtHole(1, true);
      this.audio.play('rumble');
      this.state = 'recovering';
      this.announce('SUPPLIES DROPPED - PRESS E', '#f4d35e');
      this.schedule(1250, () => {
        this.startNextAttack();
      });
    });
  }

  private showPhaseBanner(phase: BossPhase): void {
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(185);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050608, 0.35).setOrigin(0);
    const rule = this.add.rectangle(GAME_WIDTH / 2, 108, 220, 1, 0xc85c5c, 0.85);
    const label = this.add
      .text(GAME_WIDTH / 2, 128, BOSS_PHASE_NAMES[phase], {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);
    const subtitle = this.add
      .text(GAME_WIDTH / 2, 152, phase === 3 ? 'NO MORE HIDING.' : 'THE WORM IS ENRAGED.', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#c85c5c',
      })
      .setOrigin(0.5);

    container.add([shade, rule, label, subtitle]);
    this.tweens.add({
      targets: container,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => {
        container.destroy(true);
      },
    });
  }

  private spawnSupplyPedestals(phase: BossPhase): void {
    if (phase < 2 || this.supplyPhase >= phase) {
      return;
    }

    const supplyPhase = phase as 2 | 3;
    this.supplyPhase = supplyPhase;
    const items = BOSS_SUPPLIES[supplyPhase];

    items.forEach((itemId, index) => {
      const spot = BOSS_ARENA.supplySpots[index];

      if (spot) {
        this.createPedestal(spot.x, spot.y, itemId);
      }
    });

    this.audio.play('pickup');
  }

  private createPedestal(x: number, y: number, itemId: PickupId): void {
    const base = this.add.rectangle(x, y + 3, 14, 6, 0x4a3320, 1).setDepth(7);
    const top = this.add.rectangle(x, y, 14, 2, 0x8a5f3a, 1).setDepth(8);
    const glow = this.add.ellipse(x, y - 8, 20, 10, 0xffcf5a, 0.12).setDepth(9);
    this.tweens.add({
      targets: glow,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const icon = this.add
      .image(x, y - 8, pickupTextureKey(itemId))
      .setDepth(13)
      .setScale(0.4);
    icon.setAlpha(0.2);
    this.tweens.add({
      targets: icon,
      y: y - 12,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 420,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets: icon,
      y: y - 14,
      delay: 450,
      duration: 700,
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

  private drawChargeWarnings(): void {
    this.clearChargeWarnings();

    for (let x = 20; x < BOSS_ARENA.width - 16; x += 38) {
      const warning = this.add
        .rectangle(x, BOSS_ARENA.floorY - 2, 18, 2, 0xe74c3c, 0.35)
        .setOrigin(0)
        .setDepth(10);
      this.chargeWarnings.push(warning);
      this.tweens.add({
        targets: warning,
        alpha: 0.9,
        duration: 160,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private clearChargeWarnings(): void {
    this.chargeWarnings.forEach((warning) => {
      this.tweens.killTweensOf(warning);
      warning.destroy();
    });
    this.chargeWarnings = [];
  }

  private addAttackMarker(x: number, y: number, text: string): void {
    const marker = this.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#e74c3c',
        backgroundColor: '#11161b',
        padding: { x: 2, y: 0 },
      })
      .setOrigin(0.5)
      .setDepth(24);
    this.attackMarkers.push(marker);
    this.tweens.add({
      targets: marker,
      y: y - 6,
      duration: 180,
      yoyo: true,
      repeat: -1,
    });
  }

  private clearAttackMarkers(): void {
    this.attackMarkers = this.attackMarkers.filter((marker) => {
      if (!marker.active) {
        return false;
      }

      marker.destroy();
      return false;
    });
  }

  private spawnWormling(holeIndex: number, offsetIndex: number): void {
    const hole = BOSS_ARENA.holes[holeIndex];

    if (!hole) {
      return;
    }

    const x = hole.x + (offsetIndex % 2 === 0 ? -10 : 10);
    const wormling = new Wormling(
      this,
      x,
      BOSS_ARENA.floorY - 6,
      BOSS_WORMLING_HP[this.difficulty.id],
    );
    this.wormlingGroup.add(wormling);
    this.wormlings.push(wormling);
    this.spawnDust(hole.x, BOSS_ARENA.floorY, 8);
    this.audio.play('boss-summon');
  }

  private spawnShockwaves(centerX: number): void {
    const damage = scaleEnemyDamage(BOSS_ATTACK_TUNING.quake.baseDamage - 1, this.difficulty);
    const y = BOSS_ARENA.floorY - 6;

    for (const direction of [-1, 1] as const) {
      const shockwave = new Shockwave(this, centerX + direction * 12, y, direction, damage);
      this.shockwaveGroup.add(shockwave);
    }

    this.audio.play('boss-quake');
    this.spawnDust(centerX, BOSS_ARENA.floorY, 8);
  }

  private spawnCeilingRocks(): void {
    const count = this.phaseTuning.quakeRocks;

    if (count <= 0) {
      return;
    }

    const xs = BOSS_ARENA.ceilingRocks.map((rock) => rock.x);
    xs[0] = Phaser.Math.Clamp(this.player.x, 60, BOSS_ARENA.width - 60);

    for (let index = 0; index < Math.min(count, xs.length); index += 1) {
      const x = xs[index];

      if (x === undefined) {
        continue;
      }

      const shadow = this.add
        .ellipse(
          x,
          BOSS_ARENA.floorY - 2,
          HAZARD_TUNING.fallingRockShadowWidth,
          HAZARD_TUNING.fallingRockShadowHeight,
          0x000000,
          0.55,
        )
        .setDepth(10);
      this.attackMarkers.push(shadow);
      this.tweens.add({
        targets: shadow,
        alpha: 0.16,
        duration: 160,
        yoyo: true,
        repeat: 3,
      });

      this.audio.play('rumble');
      this.schedule(HAZARD_TUNING.fallingRockTelegraphMs, () => {
        if (!this.fightActive || this.victory || this.playerDead) {
          return;
        }

        shadow.destroy();
        const rock = new FallingRock(this, x, 34);
        this.fallingRockGroup.add(rock);
        this.audio.play('boulder');
      });
    }
  }

  private updateWormlings(time: number, delta: number): void {
    const context = {
      playerX: this.player.x,
      playerY: this.player.y,
      playerAlive: !this.player.isDead,
    };

    for (const wormling of this.wormlings) {
      if (wormling.active && !wormling.isDead) {
        wormling.update(time, delta, context);
      }
    }
  }

  private countAliveWormlings(): number {
    return this.wormlings.filter((wormling) => wormling.active && !wormling.isDead).length;
  }

  private destroyHostiles(): void {
    this.bossProjectileGroup.clear(true, true);
    this.fallingRockGroup.clear(true, true);
    this.shockwaveGroup.clear(true, true);
    this.clearChargeWarnings();
    this.clearAttackMarkers();

    for (const wormling of this.wormlings) {
      if (wormling.active) {
        wormling.destroy();
      }
    }

    this.wormlings = [];
  }

  private applyBossHeadHit(amount: number, x: number, y: number): boolean {
    if (
      !this.fightActive ||
      this.introActive ||
      this.victory ||
      this.playerDead ||
      this.restarting
    ) {
      return false;
    }

    const damage = resolveBossPartDamage('head', amount);

    if (damage <= 0) {
      return false;
    }

    const result = this.boss.takeDamage('head', damage, this.time.now);

    if (!result.applied) {
      return false;
    }

    this.bossHeadHits += 1;
    this.updateBossHud();
    this.audio.play('boss-hurt');
    this.spawnHitBurst(x, y, 0xffcf5a, 8);
    this.shakeScreen(110, 0.005);
    this.triggerHitStop();
    this.showFloatingText(this.boss.x, this.boss.y - 24, `-${damage}`, '#ffcf5a');

    if (result.killed) {
      this.startBossDeath();
    } else if (result.phaseChanged) {
      this.beginPhaseTransition(result.phase);
    }

    return true;
  }

  private registerBossDeflect(x: number, y: number): void {
    this.bossBodyHits += 1;
    this.bossDeflects += 1;
    this.audio.play('deflect');
    this.spawnHitBurst(x, y, 0xb8c0c8, 5);
    this.showFloatingText(x, y - 16, 'ARMORED', '#9aa0a6');
  }

  private startBossDeath(): void {
    if (this.victory) {
      return;
    }

    this.victory = true;
    this.fightActive = false;
    this.fightToken += 1;
    this.currentAttack = null;
    this.charging = false;
    this.state = 'dead';
    this.destroyHostiles();
    this.tweens.killTweensOf(this.boss.head);

    if (!this.boss.visible) {
      this.surfaceBossAtHole(1, false);
    }

    this.boss.setVulnerable(false);
    this.boss.hp = 0;
    this.updateBossHud();
    runService.completeBoss();
    this.audio.play('boss-defeat');
    this.shakeScreen(900, 0.014);
    this.cameras.main.flash(320, 120, 25, 20);
    this.physics.world.timeScale = 2.2;
    this.announce('THE GREAT WORM FALLS', '#ffcf5a');
    this.showVictoryBanner();

    this.boss.collapse(() => {
      this.physics.world.timeScale = 1;
      this.state = 'victory';
      this.victory = true;
      this.openExit();
      this.audio.play('boss-victory');
      this.time.delayedCall(5000, () => {
        this.enterResults();
      });
    });
  }

  private showVictoryBanner(): void {
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(175);
    const label = this.add
      .text(GAME_WIDTH / 2, 104, 'THE WORM FALLS', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#ffcf5a',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);
    const subtitle = this.add
      .text(GAME_WIDTH / 2, 126, 'THE MINE IS QUIET. FOR NOW.', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5);

    container.add([label, subtitle]);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 600,
      yoyo: true,
      hold: 2200,
      onComplete: () => {
        container.destroy(true);
      },
    });
  }

  private openExit(): void {
    this.exitOpen = true;
    this.exitBars.forEach((bar) => bar.setAlpha(0.12));
    this.exitGlow?.setAlpha(0.65);
    this.exitLabel?.setText('OPEN').setColor('#ffcf5a');
    this.exitPrompt?.setText('E ASCEND').setVisible(true);
    this.victoryPrompt?.setText('E ASCEND - RUN COMPLETE').setVisible(true);
    this.showFloatingText(
      BOSS_ARENA.exit.x + BOSS_ARENA.exit.width / 2,
      BOSS_ARENA.exit.y - 20,
      'ELEVATOR OPEN',
      '#ffcf5a',
    );
  }

  private updateVictoryInteraction(): void {
    if (!this.exitOpen || this.leaving || this.playerDead) {
      this.exitPrompt?.setVisible(false);
      return;
    }

    const exit = BOSS_ARENA.exit;
    const body = this.player.arcadeBody;
    const inside =
      body.right > exit.x &&
      body.left < exit.x + exit.width &&
      body.bottom > exit.y &&
      body.top < exit.y + exit.height;

    if (this.exitPrompt) {
      this.exitPrompt.setPosition(exit.x + exit.width / 2, exit.y + exit.height / 2);
      this.exitPrompt.setVisible(inside);
    }

    if (this.inputService.isInteractJustPressed()) {
      this.enterResults();
    }
  }

  private enterResults(): void {
    if (this.leaving || !this.exitOpen) {
      return;
    }

    this.leaving = true;
    this.physics.world.timeScale = 1;
    this.audio.play('elevator');
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Results');
    });
  }

  private updateCamera(): void {
    let focusX = this.player.x;

    if (this.exitOpen) {
      focusX = BOSS_ARENA.exit.x + BOSS_ARENA.exit.width / 2;
    } else if (this.introActive && this.boss.visible) {
      // Hold the camera on the reveal before settling into midpoint tracking.
      focusX = this.boss.x;
    } else if (this.boss.visible) {
      focusX = (this.player.x + this.boss.x) / 2;
    }

    const target = Phaser.Math.Clamp(focusX - GAME_WIDTH / 2, 0, BOSS_ARENA.width - GAME_WIDTH);
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, target, 0.075);
    this.cameras.main.scrollY = 0;
  }

  private updateOffscreenMarker(): void {
    if (!this.boss.visible || this.victory || this.introActive) {
      this.offscreenMarker.setVisible(false);
      return;
    }

    const screenX = this.boss.x - this.cameras.main.scrollX;

    if (screenX >= 14 && screenX <= GAME_WIDTH - 14) {
      this.offscreenMarker.setVisible(false);
      return;
    }

    const left = screenX < 0;
    this.offscreenMarker
      .setText(left ? '<< WORM' : 'WORM >>')
      .setPosition(left ? 28 : GAME_WIDTH - 28, 68)
      .setVisible(true);
  }

  private updateBossHud(): void {
    if (!this.boss || !this.bossBarFill) {
      return;
    }

    const ratio = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
    const colors: Record<BossPhase, number> = {
      1: 0xc85c5c,
      2: 0xe07a3f,
      3: 0xe74c3c,
    };

    this.bossBarFill
      .setDisplaySize(Math.max(0, BOSS_BAR_WIDTH * ratio), 4)
      .setFillStyle(colors[this.phase], 1);

    this.phasePips.forEach((pip, index) => {
      pip.setFillStyle(index < this.phase ? colors[this.phase] : 0x3d454f, 1);
    });

    this.phaseText
      .setText(BOSS_PHASE_NAMES[this.phase])
      .setColor(this.phase === 1 ? '#9aa0a6' : '#e8c170');
  }

  private announce(text: string, color: string): void {
    if (!this.attackLabel) {
      return;
    }

    this.tweens.killTweensOf(this.attackLabel);
    this.attackLabel.setText(text).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: this.attackLabel,
      alpha: 0,
      delay: 1500,
      duration: 450,
    });
  }

  private schedule(delayMs: number, callback: () => void): void {
    const token = this.fightToken;
    this.time.delayedCall(delayMs, () => {
      if (
        token !== this.fightToken ||
        !this.scene.isActive() ||
        this.restarting ||
        this.playerDead ||
        this.victory
      ) {
        return;
      }

      callback();
    });
  }

  private updatePedestalInteraction(): void {
    const nearby = this.findNearbyPedestal();

    if (this.interactPrompt) {
      if (nearby && !this.player.isDead && !this.restarting && !this.victory) {
        this.interactPrompt.setPosition(nearby.x, nearby.y - 22).setVisible(true);
      } else {
        this.interactPrompt.setVisible(false);
      }
    }

    if (!nearby || this.player.isDead || this.restarting || this.victory) {
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

  private recordPickup(itemId: PickupId): void {
    runService.recordPickup();

    if (itemId === ORE.id) {
      runService.recordOre(ORE.value);
    }
  }

  private handlePlayerThrow(launch: ProjectileLaunch): void {
    if (this.restarting || this.victory || this.playerDead) {
      return;
    }

    const rock = new Rock(this, launch);
    this.rockGroup.add(rock);
    this.rocksThrown += 1;
    this.audio.play('throw');
    this.spawnHitBurst(launch.x, launch.y, 0xc9a227, 3);
  }

  private handlePlayerItemUse(use: PlayerItemUse): void {
    if (this.restarting || this.victory || this.playerDead) {
      return;
    }

    const projectile = new ItemProjectile(this, use.itemId, use.launch);
    this.itemProjectileGroup.add(projectile);
    this.itemsUsed += 1;
    runService.recordItemUse();

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
    if (!this.restarting && !this.victory) {
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

  private handleRockHitBoss(rockObject: ColliderTarget, bossObject: ColliderTarget): void {
    const rock = rockObject as Rock;

    if (!rock.active || !this.boss.visible) {
      return;
    }

    const part = (bossObject as Phaser.GameObjects.GameObject).getData('bossPart') as
      BossPart | undefined;

    if (part === 'body') {
      this.registerBossDeflect(this.boss.x, this.boss.y);
    } else if (part === 'head') {
      this.applyBossHeadHit(ROCK_TUNING.damage, rock.x, rock.y);
    }

    rock.destroy();
  }

  private handleItemProjectileHitBoss(
    projectileObject: ColliderTarget,
    bossObject: ColliderTarget,
  ): void {
    const projectile = projectileObject as ItemProjectile;

    if (!projectile.active || !this.boss.visible) {
      return;
    }

    if (projectile.itemId === 'rune-scroll') {
      this.explodeRune(projectile);
      projectile.destroy();
      return;
    }

    const part = (bossObject as Phaser.GameObjects.GameObject).getData('bossPart') as
      BossPart | undefined;

    if (part === 'body') {
      this.registerBossDeflect(this.boss.x, this.boss.y);
    } else if (part === 'head') {
      this.applyBossHeadHit(projectile.definition.damage, projectile.x, projectile.y);
    }

    projectile.destroy();
  }

  private handleRockHitWormling(rockObject: ColliderTarget, wormlingObject: ColliderTarget): void {
    const rock = rockObject as Rock;
    const wormling = wormlingObject as Wormling;

    if (!rock.active || !wormling.active || wormling.isDead) {
      return;
    }

    const event: DamageEvent = {
      amount: ROCK_TUNING.damage,
      source: 'rock',
      sourceX: rock.x,
      sourceY: rock.y,
      impactVx: rock.arcadeBody.velocity.x,
    };
    const result = wormling.takeDamage(event);
    this.playEnemyHitFeedback(result, wormling.x, wormling.y, 0xb8c0c8);

    if (result.killed) {
      runService.recordKill();
    }

    rock.destroy();
  }

  private handleItemProjectileHitWormling(
    projectileObject: ColliderTarget,
    wormlingObject: ColliderTarget,
  ): void {
    const projectile = projectileObject as ItemProjectile;
    const wormling = wormlingObject as Wormling;

    if (!projectile.active || !wormling.active || wormling.isDead) {
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
    const result = wormling.takeDamage(event);
    const color = projectile.itemId === 'flintlock' ? 0xffcf5a : 0xd8dde3;
    this.playEnemyHitFeedback(result, projectile.x, projectile.y, color);

    if (result.killed) {
      runService.recordKill();
    }

    projectile.destroy();
  }

  private playEnemyHitFeedback(result: EnemyHitResult, x: number, y: number, color: number): void {
    if (result.deflected) {
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

  private handlePlayerEnemyContact(enemy: Enemy): void {
    if (!enemy.active || enemy.isDead || this.player.isDead) {
      return;
    }

    const damage = scaleEnemyDamage(enemy.contactDamage, this.difficulty);
    this.player.takeDamage(damage, enemy.x, 'enemy');
  }

  private handlePlayerWormlingContact(
    _playerObject: ColliderTarget,
    wormlingObject: ColliderTarget,
  ): void {
    this.handlePlayerEnemyContact(wormlingObject as Wormling);
  }

  private handlePlayerBossContact(): void {
    if (
      !this.fightActive ||
      this.introActive ||
      this.victory ||
      this.playerDead ||
      !this.boss.visible
    ) {
      return;
    }

    const damage = scaleEnemyDamage(BOSS_ATTACK_TUNING['emerge-bite'].baseDamage, this.difficulty);
    this.player.takeDamage(damage, this.boss.x, 'enemy');
  }

  private handleBossProjectileHitPlayer(
    _playerObject: ColliderTarget,
    projectileObject: ColliderTarget,
  ): void {
    const projectile = projectileObject as BossRock;

    if (!projectile.active || this.player.isDead) {
      return;
    }

    this.player.takeDamage(projectile.damage, projectile.x, 'enemy');
    this.spawnHitBurst(projectile.x, projectile.y, 0x8b7d6b, 4);
    projectile.destroy();
  }

  private handleBossProjectileBreak(projectileObject: ColliderTarget): void {
    const projectile = projectileObject as BossRock;

    if (!projectile.active) {
      return;
    }

    this.spawnHitBurst(projectile.x, projectile.y, 0x8b7d6b, 4);
    projectile.destroy();
  }

  private handleShockwaveHitPlayer(
    _playerObject: ColliderTarget,
    waveObject: ColliderTarget,
  ): void {
    const wave = waveObject as Shockwave;

    if (!wave.active || this.player.isDead) {
      return;
    }

    this.player.takeDamage(wave.damage, wave.x, 'hazard');
    this.spawnHitBurst(wave.x, wave.y, 0xffcf5a, 4);
    wave.destroy();
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

  private handleFallingRockImpact(rockObject: ColliderTarget): void {
    const rock = rockObject as FallingRock;

    if (!rock.active) {
      return;
    }

    this.spawnHitBurst(rock.x, rock.y, 0x8b7d6b, 7);
    this.shakeScreen(100, 0.004);
    this.audio.play('boulder');
    rock.destroy();
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

  private explodeRune(projectile: ItemProjectile): void {
    const definition = projectile.definition;
    const { x, y } = projectile;

    this.audio.play('rune-blast');
    this.shakeScreen(150, 0.008);
    this.spawnExplosion(x, y, definition.explosionRadius);

    if (
      this.boss.visible &&
      Phaser.Math.Distance.Between(x, y, this.boss.x, this.boss.y) <= definition.explosionRadius
    ) {
      this.applyBossHeadHit(definition.damage, this.boss.x, this.boss.y);
    }

    let damagedAny = false;
    let killedAny = false;

    for (const wormling of this.wormlings) {
      if (!wormling.active || wormling.isDead) {
        continue;
      }

      if (Phaser.Math.Distance.Between(x, y, wormling.x, wormling.y) > definition.explosionRadius) {
        continue;
      }

      const result = wormling.takeDamage({
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
        runService.recordKill();
      }

      this.spawnHitBurst(wormling.x, wormling.y, 0x6fe3c4, 5);
      if (!result.killed) {
        wormling.stun(definition.stunMs);
      }
    }

    if (damagedAny) {
      this.audio.play(killedAny ? 'enemy-down' : 'hit');
      this.triggerHitStop();
    }
  }

  private handlePlayerDamaged(event: PlayerDamageEvent): void {
    runService.recordDamage(event.amount);
    this.audio.play('hurt');
    this.shakeScreen(FEEDBACK_TUNING.screenShakeMs, FEEDBACK_TUNING.screenShakeIntensity);
    this.spawnHitBurst(this.player.x, this.player.y, 0xff6b6b, FEEDBACK_TUNING.hitParticles);

    if (event.hp > 0) {
      this.triggerHitStop();
    }
  }

  private handlePlayerDied(): void {
    if (this.victory || this.restarting) {
      return;
    }

    this.playerDead = true;
    this.fightToken += 1;
    this.fightActive = false;
    this.currentAttack = null;
    this.charging = false;
    this.state = 'dead';
    this.boss.setVulnerable(false);
    this.boss.burrow();
    this.tweens.killTweensOf(this.boss.head);
    this.destroyHostiles();
    runService.recordDeath();
    this.audio.play('death');
    this.shakeScreen(220, 0.01);

    this.time.delayedCall(1400, () => {
      this.restartBoss();
    });
  }

  public closePause(): void {
    this.pauseOpen = false;
  }

  public restartFromPause(): void {
    this.closePause();
    this.restartBoss();
  }

  private restartBoss(): void {
    if (this.restarting) {
      return;
    }

    this.restarting = true;
    this.physics.world.timeScale = 1;
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({
        difficultyId: this.difficulty.id,
        carry: this.entryCarry ?? undefined,
        refillHp: true,
      });
    });
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
    if (this.pauseOpen || this.leaving || this.restarting || this.player.isDead || this.victory) {
      return;
    }

    this.pauseOpen = true;
    this.scene.launch('Pause', {
      sceneKey: 'Boss',
      levelName: BOSS_DEFINITION.name,
      levelNumber: 5,
      levelCount: 5,
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
      .text(6, 72, '', {
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

    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.F3,
      Phaser.Input.Keyboard.KeyCodes.F4,
      Phaser.Input.Keyboard.KeyCodes.F6,
    ]);
    keyboard.on('keydown-F3', this.toggleDebug, this);
    keyboard.on('keydown-F4', this.debugSkipPhase, this);
    keyboard.on('keydown-F6', this.debugDefeatBoss, this);

    window.__MINES_DEBUG__ = {
      hitBoss: (part, amount = 1) => this.debugHitBoss(part, amount),
      skipBossPhase: () => this.debugSkipPhase(),
      defeatBoss: () => this.debugDefeatBoss(),
      defeatPlayer: () => this.debugDefeatPlayer(),
      damagePlayer: (amount = 1) => this.debugDamagePlayer(amount),
      healPlayer: () => this.debugHealPlayer(),
    };

    this.events.once('shutdown', () => {
      keyboard.off('keydown-F3', this.toggleDebug, this);
      keyboard.off('keydown-F4', this.debugSkipPhase, this);
      keyboard.off('keydown-F6', this.debugDefeatBoss, this);
      delete window.__MINES_DEBUG__;
    });
  }

  private debugHitBoss(part: BossPart, amount: number): boolean {
    if (!import.meta.env.DEV || this.victory || this.playerDead) {
      return false;
    }

    if (part === 'body') {
      this.registerBossDeflect(this.boss.x, this.boss.y);
      return false;
    }

    return this.applyBossHeadHit(Math.max(1, amount), this.boss.x, this.boss.y);
  }

  private debugSkipPhase(): void {
    if (
      !import.meta.env.DEV ||
      !this.fightActive ||
      this.victory ||
      this.playerDead ||
      this.state === 'transition' ||
      this.state === 'intro'
    ) {
      return;
    }

    const nextPhase = Math.min(3, this.phase + 1) as BossPhase;

    if (nextPhase === this.phase) {
      this.boss.hp = Math.max(1, Math.floor(this.boss.maxHp * 0.2));
      this.updateBossHud();
      return;
    }

    this.boss.hp = Math.max(1, Math.floor(this.boss.maxHp * (nextPhase === 2 ? 0.6 : 0.25)));
    this.beginPhaseTransition(nextPhase);
  }

  private debugDefeatBoss(): void {
    if (!import.meta.env.DEV || this.victory || this.playerDead) {
      return;
    }

    this.boss.hp = 0;
    this.updateBossHud();
    this.startBossDeath();
  }

  private debugDefeatPlayer(): void {
    if (!import.meta.env.DEV || this.victory || this.playerDead || !this.fightActive) {
      return;
    }

    this.player.hp = 0;
    this.player.die();
  }

  private debugDamagePlayer(amount: number): void {
    if (!import.meta.env.DEV || this.victory || this.playerDead || amount <= 0) {
      return;
    }

    this.player.takeDamage(amount, this.player.x + 1, 'hazard');
  }

  private debugHealPlayer(): void {
    if (!import.meta.env.DEV || this.victory || this.playerDead) {
      return;
    }

    this.player.heal(this.player.maxHp);
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

    this.debugText.setText([
      `FPS ${Math.round(this.game.loop.actualFps)}  BOSS ${this.boss.hp}/${this.boss.maxHp}  PHASE ${this.phase}  STATE ${this.state}  ATTACK ${this.currentAttack ?? '-'}`,
      `HEAD ${Math.round(this.boss.x)},${Math.round(this.boss.y)}  VULN ${this.boss.isVulnerable}  HEADHITS ${this.bossHeadHits}  BODYHITS ${this.bossBodyHits}`,
      `WORMLINGS ${this.countAliveWormlings()}  ROCKS ${this.countActive(this.bossProjectileGroup)}  WAVES ${this.countActive(this.shockwaveGroup)}  FALLING ${this.countActive(this.fallingRockGroup)}  SUPPLIES ${this.pedestals.filter((pedestal) => !pedestal.claimed).length}`,
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
      if (this.physics.world && !this.restarting) {
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

  private spawnDust(x: number, y: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const offset = (index - count / 2) * 3;
      const particle = this.add.rectangle(x + offset, y - 2, 2, 2, 0x8b7d6b, 0.85).setDepth(12);

      this.tweens.add({
        targets: particle,
        x: x + offset * 1.6,
        y: y - 8 - (index % 3) * 4,
        alpha: 0,
        duration: 320 + (index % 3) * 60,
        onComplete: () => {
          particle.destroy();
        },
      });
    }
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

  private countActive(group: Phaser.GameObjects.Group): number {
    return group.getChildren().filter((child) => child.active).length;
  }

  private handleShutdown(): void {
    this.player.off('player-throw', this.handlePlayerThrow, this);
    this.player.off('player-item-use', this.handlePlayerItemUse, this);
    this.player.off('player-item-empty', this.handlePlayerItemEmpty, this);
    this.player.off('player-jumped', this.handlePlayerJumped, this);
    this.player.off('player-landed', this.handlePlayerLanded, this);
    this.player.off('player-damaged', this.handlePlayerDamaged, this);
    this.player.off('player-died', this.handlePlayerDied, this);
    this.inputService.destroy();
    this.scene.stop('HUD');

    // Scene shutdown tears down the physics plugin before this callback in
    // Phaser 4, so never assume the shared world is still available.
    const world = this.physics.world;

    if (world) {
      world.timeScale = 1;

      if (this.hitStopActive) {
        world.resume();
      }
    }

    if (import.meta.env.DEV) {
      delete window.__MINES_DEBUG__;
    }
  }

  private publishTestHook(): void {
    if (!this.player || !this.boss) {
      return;
    }

    const body = this.player.arcadeBody;
    const run = runService.snapshot;
    const aliveWormlings = this.wormlings.filter((wormling) => wormling.active && !wormling.isDead);

    setTestHook({
      ready: true,
      scene: 'Boss',
      levelId: BOSS_DEFINITION.id,
      levelNumber: 5,
      levelCount: 5,
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
      enemyCount: aliveWormlings.length,
      dead: this.player.isDead,
      fps: Math.round(this.game.loop.actualFps),
      frameCount: this.frameCount,
      debug: this.debugEnabled,
      enemies: aliveWormlings.map((enemy) => ({
        type: enemy.enemyId,
        hp: enemy.hp,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        facing: enemy.facing,
        phase: enemy.attackPhase,
        stunned: enemy.isStunned,
      })),
      bossHp: this.boss.hp,
      bossMaxHp: this.boss.maxHp,
      bossPhase: this.phase,
      bossState: this.state,
      bossAttack: this.currentAttack,
      bossVulnerable: this.boss.isVulnerable,
      bossHeadX: Math.round(this.boss.x),
      bossHeadY: Math.round(this.boss.y),
      bossHeadHits: this.bossHeadHits,
      bossBodyHits: this.bossBodyHits,
      bossDeflects: this.bossDeflects,
      bossWormlings: aliveWormlings.length,
      bossProjectiles: this.countActive(this.bossProjectileGroup),
      bossShockwaves: this.countActive(this.shockwaveGroup),
      bossFallingRocks: this.countActive(this.fallingRockGroup),
      bossSupplies: this.pedestals.filter((pedestal) => !pedestal.claimed).length,
      bossExitOpen: this.exitOpen,
      bossVictorySequence: this.victory,
      runActive: run.active,
      runKills: run.kills,
      runDamageTaken: run.damageTaken,
      runDeaths: run.deaths,
      runItemUses: run.itemUses,
      runOre: run.oreCollected,
      runItemsPickedUp: run.itemsPickedUp,
      runLevelsCompleted: run.levelsCompleted,
      runBossAttempts: run.bossAttempts,
      runBossDefeated: run.bossDefeated,
      runOutcome: run.outcome,
      runDurationMs: run.runDurationMs,
      runCompleted: run.outcome === 'victory',
      runTimeMs: runService.elapsedMs(),
    });
  }
}

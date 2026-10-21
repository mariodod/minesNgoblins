import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { SECONDARY_ITEMS } from '../data/items';
import type { Player, PlayerDamageEvent } from '../entities/player';
import type { InventorySnapshot } from '../systems/inventory';

const FONT_FAMILY = '"Courier New", Courier, monospace';

interface HudSceneData {
  levelName: string;
  levelNumber?: number;
  levelCount?: number;
  difficultyName: string;
  player: Player;
}

/**
 * Overlay scene: hearts, ammo indicator, level name, and death feedback.
 */
export class HudScene extends Phaser.Scene {
  private levelName = '';
  private levelNumber = 1;
  private levelCount = 1;
  private difficultyName = '';
  private player!: Player;
  private hearts: Phaser.GameObjects.Image[] = [];
  private itemIcon!: Phaser.GameObjects.Image;
  private itemText!: Phaser.GameObjects.Text;
  private oreText!: Phaser.GameObjects.Text;

  constructor() {
    super('HUD');
  }

  init(data: HudSceneData): void {
    this.levelName = data.levelName;
    this.levelNumber = data.levelNumber ?? 1;
    this.levelCount = data.levelCount ?? 1;
    this.difficultyName = data.difficultyName;
    this.player = data.player;
    this.hearts = [];
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, 20, 0x050608, 0.82).setOrigin(0).setDepth(100);

    for (let index = 0; index < this.player.maxHp; index += 1) {
      const heart = this.add.image(10 + index * 10, 10, 'heart-full').setDepth(101);
      this.hearts.push(heart);
    }

    const ammoX = 10 + this.player.maxHp * 10 + 4;
    this.add.image(ammoX, 10, 'rock').setDepth(101);
    this.add
      .text(ammoX + 6, 6, 'ROCK INF', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#f4d35e',
      })
      .setDepth(101);

    const slotX = ammoX + 44;
    this.add
      .rectangle(slotX, 2, 58, 16, 0x11161b, 0.9)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3d454f)
      .setDepth(101);
    this.itemIcon = this.add
      .image(slotX + 9, 10, 'knife')
      .setDepth(102)
      .setVisible(false);
    this.itemText = this.add
      .text(slotX + 18, 6, 'EMPTY', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
      })
      .setDepth(102);

    const oreX = slotX + 64;
    this.add.image(oreX, 10, 'ore').setDepth(101).setScale(0.8);
    this.oreText = this.add
      .text(oreX + 7, 6, 'ORE 0', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#f2c14e',
      })
      .setDepth(101);

    this.add
      .text(
        GAME_WIDTH - 8,
        10,
        `${this.levelNumber}/${this.levelCount}  ${this.levelName.toUpperCase()}  [${this.difficultyName.toUpperCase()}]`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: '#9aa0a6',
        },
      )
      .setOrigin(1, 0.5)
      .setDepth(101);

    const hint = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 10,
        'A/D MOVE   SPACE JUMP   X THROW   C ITEM   E INTERACT   DOWN+SPACE DROP',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: '#7f8c8d',
        },
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setAlpha(0.85);

    this.time.delayedCall(7000, () => {
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          hint.destroy();
        },
      });
    });

    this.player.on('player-damaged', this.handleDamaged, this);
    this.player.on('player-healed', this.handleHealed, this);
    this.player.on('player-died', this.handleDied, this);
    this.player.on('player-inventory-changed', this.handleInventoryChanged, this);
    this.player.on('player-ore-changed', this.handleOreChanged, this);

    this.updateHearts(this.player.hp);
    this.handleInventoryChanged(this.player.inventory.snapshot);
    this.handleOreChanged(this.player.ore);

    this.events.once('shutdown', () => {
      this.player.off('player-damaged', this.handleDamaged, this);
      this.player.off('player-healed', this.handleHealed, this);
      this.player.off('player-died', this.handleDied, this);
      this.player.off('player-inventory-changed', this.handleInventoryChanged, this);
      this.player.off('player-ore-changed', this.handleOreChanged, this);
    });
  }

  private handleDamaged(event: PlayerDamageEvent): void {
    this.updateHearts(event.hp);
    this.cameras.main.flash(110, 140, 20, 20);
  }

  private handleHealed(hp: number): void {
    this.updateHearts(hp);
    this.cameras.main.flash(110, 30, 120, 60);
  }

  private handleInventoryChanged(snapshot: InventorySnapshot): void {
    if (!snapshot.itemId) {
      this.itemIcon.setVisible(false);
      this.itemText.setText('EMPTY').setColor('#9aa0a6');
      return;
    }

    this.itemIcon.setTexture(SECONDARY_ITEMS[snapshot.itemId].textureKey).setVisible(true);
    this.itemText
      .setText(`${snapshot.uses}/${snapshot.maxUses}`)
      .setColor(snapshot.uses > 0 ? '#f4d35e' : '#e74c3c');
  }

  private handleOreChanged(ore: number): void {
    this.oreText.setText(`ORE ${ore}`);
  }

  private handleDied(): void {
    this.updateHearts(0);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62).setOrigin(0).setDepth(200);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, 'YOU DIED', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#e74c3c',
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8, 'Retrying level...', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5)
      .setDepth(201);
  }

  private updateHearts(hp: number): void {
    this.hearts.forEach((heart, index) => {
      heart.setTexture(index < hp ? 'heart-full' : 'heart-empty');
    });
  }
}

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { PLAYER_TUNING } from '../config/tuning';
import type { Player } from '../entities/player';

const FONT_FAMILY = '"Courier New", Courier, monospace';

interface HudSceneData {
  levelName: string;
  player: Player;
}

/**
 * Overlay scene: hearts, ammo indicator, level name, and death feedback.
 */
export class HudScene extends Phaser.Scene {
  private levelName = '';
  private player!: Player;
  private hearts: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('HUD');
  }

  init(data: HudSceneData): void {
    this.levelName = data.levelName;
    this.player = data.player;
    this.hearts = [];
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, 20, 0x050608, 0.82).setOrigin(0).setDepth(100);

    for (let index = 0; index < PLAYER_TUNING.maxHp; index += 1) {
      const heart = this.add.image(10 + index * 10, 10, 'heart-full').setDepth(101);
      this.hearts.push(heart);
    }

    const ammoX = 10 + PLAYER_TUNING.maxHp * 10 + 4;
    this.add.image(ammoX, 10, 'rock').setDepth(101);
    this.add
      .text(ammoX + 6, 6, 'ROCK', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#f4d35e',
      })
      .setDepth(101);
    this.add.image(ammoX + 30, 10, 'infinity').setDepth(101);

    this.add
      .text(GAME_WIDTH - 8, 10, this.levelName.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
      })
      .setOrigin(1, 0.5)
      .setDepth(101);

    this.player.on('player-damaged', this.handleDamaged, this);
    this.player.on('player-died', this.handleDied, this);

    this.updateHearts(this.player.hp);

    this.events.once('shutdown', () => {
      this.player.off('player-damaged', this.handleDamaged, this);
      this.player.off('player-died', this.handleDied, this);
    });
  }

  private handleDamaged(hp: number): void {
    this.updateHearts(hp);
    this.cameras.main.flash(110, 140, 20, 20);
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

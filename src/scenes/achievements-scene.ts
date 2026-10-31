import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ACHIEVEMENTS } from '../data/achievements';
import type { SaveService } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';
const COLUMN_X = [18, 244] as const;

interface AchievementsSceneData {
  returnScene?: string;
}

export class AchievementsScene extends Phaser.Scene {
  private returnScene = 'Title';

  constructor() {
    super('Achievements');
  }

  init(data: AchievementsSceneData = {}): void {
    this.returnScene = data.returnScene ?? 'Title';
  }

  create(): void {
    const saveService = this.registry.get('saveService') as SaveService;
    const unlockedCount = ACHIEVEMENTS.filter(
      (achievement) => saveService.data.achievements[achievement.id],
    ).length;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0c10, 1).setOrigin(0);
    this.drawBackground();

    this.add
      .text(GAME_WIDTH / 2, 18, 'ACHIEVEMENTS', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#f4d35e',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        36,
        `${unlockedCount}/${ACHIEVEMENTS.length} UNLOCKED   CHALLENGE BADGES AWARD SKINS`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: '#9aa0a6',
        },
      )
      .setOrigin(0.5);

    ACHIEVEMENTS.forEach((achievement, index) => {
      const column = Math.floor(index / 6);
      const row = index % 6;
      const x = COLUMN_X[column] ?? COLUMN_X[0];
      const y = 51 + row * 31;
      const unlocked = Boolean(saveService.data.achievements[achievement.id]);

      this.add
        .rectangle(x, y, 218, 30, unlocked ? 0x252d36 : 0x11161b, 0.9)
        .setOrigin(0)
        .setStrokeStyle(1, unlocked ? 0x9fd8cb : 0x3d454f, 0.9);
      this.add.text(x + 6, y + 2, achievement.name, {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: unlocked ? '#f4d35e' : '#77838c',
      });
      this.add
        .text(x + 212, y + 3, unlocked ? 'UNLOCKED' : 'LOCKED', {
          fontFamily: FONT_FAMILY,
          fontSize: '6px',
          color: unlocked ? '#6fe3c4' : '#5f6b73',
        })
        .setOrigin(1, 0);
      this.add.text(x + 6, y + 11, achievement.description, {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: unlocked ? '#c9d1d9' : '#5f6b73',
        wordWrap: { width: 202 },
      });
    });

    this.add
      .text(GAME_WIDTH / 2, 250, 'ESC / ENTER  BACK', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    setTestHook({
      ready: true,
      scene: 'Achievements',
      achievementCount: unlockedCount,
      message: `${unlockedCount}/${ACHIEVEMENTS.length} achievements unlocked.`,
    });

    this.installInput();
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x10151b, 1);
    graphics.fillTriangle(0, GAME_HEIGHT, 58, 30, 150, GAME_HEIGHT);
    graphics.fillTriangle(340, GAME_HEIGHT, 420, 36, 480, GAME_HEIGHT);
    graphics.fillStyle(0x18120e, 1).fillRect(0, 243, GAME_WIDTH, 27);
    graphics.lineStyle(1, 0x2e343b, 1).lineBetween(0, 243, GAME_WIDTH, 243);
  }

  private installInput(): void {
    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.code === 'Escape' || event.code === 'Enter' || event.code === 'Backspace') {
      event.preventDefault();
      this.scene.stop();
      this.scene.resume(this.returnScene);
    }
  };
}

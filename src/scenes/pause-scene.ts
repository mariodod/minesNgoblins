import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { runService } from '../systems/run-service';
import { setTestHook } from '../utils/test-hooks';
import type { LevelScene } from './level-scene';

const FONT_FAMILY = '"Courier New", Courier, monospace';
const PAUSE_ITEMS = ['Resume', 'Restart Level', 'Options', 'Quit Run'] as const;

interface PauseSceneData {
  levelName?: string;
  levelNumber?: number;
  levelCount?: number;
  difficultyName?: string;
  runTimeMs?: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Run-scoped pause overlay. The Level scene is paused underneath, while this
 * scene owns resume, level restart, settings, and run quit actions.
 */
export class PauseScene extends Phaser.Scene {
  private levelName = '';
  private levelNumber = 1;
  private levelCount = 4;
  private difficultyName = 'Normal';
  private runTimeMs = 0;
  private selectedIndex = 0;
  private mode: 'menu' | 'confirm' = 'menu';
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private confirmText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super('Pause');
  }

  init(data: PauseSceneData): void {
    this.levelName = data.levelName ?? '';
    this.levelNumber = data.levelNumber ?? 1;
    this.levelCount = data.levelCount ?? 4;
    this.difficultyName = data.difficultyName ?? 'Normal';
    this.runTimeMs = data.runTimeMs ?? 0;
    this.selectedIndex = 0;
    this.mode = 'menu';
    this.menuTexts = [];
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020304, 0.74).setOrigin(0).setDepth(0);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 6, 280, 202, 0x10151b, 0.97)
      .setStrokeStyle(1, 0x4a515a, 1)
      .setDepth(1);

    this.add
      .text(GAME_WIDTH / 2, 56, 'PAUSED', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(
        GAME_WIDTH / 2,
        76,
        `${this.levelNumber}/${this.levelCount}  ${this.levelName.toUpperCase()}  [${this.difficultyName.toUpperCase()}]`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: '#9aa0a6',
        },
      )
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 88, `RUN TIME ${formatTime(this.runTimeMs)}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#7f8c8d',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.menuTexts = PAUSE_ITEMS.map((label, index) =>
      this.add
        .text(GAME_WIDTH / 2, 116 + index * 22, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '10px',
          color: '#cfd2d6',
        })
        .setOrigin(0.5)
        .setDepth(2),
    );

    this.confirmText = this.add
      .text(
        GAME_WIDTH / 2,
        148,
        'QUIT THIS RUN?\n\nENTER: QUIT   ESC: CANCEL\n\nProgress since the title will be lost.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '9px',
          color: '#e07a5f',
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(2)
      .setVisible(false);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, 218, 'UP/DOWN SELECT   ENTER CONFIRM   ESC RESUME', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.on(Phaser.Scenes.Events.RESUME, this.publishHook, this);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
      this.events.off(Phaser.Scenes.Events.RESUME, this.publishHook, this);
    });

    this.refresh();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (this.mode === 'confirm') {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.quitRun();
      } else if (event.code === 'Escape' || event.code === 'KeyP') {
        event.preventDefault();
        this.mode = 'menu';
        this.refresh();
      }
      return;
    }

    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        this.select(this.selectedIndex - 1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        this.select(this.selectedIndex + 1);
        break;
      case 'Enter':
      case 'Space':
        event.preventDefault();
        this.activate(this.selectedIndex);
        break;
      case 'Escape':
      case 'KeyP':
        event.preventDefault();
        this.resumeLevel();
        break;
      default:
        break;
    }
  };

  private select(index: number): void {
    const count = PAUSE_ITEMS.length;
    this.selectedIndex = ((index % count) + count) % count;
    this.refresh();
  }

  private activate(index: number): void {
    switch (index) {
      case 0:
        this.resumeLevel();
        break;
      case 1:
        this.restartLevel();
        break;
      case 2:
        this.openSettings();
        break;
      case 3:
        this.mode = 'confirm';
        this.refresh();
        break;
      default:
        break;
    }
  }

  private refresh(): void {
    const inConfirm = this.mode === 'confirm';

    this.menuTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      text.setVisible(!inConfirm);
      text.setText(`${selected ? '> ' : '  '}${PAUSE_ITEMS[index]}`);
      text.setColor(selected ? '#f4d35e' : '#cfd2d6');
    });

    this.confirmText.setVisible(inConfirm);
    this.hintText.setText(
      inConfirm ? 'ENTER QUIT   ESC CANCEL' : 'UP/DOWN SELECT   ENTER CONFIRM   ESC RESUME',
    );

    setTestHook({
      ready: true,
      scene: 'Pause',
      pauseSelection: inConfirm ? 'Confirm Quit' : (PAUSE_ITEMS[this.selectedIndex] ?? 'Resume'),
      message: inConfirm
        ? 'Press Enter to quit the run or Escape to return to the pause menu.'
        : 'Paused. Up and down select, Enter confirms, Escape resumes.',
    });
  }

  private publishHook(): void {
    this.refresh();
  }

  private getLevelScene(): LevelScene {
    return this.scene.get('Level') as LevelScene;
  }

  private resumeLevel(): void {
    this.getLevelScene().closePause();
    this.scene.resume('Level');
    this.scene.stop();
  }

  private restartLevel(): void {
    const level = this.getLevelScene();
    level.closePause();
    this.scene.resume('Level');
    level.restartFromPause();
    this.scene.stop();
  }

  private openSettings(): void {
    this.scene.launch('Settings', { returnScene: 'Pause' });
    this.scene.pause();
  }

  private quitRun(): void {
    runService.endRun();
    this.getLevelScene().closePause();
    this.scene.stop('HUD');
    this.scene.stop('Level');
    this.scene.start('Title', { message: 'Run abandoned. The mine waits.' });
  }
}

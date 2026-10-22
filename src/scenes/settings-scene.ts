import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { AudioService } from '../services/audio-service';
import type { SaveService, ScreenShakeSetting } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';
const SHAKE_ORDER: readonly ScreenShakeSetting[] = ['full', 'reduced', 'off'];
const SETTINGS_ITEMS = ['Master Volume', 'Screen Shake', 'Back'] as const;

interface SettingsSceneData {
  returnScene: string;
}

/**
 * Keyboard-driven settings overlay shared by the title screen and pause menu.
 * Changes are applied immediately and persisted through SaveService.
 */
export class SettingsScene extends Phaser.Scene {
  private returnScene = 'Title';
  private selectedIndex = 0;
  private saveService: SaveService | undefined;
  private audioService: AudioService | undefined;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('Settings');
  }

  init(data: SettingsSceneData): void {
    this.returnScene = data.returnScene ?? 'Title';
    this.selectedIndex = 0;
    this.rowTexts = [];
  }

  create(): void {
    this.saveService = this.registry.get('saveService') as SaveService | undefined;
    this.audioService = this.registry.get('audioService') as AudioService | undefined;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020304, 0.78).setOrigin(0).setDepth(0);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 4, 300, 196, 0x10151b, 0.97)
      .setStrokeStyle(1, 0x4a515a, 1)
      .setDepth(1);

    this.add
      .text(GAME_WIDTH / 2, 52, 'OPTIONS', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(GAME_WIDTH / 2, 70, 'CHANGES SAVE AUTOMATICALLY', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#7f8c8d',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.rowTexts = SETTINGS_ITEMS.map((label, index) =>
      this.add
        .text(GAME_WIDTH / 2, 112 + index * 27, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '10px',
          color: '#cfd2d6',
        })
        .setOrigin(0.5)
        .setDepth(2),
    );

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 202, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9fd8cb',
        align: 'center',
        wordWrap: { width: 268 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 228, 'UP/DOWN SELECT   LEFT/RIGHT CHANGE   ESC BACK', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
    });

    this.refresh();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
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
      case 'ArrowLeft':
      case 'KeyA':
        event.preventDefault();
        this.adjust(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        event.preventDefault();
        this.adjust(1);
        break;
      case 'Enter':
      case 'Space':
        event.preventDefault();
        if (this.selectedIndex === SETTINGS_ITEMS.length - 1) {
          this.close();
        } else {
          this.adjust(1);
        }
        break;
      case 'Escape':
      case 'KeyP':
        event.preventDefault();
        this.close();
        break;
      default:
        break;
    }
  };

  private select(index: number): void {
    const count = SETTINGS_ITEMS.length;
    this.selectedIndex = ((index % count) + count) % count;
    this.refresh();
  }

  private adjust(direction: number): void {
    if (!this.saveService) {
      return;
    }

    if (this.selectedIndex === 0) {
      const next = clampStep(this.saveService.settings.masterVolume + direction * 0.1);
      this.saveService.updateSettings({ masterVolume: next });
      this.audioService?.setVolume(next);
      this.statusText.setText(`Master volume ${Math.round(next * 100)}%.`);
    } else if (this.selectedIndex === 1) {
      const current = this.saveService.settings.screenShake;
      const currentIndex = SHAKE_ORDER.indexOf(current);
      const nextIndex =
        (((currentIndex + direction) % SHAKE_ORDER.length) + SHAKE_ORDER.length) %
        SHAKE_ORDER.length;
      const next = SHAKE_ORDER[nextIndex] ?? 'full';
      this.saveService.updateSettings({ screenShake: next });
      this.statusText.setText(`Screen shake ${next}.`);
    }

    this.refresh();
  }

  private refresh(): void {
    const settings = this.saveService?.settings;
    const volume = Math.round((settings?.masterVolume ?? 0.8) * 100);
    const shake = settings?.screenShake ?? 'full';

    this.rowTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      const prefix = selected ? '> ' : '  ';

      if (index === 0) {
        text.setText(`${prefix}MASTER VOLUME   < ${volume}% >`);
      } else if (index === 1) {
        text.setText(`${prefix}SCREEN SHAKE    < ${shake.toUpperCase()} >`);
      } else {
        text.setText(`${prefix}BACK`);
      }

      text.setColor(selected ? '#f4d35e' : '#cfd2d6');
    });

    if (!this.statusText.text) {
      this.statusText.setText('Audio and screen effects update immediately.');
    }

    setTestHook({
      ready: true,
      scene: 'Settings',
      settingsSelection: SETTINGS_ITEMS[this.selectedIndex] ?? 'Master Volume',
      masterVolume: settings?.masterVolume ?? 0.8,
      screenShake: settings?.screenShake ?? 'full',
      message: this.statusText.text,
    });
  }

  private close(): void {
    this.scene.resume(this.returnScene);
    this.scene.stop();
  }
}

function clampStep(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10) / 10;
}

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { AudioService } from '../services/audio-service';
import type {
  FlashIntensitySetting,
  SaveService,
  ScreenShakeSetting,
} from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';
const SHAKE_ORDER: readonly ScreenShakeSetting[] = ['full', 'reduced', 'off'];
const FLASH_ORDER: readonly FlashIntensitySetting[] = ['full', 'reduced', 'off'];
const SETTINGS_ITEMS = [
  'Master Volume',
  'Music Volume',
  'Sfx Volume',
  'Mute',
  'Screen Shake',
  'Flash Intensity',
  'Fullscreen',
  'Controls',
  'Back',
] as const;

const ROW_START_Y = 66;
const ROW_SPACING = 20;
const BACK_INDEX = SETTINGS_ITEMS.length - 1;

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
  private ignoreKeysUntil = 0;

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
      .rectangle(GAME_WIDTH / 2, 140, 356, 250, 0x10151b, 0.97)
      .setStrokeStyle(1, 0x4a515a, 1)
      .setDepth(1);

    this.add
      .text(GAME_WIDTH / 2, 34, 'OPTIONS', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(GAME_WIDTH / 2, 50, 'CHANGES SAVE AUTOMATICALLY', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#7f8c8d',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.rowTexts = SETTINGS_ITEMS.map((label, index) =>
      this.add
        .text(GAME_WIDTH / 2, ROW_START_Y + index * ROW_SPACING, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '14px',
          color: '#cfd2d6',
        })
        .setOrigin(0.5)
        .setDepth(2),
    );

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 246, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9fd8cb',
        align: 'center',
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 259, 'UP/DOWN SELECT   LEFT/RIGHT CHANGE   ESC BACK', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.scale.on('enterfullscreen', this.refresh, this);
    this.scale.on('leavefullscreen', this.refresh, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
      this.scale.off('enterfullscreen', this.refresh, this);
      this.scale.off('leavefullscreen', this.refresh, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    });

    this.refresh();
  }

  private readonly handleResume = (): void => {
    // The key press that closed the Controls screen also wakes this scene.
    // Ignore the tail of that press so it cannot close Options as well.
    this.ignoreKeysUntil = Date.now() + 100;
    this.statusText.setText('');
    this.refresh();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || Date.now() < this.ignoreKeysUntil) {
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
        this.activate();
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

  private activate(): void {
    if (this.selectedIndex === BACK_INDEX) {
      this.close();
    } else if (SETTINGS_ITEMS[this.selectedIndex] === 'Fullscreen') {
      this.toggleFullscreen();
    } else if (SETTINGS_ITEMS[this.selectedIndex] === 'Controls') {
      this.openControls();
    } else {
      this.adjust(1);
    }
  }

  private adjust(direction: number): void {
    if (!this.saveService) {
      return;
    }

    const settings = this.saveService.settings;

    switch (this.selectedIndex) {
      case 0: {
        const next = clampStep(settings.masterVolume + direction * 0.1);
        this.saveService.updateSettings({ masterVolume: next });
        this.audioService?.setMasterVolume(next);
        this.statusText.setText(`Master volume ${Math.round(next * 100)}%.`);
        break;
      }
      case 1: {
        const next = clampStep(settings.musicVolume + direction * 0.1);
        this.saveService.updateSettings({ musicVolume: next });
        this.audioService?.setMusicVolume(next);
        this.statusText.setText(`Music volume ${Math.round(next * 100)}%.`);
        break;
      }
      case 2: {
        const next = clampStep(settings.sfxVolume + direction * 0.1);
        this.saveService.updateSettings({ sfxVolume: next });
        this.audioService?.setSfxVolume(next);
        this.statusText.setText(`Effects volume ${Math.round(next * 100)}%.`);
        break;
      }
      case 3: {
        const next = !settings.muted;
        this.saveService.updateSettings({ muted: next });
        this.audioService?.setMuted(next);
        this.statusText.setText(next ? 'Audio muted.' : 'Audio on.');
        break;
      }
      case 4: {
        const next = cycle(SHAKE_ORDER, settings.screenShake, direction);
        this.saveService.updateSettings({ screenShake: next });
        this.statusText.setText(`Screen shake ${next}.`);
        break;
      }
      case 5: {
        const next = cycle(FLASH_ORDER, settings.flashIntensity, direction);
        this.saveService.updateSettings({ flashIntensity: next });
        this.statusText.setText(`Flash intensity ${next}.`);
        break;
      }
      default:
        break;
    }

    this.refresh();
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
      return;
    }

    if (!this.scale.fullscreen.available) {
      this.statusText.setText('Fullscreen is not available in this browser.');
      this.refresh();
      return;
    }

    this.scale.startFullscreen();
    this.statusText.setText('Press ESC to leave fullscreen.');
    this.refresh();
  }

  private openControls(): void {
    this.scene.launch('Controls', { returnScene: this.returnScene });
    this.scene.pause();
  }

  private refresh(): void {
    const settings = this.saveService?.settings;
    const master = Math.round((settings?.masterVolume ?? 0.8) * 100);
    const music = Math.round((settings?.musicVolume ?? 0.6) * 100);
    const sfx = Math.round((settings?.sfxVolume ?? 0.8) * 100);
    const muted = settings?.muted ?? false;
    const shake = settings?.screenShake ?? 'full';
    const flash = settings?.flashIntensity ?? 'full';
    const fullscreen = this.scale.isFullscreen;

    const rows = [
      `MASTER VOLUME  < ${master}% >`,
      `MUSIC VOLUME   < ${music}% >`,
      `SFX VOLUME     < ${sfx}% >`,
      `MUTE           < ${muted ? 'ON' : 'OFF'} >`,
      `SCREEN SHAKE   < ${shake.toUpperCase()} >`,
      `FLASH INTENSITY < ${flash.toUpperCase()} >`,
      `FULLSCREEN     < ${fullscreen ? 'ON' : 'OFF'} >`,
      'CONTROLS...',
      'BACK',
    ];

    this.rowTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      text.setText(`${selected ? '> ' : '  '}${rows[index] ?? ''}`);
      text.setColor(selected ? '#f4d35e' : '#cfd2d6');
    });

    if (!this.statusText.text) {
      this.statusText.setText('Audio, screen effects, and bindings update immediately.');
    }

    setTestHook({
      ready: true,
      scene: 'Settings',
      settingsSelection: SETTINGS_ITEMS[this.selectedIndex] ?? 'Master Volume',
      masterVolume: settings?.masterVolume ?? 0.8,
      musicVolume: settings?.musicVolume ?? 0.6,
      sfxVolume: settings?.sfxVolume ?? 0.8,
      muted,
      screenShake: settings?.screenShake ?? 'full',
      flashIntensity: settings?.flashIntensity ?? 'full',
      fullscreen,
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

function cycle<T>(values: readonly T[], current: T, direction: number): T {
  const index = values.indexOf(current);
  const next = (((index + direction) % values.length) + values.length) % values.length;
  return values[next] ?? current;
}

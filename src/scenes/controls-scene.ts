import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import {
  DEFAULT_KEYBINDS,
  KEYBIND_ROWS,
  findKeybindConflict,
  isBindableKeyCode,
  keybindLabel,
  type KeybindAction,
} from '../services/keybinds';
import type { SaveService } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';
const EXTRA_ROWS = ['Reset to Defaults', 'Back'] as const;
const ROWS = [...KEYBIND_ROWS.map((row) => row.label), ...EXTRA_ROWS];
const ROW_START_Y = 66;
const ROW_SPACING = 20;
const RESET_INDEX = KEYBIND_ROWS.length;
const BACK_INDEX = RESET_INDEX + 1;

/**
 * Key rebinding screen reached from Options. Bindings persist through
 * SaveService and are read by InputService and the pause handler when a run
 * starts.
 */
export class ControlsScene extends Phaser.Scene {
  private selectedIndex = 0;
  private awaitingAction: KeybindAction | null = null;
  private saveService: SaveService | undefined;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('Controls');
  }

  init(): void {
    this.selectedIndex = 0;
    this.awaitingAction = null;
    this.rowTexts = [];
  }

  create(): void {
    this.saveService = this.registry.get('saveService') as SaveService | undefined;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020304, 0.78).setOrigin(0).setDepth(0);
    this.add
      .rectangle(GAME_WIDTH / 2, 140, 356, 250, 0x10151b, 0.97)
      .setStrokeStyle(1, 0x4a515a, 1)
      .setDepth(1);

    this.add
      .text(GAME_WIDTH / 2, 34, 'CONTROLS', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(GAME_WIDTH / 2, 50, 'ENTER TO REBIND   ESC CANCELS', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#7f8c8d',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.rowTexts = ROWS.map((label, index) =>
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
      .text(GAME_WIDTH / 2, 259, 'UP/DOWN SELECT   ENTER REBIND   ESC BACK', {
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

    if (this.awaitingAction) {
      event.preventDefault();
      this.capture(event.code);
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
        this.activate();
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      default:
        break;
    }
  };

  private select(index: number): void {
    const count = ROWS.length;
    this.selectedIndex = ((index % count) + count) % count;
    this.statusText.setText('');
    this.refresh();
  }

  private activate(): void {
    if (this.selectedIndex === BACK_INDEX) {
      this.close();
      return;
    }

    if (this.selectedIndex === RESET_INDEX) {
      this.saveService?.updateSettings({ keybinds: { ...DEFAULT_KEYBINDS } });
      this.statusText.setText('Bindings restored to their defaults.');
      this.refresh();
      return;
    }

    const row = KEYBIND_ROWS[this.selectedIndex];

    if (!row) {
      return;
    }

    this.awaitingAction = row.id;
    this.statusText.setText(`Press a key for ${row.label}. ESC cancels.`);
    this.refresh();
  }

  private capture(code: string): void {
    const action = this.awaitingAction;
    this.awaitingAction = null;

    if (!action) {
      return;
    }

    if (code === 'Escape') {
      this.statusText.setText('Binding cancelled.');
      this.refresh();
      return;
    }

    if (!isBindableKeyCode(code)) {
      this.statusText.setText('That key cannot be bound.');
      this.refresh();
      return;
    }

    const keybinds = this.saveService?.settings.keybinds;

    if (!keybinds) {
      this.refresh();
      return;
    }

    const conflict = findKeybindConflict(keybinds, action, code);

    if (conflict) {
      this.statusText.setText(`${keybindLabel(code)} is already used for ${conflict.label}.`);
      this.refresh();
      return;
    }

    this.saveService?.updateSettings({ keybinds: { ...keybinds, [action]: code } });
    const label = KEYBIND_ROWS.find((row) => row.id === action)?.label ?? action;
    this.statusText.setText(`${label} is now ${keybindLabel(code)}.`);
    this.refresh();
  }

  private refresh(): void {
    const keybinds = this.saveService?.settings.keybinds;

    this.rowTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      let label = ROWS[index] ?? '';

      if (index < KEYBIND_ROWS.length) {
        const row = KEYBIND_ROWS[index];
        const value = row ? (keybinds?.[row.id] ?? DEFAULT_KEYBINDS[row.id]) : '';
        const awaiting = row && this.awaitingAction === row.id;
        label = `${label.padEnd(12)}< ${awaiting ? 'PRESS A KEY' : keybindLabel(value)} >`;
      }

      text.setText(`${selected ? '> ' : '  '}${label}`);
      text.setColor(selected ? '#f4d35e' : '#cfd2d6');
    });

    if (!this.statusText.text) {
      this.statusText.setText('Changes apply to the next level and remain saved.');
    }

    setTestHook({
      ready: true,
      scene: 'Controls',
      controlsSelection: ROWS[this.selectedIndex] ?? 'Move Left',
      awaitingKey: this.awaitingAction,
      keybinds: keybinds ? { ...keybinds } : { ...DEFAULT_KEYBINDS },
      message: this.statusText.text,
    });
  }

  private close(): void {
    this.scene.resume('Settings');
    this.scene.stop();
  }
}

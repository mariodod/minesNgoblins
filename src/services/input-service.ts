import Phaser from 'phaser';
import { DEFAULT_KEYBINDS, type KeybindSettings } from './keybinds';
import { isPhysicalKeyDown } from './keyboard-state';

const MOVEMENT_FALLBACKS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
} as const;

/**
 * Scene-scoped keyboard input with buffered action queries.
 *
 * Held movement reads the browser-level key state so a key that is still down
 * during a scene transition keeps moving the player. One-shot actions are
 * buffered from Phaser's keyboard event so a press between frames is not lost.
 */
export class InputService {
  private readonly scene: Phaser.Scene;
  private readonly keybinds: KeybindSettings;
  private jumpQueued = false;
  private throwQueued = false;
  private itemQueued = false;
  private interactQueued = false;

  constructor(scene: Phaser.Scene, keybinds: KeybindSettings = DEFAULT_KEYBINDS) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.scene = scene;
    this.keybinds = keybinds;

    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);

    keyboard.on('keydown', this.handleKeyDown);
  }

  isLeftDown(): boolean {
    return isPhysicalKeyDown(this.keybinds.moveLeft, ...MOVEMENT_FALLBACKS.left);
  }

  isRightDown(): boolean {
    return isPhysicalKeyDown(this.keybinds.moveRight, ...MOVEMENT_FALLBACKS.right);
  }

  isAimUpDown(): boolean {
    return isPhysicalKeyDown('ArrowUp');
  }

  isAimDownDown(): boolean {
    return isPhysicalKeyDown('ArrowDown');
  }

  isJumpDown(): boolean {
    return isPhysicalKeyDown(this.keybinds.jump);
  }

  isJumpJustPressed(): boolean {
    if (this.jumpQueued) {
      this.jumpQueued = false;
      return true;
    }

    return false;
  }

  isThrowJustPressed(): boolean {
    if (this.throwQueued) {
      this.throwQueued = false;
      return true;
    }

    return false;
  }

  isUseItemJustPressed(): boolean {
    if (this.itemQueued) {
      this.itemQueued = false;
      return true;
    }

    return false;
  }

  isInteractJustPressed(): boolean {
    if (this.interactQueued) {
      this.interactQueued = false;
      return true;
    }

    return false;
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.handleKeyDown);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.code === this.keybinds.jump) {
      this.jumpQueued = true;
    }

    if (event.code === this.keybinds.throwStone) {
      this.throwQueued = true;
    }

    if (event.code === this.keybinds.useItem) {
      this.itemQueued = true;
    }

    if (event.code === this.keybinds.interact) {
      this.interactQueued = true;
    }
  };
}

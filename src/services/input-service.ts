import Phaser from 'phaser';

/**
 * Scene-scoped keyboard input with buffered action queries.
 * Gamepad support can be added behind the same interface later.
 */
export class InputService {
  private readonly scene: Phaser.Scene;
  private readonly left: Phaser.Input.Keyboard.Key;
  private readonly right: Phaser.Input.Keyboard.Key;
  private readonly up: Phaser.Input.Keyboard.Key;
  private readonly down: Phaser.Input.Keyboard.Key;
  private readonly jumpSpace: Phaser.Input.Keyboard.Key;
  private readonly jumpZ: Phaser.Input.Keyboard.Key;
  private readonly throwX: Phaser.Input.Keyboard.Key;
  private readonly throwJ: Phaser.Input.Keyboard.Key;
  private readonly itemC: Phaser.Input.Keyboard.Key;
  private readonly itemK: Phaser.Input.Keyboard.Key;
  private readonly interactE: Phaser.Input.Keyboard.Key;
  private readonly createdKeys: Phaser.Input.Keyboard.Key[];
  private jumpQueued = false;
  private throwQueued = false;
  private itemQueued = false;
  private interactQueued = false;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.scene = scene;
    const keyCodes = Phaser.Input.Keyboard.KeyCodes;

    this.left = keyboard.addKey(keyCodes.LEFT);
    this.right = keyboard.addKey(keyCodes.RIGHT);
    this.up = keyboard.addKey(keyCodes.UP);
    this.down = keyboard.addKey(keyCodes.DOWN);
    this.jumpSpace = keyboard.addKey(keyCodes.SPACE);
    this.jumpZ = keyboard.addKey(keyCodes.Z);
    this.throwX = keyboard.addKey(keyCodes.X);
    this.throwJ = keyboard.addKey(keyCodes.J);
    this.itemC = keyboard.addKey(keyCodes.C);
    this.itemK = keyboard.addKey(keyCodes.K);
    this.interactE = keyboard.addKey(keyCodes.E);

    this.createdKeys = [
      this.left,
      this.right,
      this.up,
      this.down,
      this.jumpSpace,
      this.jumpZ,
      this.throwX,
      this.throwJ,
      this.itemC,
      this.itemK,
      this.interactE,
    ];

    keyboard.addCapture([
      keyCodes.LEFT,
      keyCodes.RIGHT,
      keyCodes.UP,
      keyCodes.DOWN,
      keyCodes.SPACE,
    ]);

    keyboard.on('keydown', this.handleKeyDown);
  }

  isLeftDown(): boolean {
    return this.left.isDown;
  }

  isRightDown(): boolean {
    return this.right.isDown;
  }

  isAimUpDown(): boolean {
    return this.up.isDown;
  }

  isAimDownDown(): boolean {
    return this.down.isDown;
  }

  isJumpDown(): boolean {
    return this.jumpSpace.isDown || this.jumpZ.isDown;
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
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.off('keydown', this.handleKeyDown);

    for (const key of this.createdKeys) {
      keyboard.removeKey(key);
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.code === 'Space' || event.code === 'KeyZ') {
      this.jumpQueued = true;
    }

    if (event.code === 'KeyX' || event.code === 'KeyJ') {
      this.throwQueued = true;
    }

    if (event.code === 'KeyC' || event.code === 'KeyK') {
      this.itemQueued = true;
    }

    if (event.code === 'KeyE') {
      this.interactQueued = true;
    }
  };
}

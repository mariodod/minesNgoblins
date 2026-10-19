import Phaser from 'phaser';
import { setTestHook } from '../utils/test-hooks';

/**
 * Asset loading will live here as the game grows. M0 has no external assets,
 * so this scene hands control straight to the title screen.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    setTestHook({ scene: 'Preload' });
  }

  create(): void {
    this.scene.start('Title');
  }
}

import Phaser from 'phaser';
import { SaveService } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    setTestHook({ ready: false, scene: 'Boot' });
    this.createPlaceholderTextures();

    const saveService = new SaveService();
    this.registry.set('saveService', saveService);
    this.registry.set('saveData', saveService.data);

    this.scene.start('Preload');
  }

  private createPlaceholderTextures(): void {
    const graphics = this.make.graphics({}, false);

    // Miner placeholder: 16x24, readable at 3x scale.
    graphics.fillStyle(0x2f3640, 1).fillRect(4, 12, 8, 8);
    graphics.fillStyle(0x3d5560, 1).fillRect(2, 13, 2, 6);
    graphics.fillStyle(0x3d5560, 1).fillRect(12, 13, 2, 6);
    graphics.fillStyle(0xf2c14e, 1).fillRect(3, 3, 10, 4);
    graphics.fillStyle(0xf2c14e, 1).fillRect(2, 6, 12, 2);
    graphics.fillStyle(0xf1c27d, 1).fillRect(4, 7, 8, 5);
    graphics.fillStyle(0x11161b, 1).fillRect(5, 9, 2, 1);
    graphics.fillStyle(0x11161b, 1).fillRect(9, 9, 2, 1);
    graphics.fillStyle(0xfff3b0, 1).fillRect(7, 4, 2, 2);
    graphics.fillStyle(0x2f3640, 1).fillRect(4, 20, 3, 3);
    graphics.fillStyle(0x2f3640, 1).fillRect(9, 20, 3, 3);
    graphics.fillStyle(0x1b1f24, 1).fillRect(3, 23, 4, 1);
    graphics.fillStyle(0x1b1f24, 1).fillRect(9, 23, 4, 1);
    graphics.generateTexture('miner', 16, 24);

    graphics.clear();

    // Rock placeholder: 6x6.
    graphics.fillStyle(0x8b949e, 1).fillRect(1, 1, 4, 4);
    graphics.fillStyle(0xb8c0c8, 1).fillRect(2, 1, 2, 1);
    graphics.fillStyle(0x596169, 1).fillRect(1, 4, 4, 1);
    graphics.generateTexture('rock', 6, 6);

    graphics.clear();

    // Crate placeholder: 16x16.
    graphics.fillStyle(0x7a4f2a, 1).fillRect(0, 0, 16, 16);
    graphics.lineStyle(1, 0x3d2a17, 1).strokeRect(1, 1, 14, 14);
    graphics.lineStyle(1, 0xa97945, 1).lineBetween(2, 2, 14, 14);
    graphics.lineBetween(14, 2, 2, 14);
    graphics.generateTexture('crate', 16, 16);

    graphics.clear();

    // Lantern glow: soft alpha rings, used on the title screen.
    graphics.fillStyle(0xffc857, 0.05).fillCircle(24, 24, 24);
    graphics.fillStyle(0xffc857, 0.08).fillCircle(24, 24, 16);
    graphics.fillStyle(0xffe6a0, 0.12).fillCircle(24, 24, 8);
    graphics.generateTexture('lantern-glow', 48, 48);

    graphics.destroy();
  }
}

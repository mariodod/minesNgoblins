import Phaser from 'phaser';
import { AudioService } from '../services/audio-service';
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
    this.registry.set('audioService', new AudioService());

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

    // Wall tile: 16x16.
    graphics.fillStyle(0x232a32, 1).fillRect(0, 0, 16, 16);
    graphics.fillStyle(0x2f3842, 1).fillRect(0, 0, 16, 2);
    graphics.fillStyle(0x171c22, 1).fillRect(0, 14, 16, 2);
    graphics.fillStyle(0x1b2129, 1).fillRect(2, 5, 3, 2);
    graphics.fillStyle(0x1b2129, 1).fillRect(10, 9, 4, 2);
    graphics.fillStyle(0x3a444f, 1).fillRect(6, 3, 2, 2);
    graphics.fillRect(13, 12, 2, 2);
    graphics.generateTexture('tile-stone', 16, 16);

    graphics.clear();

    // One-way wooden platform tile: 16x16.
    graphics.fillStyle(0x5a3d26, 1).fillRect(0, 0, 16, 16);
    graphics.fillStyle(0x8a5f3a, 1).fillRect(0, 0, 16, 3);
    graphics.fillStyle(0x3a2818, 1).fillRect(0, 3, 16, 1);
    graphics.fillStyle(0x3a2818, 1).fillRect(0, 11, 16, 1);
    graphics.fillStyle(0x6b4930, 1).fillRect(2, 5, 5, 2);
    graphics.fillRect(9, 13, 5, 2);
    graphics.generateTexture('tile-wood', 16, 16);

    graphics.clear();

    // Distant cave wall background tile: 16x16.
    graphics.fillStyle(0x0e1218, 1).fillRect(0, 0, 16, 16);
    graphics.fillStyle(0x121820, 1).fillRect(0, 0, 16, 6);
    graphics.fillStyle(0x0a0e13, 1).fillRect(0, 10, 16, 6);
    graphics.fillStyle(0x151c25, 1).fillRect(3, 7, 3, 3);
    graphics.fillRect(11, 3, 3, 3);
    graphics.fillStyle(0x090c10, 1).fillRect(6, 12, 4, 2);
    graphics.generateTexture('bg-cave', 16, 16);

    graphics.clear();

    // Practice dummy: 16x20.
    graphics.fillStyle(0x4a3320, 1).fillRect(6, 10, 4, 10);
    graphics.fillStyle(0x3a2818, 1).fillRect(4, 18, 8, 2);
    graphics.fillStyle(0x8a5f3a, 1).fillRect(1, 6, 2, 6);
    graphics.fillRect(13, 6, 2, 6);
    graphics.fillStyle(0xc9a227, 1).fillRect(3, 5, 10, 7);
    graphics.fillStyle(0xa8841d, 1).fillRect(3, 10, 10, 2);
    graphics.fillStyle(0xd9b44a, 1).fillRect(5, 1, 6, 5);
    graphics.fillStyle(0x11161b, 1).fillRect(6, 3, 1, 1);
    graphics.fillRect(9, 3, 1, 1);
    graphics.fillStyle(0xf2f2f2, 1).fillCircle(8, 8, 4);
    graphics.fillStyle(0xd64545, 1).fillCircle(8, 8, 3);
    graphics.fillStyle(0xf2f2f2, 1).fillCircle(8, 8, 2);
    graphics.fillStyle(0xd64545, 1).fillCircle(8, 8, 1);
    graphics.generateTexture('dummy', 16, 20);

    graphics.clear();

    // Hearts: 7x7.
    graphics.fillStyle(0xe74c3c, 1);
    graphics.fillRect(1, 1, 2, 1);
    graphics.fillRect(4, 1, 2, 1);
    graphics.fillRect(0, 2, 7, 2);
    graphics.fillRect(1, 4, 5, 1);
    graphics.fillRect(2, 5, 3, 1);
    graphics.fillRect(3, 6, 1, 1);
    graphics.fillStyle(0xff9a8a, 1).fillRect(1, 1, 1, 1);
    graphics.fillStyle(0xa83227, 1).fillRect(2, 5, 3, 1);
    graphics.generateTexture('heart-full', 7, 7);

    graphics.clear();

    graphics.fillStyle(0x2a3038, 1);
    graphics.fillRect(1, 1, 2, 1);
    graphics.fillRect(4, 1, 2, 1);
    graphics.fillRect(0, 2, 7, 2);
    graphics.fillRect(1, 4, 5, 1);
    graphics.fillRect(2, 5, 3, 1);
    graphics.fillRect(3, 6, 1, 1);
    graphics.fillStyle(0x3d454f, 1).fillRect(1, 2, 2, 1);
    graphics.generateTexture('heart-empty', 7, 7);

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

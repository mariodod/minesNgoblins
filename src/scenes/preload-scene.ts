import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';
import { LEVEL_ASSETS, levelCacheKey } from '../data/level-registry';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

/**
 * Loads level JSON and future asset packs, then hands control to the title screen.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    setTestHook({ scene: 'Preload' });

    this.add
      .text(GAME_WIDTH / 2, 128, 'LOADING THE MINE...', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5);

    const barWidth = 200;
    this.add.rectangle(GAME_WIDTH / 2, 150, barWidth, 8, 0x2a2f36).setOrigin(0.5);
    const fill = this.add
      .rectangle(GAME_WIDTH / 2 - barWidth / 2, 150, 0, 8, 0xf4d35e)
      .setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value;
    });

    for (const asset of LEVEL_ASSETS) {
      this.load.json(levelCacheKey(asset.id), asset.path);
    }
  }

  create(): void {
    this.scene.start('Title');
  }
}

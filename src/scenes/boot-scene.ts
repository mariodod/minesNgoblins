import Phaser from 'phaser';
import { ASSET_MANIFEST, assetUrl } from '../data/assets';
import { AchievementService } from '../services/achievement-service';
import { AudioService } from '../services/audio-service';
import { SaveService } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

/**
 * Services come up before the asset manifest loads. All visuals are generated
 * into public/assets by `npm run assets`; this scene creates no textures.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // The bitmap font is needed by the loading screen itself, so it loads here
    // rather than with the rest of the manifest in PreloadScene.
    for (const font of ASSET_MANIFEST.bitmapFonts) {
      this.load.bitmapFont(font.key, assetUrl(font.textureUrl), assetUrl(font.dataUrl));
    }
  }

  create(): void {
    setTestHook({ ready: false, scene: 'Boot' });

    const saveService = new SaveService();
    const achievementService = new AchievementService(saveService);
    const audioService = new AudioService(this.sound);
    audioService.applySettings(saveService.settings);

    this.registry.set('saveService', saveService);
    this.registry.set('achievementService', achievementService);
    this.registry.set('audioService', audioService);

    this.scene.start('Preload');
  }
}

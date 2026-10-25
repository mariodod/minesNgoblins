import Phaser from 'phaser';
import { SKINS, SKIN_LIST, skinTextureKey, type SkinPalette } from '../data/skins';
import { AchievementService } from '../services/achievement-service';
import { AudioService } from '../services/audio-service';
import { SaveService } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

function drawMiner(graphics: Phaser.GameObjects.Graphics, palette: SkinPalette): void {
  graphics.fillStyle(palette.clothes, 1).fillRect(4, 12, 8, 8);
  graphics.fillStyle(palette.clothesShade, 1).fillRect(4, 18, 8, 2);
  graphics.fillStyle(palette.arms, 1).fillRect(2, 13, 2, 6);
  graphics.fillStyle(palette.arms, 1).fillRect(12, 13, 2, 6);
  graphics.fillStyle(palette.helmet, 1).fillRect(3, 3, 10, 4);
  graphics.fillStyle(palette.helmet, 1).fillRect(2, 6, 12, 2);
  graphics.fillStyle(palette.helmetHighlight, 1).fillRect(4, 3, 8, 1);
  graphics.fillStyle(palette.skin, 1).fillRect(4, 7, 8, 5);
  graphics.fillStyle(palette.skinShade, 1).fillRect(4, 11, 8, 1);
  graphics.fillStyle(palette.eyes, 1).fillRect(5, 9, 2, 1);
  graphics.fillStyle(palette.eyes, 1).fillRect(9, 9, 2, 1);
  graphics.fillStyle(palette.lamp, 1).fillRect(7, 4, 2, 2);
  graphics.fillStyle(palette.boots, 1).fillRect(4, 20, 3, 3);
  graphics.fillStyle(palette.boots, 1).fillRect(9, 20, 3, 3);
  graphics.fillStyle(palette.bootShade, 1).fillRect(3, 23, 4, 1);
  graphics.fillStyle(palette.bootShade, 1).fillRect(9, 23, 4, 1);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    setTestHook({ ready: false, scene: 'Boot' });
    this.createPlaceholderTextures();

    const saveService = new SaveService();
    const achievementService = new AchievementService(saveService);
    const audioService = new AudioService();
    audioService.setVolume(saveService.settings.masterVolume);

    this.registry.set('saveService', saveService);
    this.registry.set('achievementService', achievementService);
    this.registry.set('audioService', audioService);

    this.scene.start('Preload');
  }

  private createPlaceholderTextures(): void {
    const graphics = this.make.graphics({}, false);

    // Miner placeholders: one 16x24 palette variant per unlockable skin.
    for (const skin of SKIN_LIST) {
      drawMiner(graphics, skin.palette);
      graphics.generateTexture(skinTextureKey(skin.id), 16, 24);
      graphics.clear();
    }

    // The plain 'miner' key remains the title/fallback texture.
    drawMiner(graphics, SKINS.delver.palette);
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

    // Cave bat: 14x10. Wings out, small body.
    graphics.fillStyle(0x6a4a7a, 1);
    graphics.fillTriangle(0, 2, 5, 4, 1, 8);
    graphics.fillTriangle(13, 2, 8, 4, 12, 8);
    graphics.fillStyle(0x3d2c4a, 1).fillRect(4, 2, 6, 5);
    graphics.fillStyle(0x8a6a9a, 1).fillRect(5, 1, 1, 2);
    graphics.fillRect(8, 1, 1, 2);
    graphics.fillStyle(0xffcf5a, 1).fillRect(5, 3, 1, 1);
    graphics.fillRect(8, 3, 1, 1);
    graphics.fillStyle(0x2a1c33, 1).fillRect(5, 6, 1, 1);
    graphics.fillRect(8, 6, 1, 1);
    graphics.generateTexture('bat', 14, 10);

    graphics.clear();

    // Goblin scavenger: 16x20. Green, big ears, belt.
    graphics.fillStyle(0x4f7a35, 1).fillRect(4, 6, 8, 8);
    graphics.fillStyle(0x3d6128, 1).fillRect(3, 8, 2, 3);
    graphics.fillRect(11, 8, 2, 3);
    graphics.fillStyle(0x76a84d, 1).fillRect(4, 2, 8, 6);
    graphics.fillStyle(0x3d6128, 1).fillTriangle(1, 3, 5, 2, 4, 7);
    graphics.fillTriangle(15, 3, 11, 2, 12, 7);
    graphics.fillStyle(0xffe066, 1).fillRect(5, 4, 2, 2);
    graphics.fillRect(9, 4, 2, 2);
    graphics.fillStyle(0x1b2414, 1).fillRect(6, 5, 1, 1);
    graphics.fillRect(10, 5, 1, 1);
    graphics.fillStyle(0x5a3d26, 1).fillRect(3, 13, 10, 3);
    graphics.fillStyle(0xc9a227, 1).fillRect(7, 13, 2, 2);
    graphics.fillStyle(0x2f4a1f, 1).fillRect(4, 16, 3, 3);
    graphics.fillRect(9, 16, 3, 3);
    graphics.fillStyle(0x1a2912, 1).fillRect(4, 19, 3, 1);
    graphics.fillRect(9, 19, 3, 1);
    graphics.generateTexture('goblin', 16, 20);

    graphics.clear();

    // Skeleton thrower: 16x22. Bone white with dark sockets.
    graphics.fillStyle(0xd8d2c0, 1).fillRect(5, 2, 6, 6);
    graphics.fillStyle(0x1b1f24, 1).fillRect(6, 4, 1, 2);
    graphics.fillRect(9, 4, 1, 2);
    graphics.fillStyle(0x8a8474, 1).fillRect(7, 7, 2, 1);
    graphics.fillStyle(0xc4bda9, 1).fillRect(7, 9, 2, 7);
    graphics.fillStyle(0xd8d2c0, 1).fillRect(4, 10, 2, 1);
    graphics.fillRect(10, 10, 2, 1);
    graphics.fillRect(3, 11, 2, 4);
    graphics.fillRect(11, 11, 2, 4);
    graphics.fillRect(4, 16, 2, 4);
    graphics.fillRect(10, 16, 2, 4);
    graphics.fillStyle(0x8a8474, 1).fillRect(4, 19, 2, 2);
    graphics.fillRect(10, 19, 2, 2);
    graphics.fillStyle(0x6d6758, 1).fillRect(5, 12, 6, 1);
    graphics.fillRect(5, 14, 6, 1);
    graphics.generateTexture('skeleton', 16, 22);

    graphics.clear();

    // Armored beetle: 20x14. Front plate faces right.
    graphics.fillStyle(0x4a515a, 1).fillRect(2, 3, 14, 9);
    graphics.fillStyle(0x6c7580, 1).fillRect(4, 2, 10, 2);
    graphics.fillRect(3, 5, 2, 5);
    graphics.fillStyle(0x8b949e, 1).fillRect(13, 2, 4, 11);
    graphics.fillStyle(0xb8c0c8, 1).fillRect(15, 3, 2, 9);
    graphics.fillStyle(0x30363d, 1).fillRect(2, 12, 4, 2);
    graphics.fillRect(8, 12, 4, 2);
    graphics.fillRect(14, 12, 4, 2);
    graphics.fillStyle(0xffcf5a, 1).fillRect(17, 5, 1, 2);
    graphics.fillStyle(0x2a2f36, 1).fillRect(6, 4, 1, 6);
    graphics.fillRect(10, 4, 1, 6);
    graphics.generateTexture('beetle', 20, 14);

    graphics.clear();

    // Skeleton bone projectile: 6x3.
    graphics.fillStyle(0xe8e2d0, 1).fillRect(1, 1, 4, 1);
    graphics.fillStyle(0xd8d2c0, 1).fillRect(0, 0, 2, 3);
    graphics.fillRect(4, 0, 2, 3);
    graphics.generateTexture('bone', 6, 3);

    graphics.clear();

    // Falling boulder: 12x12.
    graphics.fillStyle(0x5b6067, 1).fillRect(1, 1, 10, 10);
    graphics.fillStyle(0x7a8088, 1).fillRect(2, 1, 5, 2);
    graphics.fillStyle(0x3d4147, 1).fillRect(2, 9, 8, 2);
    graphics.fillStyle(0x2a2d31, 1).fillRect(4, 5, 2, 2);
    graphics.generateTexture('boulder', 12, 12);

    graphics.clear();

    // Spikes: 16x8 tileable strip.
    graphics.fillStyle(0x2a2f36, 1).fillRect(0, 6, 16, 2);
    graphics.fillStyle(0xb8c0c8, 1);
    for (let x = 0; x < 16; x += 4) {
      graphics.fillTriangle(x, 7, x + 2, 0, x + 4, 7);
    }
    graphics.fillStyle(0x7d858e, 1);
    for (let x = 0; x < 16; x += 4) {
      graphics.fillRect(x + 2, 2, 1, 5);
    }
    graphics.generateTexture('spike', 16, 8);

    graphics.clear();

    // Crate placeholder: 16x16.
    graphics.fillStyle(0x7a4f2a, 1).fillRect(0, 0, 16, 16);
    graphics.lineStyle(1, 0x3d2a17, 1).strokeRect(1, 1, 14, 14);
    graphics.lineStyle(1, 0xa97945, 1).lineBetween(2, 2, 14, 14);
    graphics.lineBetween(14, 2, 2, 14);
    graphics.generateTexture('crate', 16, 16);

    graphics.clear();

    // Knife item and projectile: 9x3. Pale blade, leather grip.
    graphics.fillStyle(0xd8dde3, 1).fillRect(0, 1, 6, 1);
    graphics.fillStyle(0xf2f5f8, 1).fillRect(1, 0, 5, 1);
    graphics.fillStyle(0x7a4f2a, 1).fillRect(6, 0, 3, 3);
    graphics.fillStyle(0x4a2f19, 1).fillRect(8, 1, 1, 1);
    graphics.generateTexture('knife', 9, 3);

    graphics.clear();

    // Flintlock pistol: 12x8. Barrel right, grip down-left.
    graphics.fillStyle(0x4a515a, 1).fillRect(4, 2, 8, 2);
    graphics.fillStyle(0x8b949e, 1).fillRect(5, 2, 7, 1);
    graphics.fillStyle(0x6b4a2f, 1).fillRect(2, 4, 5, 2);
    graphics.fillStyle(0x4a2f19, 1).fillRect(1, 5, 4, 3);
    graphics.fillStyle(0xc9a227, 1).fillRect(4, 4, 2, 1);
    graphics.fillStyle(0xffcf5a, 1).fillRect(11, 1, 1, 1);
    graphics.generateTexture('flintlock', 12, 8);

    graphics.clear();

    // Rune scroll: 10x9. Rolled parchment with a glowing rune.
    graphics.fillStyle(0xd8c7a1, 1).fillRect(1, 2, 8, 5);
    graphics.fillStyle(0xb79f78, 1).fillRect(0, 1, 2, 7);
    graphics.fillRect(8, 1, 2, 7);
    graphics.fillStyle(0x6fe3c4, 1).fillRect(4, 3, 2, 1);
    graphics.fillRect(3, 4, 1, 1);
    graphics.fillRect(6, 4, 1, 1);
    graphics.fillRect(4, 5, 2, 1);
    graphics.generateTexture('rune-scroll', 10, 9);

    graphics.clear();

    // Flintlock bullet tracer: 6x2.
    graphics.fillStyle(0xfff3b0, 1).fillRect(0, 0, 6, 2);
    graphics.fillStyle(0xffcf5a, 1).fillRect(0, 1, 4, 1);
    graphics.generateTexture('bullet', 6, 2);

    graphics.clear();

    // Healing salve: 8x9. Green bottle with a cork and white cross.
    graphics.fillStyle(0x8fbf6a, 1).fillRect(2, 3, 4, 6);
    graphics.fillStyle(0x6d9a4c, 1).fillRect(2, 7, 4, 2);
    graphics.fillStyle(0xc9a27a, 1).fillRect(3, 1, 2, 2);
    graphics.fillStyle(0x7a4f2a, 1).fillRect(3, 0, 2, 1);
    graphics.fillStyle(0xf2f5f8, 1).fillRect(3, 5, 2, 1);
    graphics.fillRect(3, 4, 2, 1);
    graphics.generateTexture('salve', 8, 9);

    graphics.clear();

    // Ore chunk: 9x8. Gold flecks in dark rock.
    graphics.fillStyle(0x596169, 1).fillRect(1, 2, 7, 5);
    graphics.fillStyle(0x8b949e, 1).fillRect(2, 1, 4, 2);
    graphics.fillStyle(0xf2c14e, 1).fillRect(3, 3, 2, 1);
    graphics.fillRect(6, 4, 1, 2);
    graphics.fillStyle(0xffe6a0, 1).fillRect(4, 2, 1, 1);
    graphics.generateTexture('ore', 9, 8);

    graphics.clear();

    // Great Worm head: 40x32, facing right. The amber eye and pale skull plate
    // read as the weak point during the fight.
    graphics.fillStyle(0x4a2432, 1).fillEllipse(18, 16, 34, 26);
    graphics.fillStyle(0x6b3444, 1).fillEllipse(17, 15, 29, 20);
    graphics.fillStyle(0x8a4656, 1).fillEllipse(15, 12, 18, 10);
    graphics.fillStyle(0x2b131c, 1).fillEllipse(6, 20, 14, 13);
    graphics.fillStyle(0x3a1b27, 1).fillRect(4, 8, 14, 5);
    graphics.fillStyle(0x8a4656, 1).fillRect(5, 4, 3, 6);
    graphics.fillRect(11, 3, 3, 7);
    graphics.fillRect(17, 4, 3, 6);
    graphics.fillStyle(0x1a0b0f, 1).fillRect(28, 18, 11, 7);
    graphics.fillStyle(0x7a1f2b, 1).fillRect(30, 20, 8, 3);
    graphics.fillStyle(0xe8e2d0, 1);
    for (let x = 28; x <= 37; x += 3) {
      graphics.fillTriangle(x, 18, x + 1, 21, x + 2, 18);
      graphics.fillTriangle(x, 25, x + 1, 22, x + 2, 25);
    }
    graphics.fillStyle(0xffcf5a, 1).fillRect(26, 10, 5, 4);
    graphics.fillStyle(0xfff3b0, 1).fillRect(27, 11, 2, 2);
    graphics.fillStyle(0x1a0b0f, 1).fillRect(28, 12, 2, 2);
    graphics.fillStyle(0xc9a27a, 1).fillRect(10, 17, 12, 2);
    graphics.generateTexture('worm-head', 40, 32);

    graphics.clear();

    // Great Worm body segment: 24x20. Rounded armor rings with a dorsal spike.
    graphics.fillStyle(0x3a1b27, 1).fillEllipse(12, 10, 23, 18);
    graphics.fillStyle(0x5c2f3d, 1).fillEllipse(12, 10, 20, 15);
    graphics.fillStyle(0x8a4656, 1).fillEllipse(12, 8, 13, 8);
    graphics.fillStyle(0x2b131c, 1).fillRect(2, 11, 20, 3);
    graphics.fillStyle(0x6b3444, 1).fillRect(4, 5, 4, 2);
    graphics.fillRect(16, 5, 4, 2);
    graphics.fillStyle(0xc9a27a, 1).fillTriangle(10, 3, 14, 3, 12, -2);
    graphics.fillStyle(0xffcf5a, 0.7).fillRect(11, 1, 2, 2);
    graphics.generateTexture('worm-segment', 24, 20);

    graphics.clear();

    // Wormling add: 16x12. Smaller, faster-looking version of the boss.
    graphics.fillStyle(0x4a2432, 1).fillEllipse(8, 6, 15, 11);
    graphics.fillStyle(0x7a3b4a, 1).fillEllipse(8, 6, 12, 8);
    graphics.fillStyle(0x2b131c, 1).fillRect(10, 7, 6, 3);
    graphics.fillStyle(0xffcf5a, 1).fillRect(9, 3, 2, 2);
    graphics.fillStyle(0xe8e2d0, 1).fillRect(12, 7, 1, 1);
    graphics.fillRect(14, 7, 1, 1);
    graphics.fillStyle(0x8a4656, 1).fillRect(2, 2, 2, 2);
    graphics.fillRect(0, 6, 2, 2);
    graphics.generateTexture('wormling', 16, 12);

    graphics.clear();

    // Burrow hole: 32x10, drawn over the floor rim.
    graphics.fillStyle(0x050608, 0.95).fillEllipse(16, 5, 30, 8);
    graphics.fillStyle(0x231318, 1).fillEllipse(16, 4, 26, 5);
    graphics.fillStyle(0x6b3444, 0.65).fillRect(3, 2, 26, 1);
    graphics.fillStyle(0x0b0c10, 1).fillEllipse(16, 6, 20, 4);
    graphics.generateTexture('burrow-hole', 32, 10);

    graphics.clear();

    // Ground shockwave: 18x12. A bright leading edge with a dust tail.
    graphics.fillStyle(0xffcf5a, 0.9).fillTriangle(17, 6, 5, 0, 5, 12);
    graphics.fillStyle(0xfff3b0, 0.95).fillTriangle(15, 6, 8, 3, 8, 9);
    graphics.fillStyle(0x8b7d6b, 0.8);
    graphics.fillRect(0, 7, 6, 2);
    graphics.fillRect(2, 9, 4, 2);
    graphics.fillRect(0, 4, 4, 2);
    graphics.generateTexture('shockwave', 18, 12);

    graphics.clear();

    // Lantern glow: soft alpha rings, used on the title screen.
    graphics.fillStyle(0xffc857, 0.05).fillCircle(24, 24, 24);
    graphics.fillStyle(0xffc857, 0.08).fillCircle(24, 24, 16);
    graphics.fillStyle(0xffe6a0, 0.12).fillCircle(24, 24, 8);
    graphics.generateTexture('lantern-glow', 48, 48);

    graphics.destroy();
  }
}

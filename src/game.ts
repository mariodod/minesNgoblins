import Phaser from 'phaser';
import { APP_VERSION, GAME_HEIGHT, GAME_TITLE, GAME_WIDTH } from './config/constants';
import { PLAYER_TUNING } from './config/tuning';
import { BootScene } from './scenes/boot-scene';
import { BossPlaceholderScene } from './scenes/boss-placeholder-scene';
import { HudScene } from './scenes/hud-scene';
import { LevelScene } from './scenes/level-scene';
import { PreloadScene } from './scenes/preload-scene';
import { TitleScene } from './scenes/title-scene';

export function createGame(): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0b0c10',
    title: GAME_TITLE,
    version: APP_VERSION,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: PLAYER_TUNING.gravity },
        debug: false,
      },
    },
    scene: [BootScene, PreloadScene, TitleScene, LevelScene, BossPlaceholderScene, HudScene],
  };

  return new Phaser.Game(config);
}

import Phaser from 'phaser';
import { APP_VERSION, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

const SECTIONS = [
  {
    heading: 'MINES & GOBLINS',
    lines: [
      'Original game, code, art, audio, and pixel font',
      'by the Mines & Goblins project authors.',
    ],
  },
  {
    heading: 'TOOLS',
    lines: [
      'Phaser 4.2.1 (MIT)      Vite (MIT)',
      'Vitest (MIT)            Playwright (Apache-2.0)',
    ],
  },
  {
    heading: 'ASSETS',
    lines: [
      'Art: generated pixel pack (original)',
      'Audio: generated WAV pack (original)',
      'Font: generated 5x7 bitmap font (original)',
    ],
  },
] as const;

/**
 * Credits and license inventory. The same inventory lives in
 * `public/assets/README.md` and `public/audio/README.md`.
 */
export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0c10, 1).setOrigin(0);
    this.add
      .rectangle(GAME_WIDTH / 2, 136, 420, 232, 0x10151b, 0.96)
      .setStrokeStyle(1, 0x3d454f, 1);

    this.add
      .text(GAME_WIDTH / 2, 34, 'CREDITS', {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: '#f4d35e',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);

    let y = 54;

    for (const section of SECTIONS) {
      this.add
        .text(GAME_WIDTH / 2, y, section.heading, {
          fontFamily: FONT_FAMILY,
          fontSize: '8px',
          color: '#9fd8cb',
        })
        .setOrigin(0.5);
      y += 13;

      for (const line of section.lines) {
        this.add
          .text(GAME_WIDTH / 2, y, line, {
            fontFamily: FONT_FAMILY,
            fontSize: '7px',
            color: '#cfd2d6',
          })
          .setOrigin(0.5);
        y += 10;
      }

      y += 6;
    }

    this.add
      .text(
        GAME_WIDTH / 2,
        y + 2,
        'No third-party sprites, tilesets, music, or sound effects.\nAsset licenses: public/assets and public/audio README files.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: '#7f8c8d',
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 246, `v${APP_VERSION}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 262, 'ESC / ENTER  RETURN TO TITLE', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
    });

    setTestHook({
      ready: true,
      scene: 'Credits',
      message: 'All art, audio, and font assets are original generated works.',
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.code === 'Escape' || event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      this.scene.resume('Title');
      this.scene.stop();
    }
  };
}

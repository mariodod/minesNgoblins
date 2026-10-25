import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';
import { setTestHook } from '../utils/test-hooks';

interface ToastData {
  title?: string;
  lines: string[];
}

const FONT_FAMILY = '"Courier New", Courier, monospace';

/**
 * Unobtrusive unlock notice. It runs above the active gameplay scene and never
 * pauses input. A later toast replaces an older one rather than stacking.
 */
export class ToastScene extends Phaser.Scene {
  constructor() {
    super('Toast');
  }

  create(data: ToastData): void {
    const lines = data.lines.filter((line) => line.length > 0);
    if (lines.length === 0) {
      this.scene.stop();
      return;
    }

    const title = data.title ?? 'ACHIEVEMENT UNLOCKED';
    const width = 328;
    const height = 24 + lines.length * 11;
    const x = GAME_WIDTH / 2;
    const y = 12 + height / 2;
    const container = this.add.container(x, y).setDepth(1000).setAlpha(0);

    const panel = this.add
      .rectangle(0, 0, width, height, 0x11161b, 0.94)
      .setStrokeStyle(1, 0xf4d35e, 1);
    const titleText = this.add
      .text(0, -height / 2 + 7, title, {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#f4d35e',
      })
      .setOrigin(0.5, 0);
    const lineText = this.add
      .text(0, -height / 2 + 18, lines.join('\n'), {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#f4f1de',
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5, 0);

    container.add([panel, titleText, lineText]);

    setTestHook({
      ready: true,
      scene: 'Toast',
      message: `${title}: ${lines.join(', ')}`,
      achievementToast: lines,
    });

    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 160,
      ease: 'Quad.easeOut',
    });

    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 220,
        ease: 'Quad.easeIn',
        onComplete: () => this.scene.stop(),
      });
    });
  }
}

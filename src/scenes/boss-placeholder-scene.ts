import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { runService } from '../systems/run-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * M3 endpoint. The real boss arena and results flow arrive in M4.
 */
export class BossPlaceholderScene extends Phaser.Scene {
  constructor() {
    super('BossPlaceholder');
  }

  create(): void {
    const run = runService.snapshot;
    const elapsed = runService.elapsedMs();
    runService.endRun();

    const graphics = this.add.graphics();
    graphics.fillStyle(0x07090c, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(0x171015, 1);
    graphics.fillTriangle(0, GAME_HEIGHT, 120, 60, 250, GAME_HEIGHT);
    graphics.fillTriangle(230, GAME_HEIGHT, 370, 40, 480, GAME_HEIGHT);
    graphics.lineStyle(2, 0x6d2f2f, 0.8).lineBetween(0, 246, GAME_WIDTH, 246);
    graphics.fillStyle(0x2a1212, 0.9).fillCircle(384, 210, 26);
    graphics.fillCircle(402, 214, 18);

    this.add
      .text(GAME_WIDTH / 2, 54, "THE GREAT WORM'S NEST", {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(GAME_WIDTH / 2, 78, 'BOSS ARENA PLACEHOLDER', {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        color: '#c85c5c',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 102, 'The elevator reaches the nest.\nThe Great Worm arrives in M4.', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#9aa0a6',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const summary = [
      `LEVELS CLEARED   ${run.levelsCompleted}/${4}`,
      `TIME             ${formatTime(elapsed)}`,
      `KILLS            ${run.kills}`,
      `DAMAGE TAKEN     ${run.damageTaken}`,
      `DEATHS           ${run.deaths}`,
      `ITEMS USED       ${run.itemUses}`,
      `PICKUPS          ${run.itemsPickedUp}`,
      `ORE              ${run.oreCollected}`,
    ];

    this.add
      .text(GAME_WIDTH / 2, 148, summary.join('\n'), {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#cfd2d6',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 248, 'ENTER: RETURN TO TITLE', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#f4d35e',
      })
      .setOrigin(0.5);

    setTestHook({
      ready: true,
      scene: 'BossPlaceholder',
      message: 'The Great Worm boss arena arrives in M4. Press Enter to return to the title.',
    });

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Title');
      });
    });
  }
}

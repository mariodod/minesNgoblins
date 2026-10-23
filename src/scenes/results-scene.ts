import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { BOSS_DEFINITION } from '../data/boss';
import { getDifficulty } from '../data/difficulties';
import { LEVEL_COUNT } from '../data/level-registry';
import { runService } from '../systems/run-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

interface StatRow {
  label: string;
  value: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * M4 run summary. The run is frozen before this scene opens, so these stats
 * stay stable while the player reads them. A fuller records screen follows in
 * M6; this version is the complete end-of-run placeholder.
 */
export class ResultsScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('Results');
  }

  create(): void {
    this.leaving = false;
    const run = runService.snapshot;
    const difficulty = getDifficulty(run.difficultyId);
    const victory = run.bossDefeated || run.outcome === 'victory';

    this.drawBackground();

    this.add
      .text(GAME_WIDTH / 2, 28, victory ? 'RUN COMPLETE' : 'RUN ENDED', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: victory ? '#f4d35e' : '#c85c5c',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(
        GAME_WIDTH / 2,
        52,
        victory ? `${BOSS_DEFINITION.name.toUpperCase()} DEFEATED` : 'THE MINE REMEMBERS',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '8px',
          color: victory ? '#9fd8cb' : '#9aa0a6',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 68, `${difficulty.displayName.toUpperCase()} RUN`, {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 91, formatTime(run.runDurationMs), {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: '#e8c170',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(GAME_WIDTH / 2, 114, 'TOTAL RUN TIME', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    this.add
      .rectangle(GAME_WIDTH / 2, 187, 342, 122, 0x0b0c10, 0.92)
      .setStrokeStyle(1, 0x3a3f45)
      .setDepth(1);

    const stats: StatRow[] = [
      { label: 'LEVELS CLEARED', value: `${run.levelsCompleted}/${LEVEL_COUNT}` },
      { label: 'BOSS ATTEMPTS', value: `${run.bossAttempts}` },
      { label: 'KILLS', value: `${run.kills}` },
      { label: 'DAMAGE TAKEN', value: `${run.damageTaken}` },
      { label: 'DEATHS', value: `${run.deaths}` },
      { label: 'ITEMS USED', value: `${run.itemUses}` },
      { label: 'PICKUPS', value: `${run.itemsPickedUp}` },
      { label: 'ORE COLLECTED', value: `${run.oreCollected}` },
    ];

    const firstRowY = 140;
    const rowHeight = 11;

    stats.forEach((stat, index) => {
      const y = firstRowY + index * rowHeight;

      this.add
        .text(104, y, stat.label, {
          fontFamily: FONT_FAMILY,
          fontSize: '8px',
          color: '#8d949b',
        })
        .setDepth(2);

      this.add
        .text(376, y, stat.value, {
          fontFamily: FONT_FAMILY,
          fontSize: '8px',
          color: '#e8e1d3',
        })
        .setOrigin(1, 0)
        .setDepth(2);
    });

    this.add
      .text(GAME_WIDTH / 2, 253, 'ENTER: RETURN TO TITLE', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#f4d35e',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 264, 'M4 RESULTS PLACEHOLDER - FULL RECORDS ARRIVE IN M6', {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    setTestHook({
      ready: true,
      scene: 'Results',
      message: victory
        ? 'The Great Worm is defeated. The run is complete.'
        : 'Run ended. Press Enter to return to the title.',
      runActive: run.active,
      runCompleted: run.outcome === 'victory',
      runOutcome: run.outcome,
      runBossAttempts: run.bossAttempts,
      runBossDefeated: run.bossDefeated,
      runDurationMs: run.runDurationMs,
      runLevelsCompleted: run.levelsCompleted,
      runKills: run.kills,
      runDamageTaken: run.damageTaken,
      runDeaths: run.deaths,
      runItemUses: run.itemUses,
      runItemsPickedUp: run.itemsPickedUp,
      runOre: run.oreCollected,
      difficulty: run.difficultyId,
      bossVictorySequence: false,
      bossExitOpen: false,
    });

    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
    });

    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x07090c, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(0x141a21, 1);
    graphics.fillTriangle(0, GAME_HEIGHT, 96, 40, 220, GAME_HEIGHT);
    graphics.fillTriangle(250, GAME_HEIGHT, 358, 24, 480, GAME_HEIGHT);
    graphics.fillStyle(0x1a1210, 1).fillRect(0, 246, GAME_WIDTH, 24);
    graphics.lineStyle(2, 0x6f5427, 0.8);
    graphics.lineBetween(0, 246, GAME_WIDTH, 246);
    graphics.fillStyle(0x24201b, 0.8);

    for (let x = 20; x < GAME_WIDTH; x += 56) {
      graphics.fillRect(x, 8, 2, GAME_HEIGHT - 16);
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.code === 'Enter' || event.code === 'Space' || event.code === 'Escape') {
      event.preventDefault();
      this.returnToTitle();
    }
  };

  private returnToTitle(): void {
    if (this.leaving) {
      return;
    }

    this.leaving = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Title', { message: 'The Great Worm is dead. The mine waits.' });
    });
  }
}

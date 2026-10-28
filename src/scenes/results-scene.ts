import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { BOSS_DEFINITION } from '../data/boss';
import { getDifficulty } from '../data/difficulties';
import { LEVEL_COUNT } from '../data/level-registry';
import { SKINS, type SkinId } from '../data/skins';
import type { AchievementService, AchievementUnlock } from '../services/achievement-service';
import type { SaveService } from '../services/save-service';
import { evaluateChallenges, type ChallengeResult } from '../systems/challenges';
import { runService, type RunSnapshot } from '../systems/run-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function statusColor(status: ChallengeResult['status']): string {
  if (status === 'complete') {
    return '#6fe3c4';
  }

  return status === 'unavailable' ? '#9aa0a6' : '#ff9a8a';
}

function statusLabel(status: ChallengeResult['status']): string {
  if (status === 'complete') {
    return 'COMPLETE';
  }

  return status === 'unavailable' ? 'N/A' : 'FAILED';
}

/**
 * End-of-run record: permanent run stats, challenge badge verdicts with
 * reasons, and every achievement or skin unlocked by the victory.
 */
export class ResultsScene extends Phaser.Scene {
  private leaving = false;
  private challenges: ChallengeResult[] = [];
  private unlocks: AchievementUnlock[] = [];

  constructor() {
    super('Results');
  }

  create(): void {
    this.leaving = false;
    const run = runService.snapshot;
    const difficulty = getDifficulty(run.difficultyId);
    const saveService = this.registry.get('saveService') as SaveService;
    const achievementService = this.registry.get('achievementService') as AchievementService;

    this.challenges = evaluateChallenges(run);
    this.unlocks = achievementService.evaluateRun(
      run,
      this.challenges,
      saveService.data.stats.usedItems,
    );

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0c10, 1).setOrigin(0);
    this.drawBackground();

    this.add
      .text(GAME_WIDTH / 2, 17, 'RUN COMPLETE', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#f4d35e',
      })
      .setOrigin(0.5);
    this.add
      .text(
        GAME_WIDTH / 2,
        36,
        `${difficulty.displayName.toUpperCase()} RUN   ${BOSS_DEFINITION.name.toUpperCase()} DEFEATED   ${formatTime(run.runDurationMs)}`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: '#9fd8cb',
        },
      )
      .setOrigin(0.5);

    this.drawStats(run.kills, run.damageTaken, run.deaths, run);
    this.drawChallenges();
    this.drawRewards();
    this.installInput();

    const completed = this.challenges.filter((challenge) => challenge.status === 'complete').length;
    setTestHook({
      ready: true,
      scene: 'Results',
      difficulty: run.difficultyId,
      runActive: false,
      runCompleted: true,
      challengeResults: this.challenges.map((challenge) => ({
        id: challenge.id,
        status: challenge.status,
        reason: challenge.reason,
      })),
      challengeSummary: this.challenges
        .map((challenge) => `${challenge.name}: ${challenge.status}`)
        .join(', '),
      achievementsUnlocked: this.unlocks.map((unlock) => unlock.id),
      skinsUnlocked: this.unlocks
        .map((unlock) => unlock.skinId)
        .filter((skinId): skinId is SkinId => skinId !== undefined),
      runBossDamageTaken: run.bossDamageTaken,
      message: `${completed}/4 challenge badges completed.`,
    });
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x10151b, 1);
    graphics.fillTriangle(0, GAME_HEIGHT, 70, 34, 170, GAME_HEIGHT);
    graphics.fillTriangle(320, GAME_HEIGHT, 410, 28, 480, GAME_HEIGHT);
    graphics.fillStyle(0x18120e, 1).fillRect(0, 247, GAME_WIDTH, 23);
    graphics.lineStyle(1, 0x2e343b, 1).lineBetween(0, 247, GAME_WIDTH, 247);
  }

  private drawStats(kills: number, damageTaken: number, deaths: number, run: RunSnapshot): void {
    this.add
      .rectangle(18, 50, 224, 152, 0x11161b, 0.92)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3d454f, 1);
    this.add.text(26, 56, 'RUN STATS', {
      fontFamily: FONT_FAMILY,
      fontSize: '8px',
      color: '#f4d35e',
    });

    const stats = [
      ['KILLS', String(kills)],
      ['DAMAGE TAKEN', String(damageTaken)],
      ['DEATHS', String(deaths)],
      ['ITEM USES', String(run.itemUses)],
      ['ORE', String(run.oreCollected)],
      ['LEVELS CLEARED', `${run.levelsCompleted}/${LEVEL_COUNT}`],
      ['BOSS ATTEMPTS', String(run.bossAttempts)],
      ['BOSS DAMAGE', String(run.bossDamageTaken)],
    ] as const;

    stats.forEach(([label, value], index) => {
      const y = 74 + index * 14;
      this.add.text(26, y, label, {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
      });
      this.add
        .text(232, y, value, {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: '#c9d1d9',
        })
        .setOrigin(1, 0);
    });
  }

  private drawChallenges(): void {
    this.add
      .rectangle(252, 50, 210, 152, 0x11161b, 0.92)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3d454f, 1);
    this.add.text(260, 56, 'CHALLENGE BADGES', {
      fontFamily: FONT_FAMILY,
      fontSize: '8px',
      color: '#f4d35e',
    });

    this.challenges.forEach((challenge, index) => {
      const y = 72 + index * 31;
      this.add.text(260, y, challenge.name.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: challenge.status === 'complete' ? '#f4d35e' : '#cfd2d6',
      });
      this.add
        .text(454, y + 1, statusLabel(challenge.status), {
          fontFamily: FONT_FAMILY,
          fontSize: '6px',
          color: statusColor(challenge.status),
        })
        .setOrigin(1, 0);

      if (challenge.reason) {
        this.add.text(260, y + 10, challenge.reason, {
          fontFamily: FONT_FAMILY,
          fontSize: '6px',
          color: challenge.status === 'unavailable' ? '#77838c' : '#ff9a8a',
          wordWrap: { width: 194 },
        });
      }
    });
  }

  private drawRewards(): void {
    this.add.text(20, 204, 'NEW ACHIEVEMENTS', {
      fontFamily: FONT_FAMILY,
      fontSize: '7px',
      color: '#9fd8cb',
    });

    if (this.unlocks.length === 0) {
      this.add.text(20, 213, 'NONE THIS RUN', {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: '#5f6b73',
      });
    } else {
      this.unlocks.forEach((unlock, index) => {
        const column = Math.floor(index / 4);
        const row = index % 4;
        this.add.text(20 + column * 138, 213 + row * 8, `+ ${unlock.name}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '6px',
          color: '#f4d35e',
        });
      });
    }

    this.add.text(318, 204, 'SKINS UNLOCKED', {
      fontFamily: FONT_FAMILY,
      fontSize: '7px',
      color: '#9fd8cb',
    });

    const skins = this.unlocks
      .map((unlock) => unlock.skinId)
      .filter((skinId): skinId is SkinId => skinId !== undefined);

    if (skins.length === 0) {
      this.add.text(318, 213, 'NONE THIS RUN', {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: '#5f6b73',
      });
    } else {
      skins.forEach((skinId, index) => {
        const column = Math.floor(index / 4);
        const row = index % 4;
        this.add.text(318 + column * 76, 213 + row * 8, SKINS[skinId].name, {
          fontFamily: FONT_FAMILY,
          fontSize: '6px',
          color: '#6fe3c4',
        });
      });
    }

    this.add
      .text(GAME_WIDTH / 2, 258, 'ENTER / ESC  RETURN TO TITLE', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);
  }

  private installInput(): void {
    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (
      event.code === 'Enter' ||
      event.code === 'Escape' ||
      event.code === 'Space' ||
      event.code === 'Backspace'
    ) {
      event.preventDefault();
      this.returnToTitle();
    }
  };

  private returnToTitle(): void {
    if (this.leaving) {
      return;
    }

    this.leaving = true;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      runService.reset();
      this.scene.start('Title');
    });
  }
}

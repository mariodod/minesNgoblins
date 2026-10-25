import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import {
  DIFFICULTIES,
  resolveDifficultyId,
  type DifficultyConfig,
  type DifficultyId,
} from '../data/difficulties';
import { resolveLevelId } from '../data/level-registry';
import { runService } from '../systems/run-service';
import type { SaveService } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';
const DIFFICULTY_ORDER: readonly DifficultyId[] = ['normal', 'hard', 'impossible', 'crazy'];

const DIFFICULTY_BLURBS: Record<DifficultyId, string> = {
  normal: 'Recommended first run. Reach the elevator and finish the Great Worm.',
  hard: 'Enemies are tougher and hit twice as hard. No extra hearts.',
  impossible: 'Four hearts and brutal enemies. Two hits end a full-health run.',
  crazy: 'One heart. Any hit kills. Every standard enemy must die before the exit.',
};

export class RunSetupScene extends Phaser.Scene {
  private selectedIndex = 0;
  private starting = false;
  private cardsContainer: Phaser.GameObjects.Container | undefined;
  private warningText: Phaser.GameObjects.Text | undefined;

  constructor() {
    super('RunSetup');
  }

  create(): void {
    this.starting = false;
    this.selectedIndex = Math.max(0, DIFFICULTY_ORDER.indexOf(resolveDifficultyId()));

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0c10, 1).setOrigin(0);
    this.drawBackground();

    this.add
      .text(GAME_WIDTH / 2, 22, 'CHOOSE YOUR DESCENT', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#f4d35e',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 43, 'All modes are open. Challenge badges are tracked automatically.', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5);

    this.cardsContainer = this.add.container(0, 0);
    this.renderCards();

    this.add
      .text(GAME_WIDTH / 2, 226, 'PACIFIST / PRIMITIVE / UNTOUCHABLE  ->  LEGEND', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9fd8cb',
      })
      .setOrigin(0.5);

    this.warningText = this.add
      .text(GAME_WIDTH / 2, 239, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#ff9a8a',
        align: 'center',
      })
      .setOrigin(0.5);
    this.updateWarning();

    this.add
      .text(GAME_WIDTH / 2, 254, 'UP / DOWN SELECT   ENTER DESCEND   ESC BACK', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    this.installInput();
    this.publishHook();
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x10151b, 1);
    graphics.fillTriangle(0, GAME_HEIGHT, 70, 34, 170, GAME_HEIGHT);
    graphics.fillTriangle(320, GAME_HEIGHT, 410, 26, 480, GAME_HEIGHT);
    graphics.fillStyle(0x18120e, 1).fillRect(0, 247, GAME_WIDTH, 23);
    graphics.lineStyle(1, 0x2e343b, 1).lineBetween(0, 247, GAME_WIDTH, 247);
    graphics.fillStyle(0x241a13, 1).fillRect(14, 56, 7, 188);
    graphics.fillRect(459, 48, 7, 196);
  }

  private renderCards(): void {
    this.cardsContainer?.removeAll(true);

    DIFFICULTY_ORDER.forEach((id, index) => {
      const difficulty = DIFFICULTIES[id];
      const selected = index === this.selectedIndex;
      const y = 64 + index * 39;
      const card = this.add.container(0, 0);
      const background = this.add
        .rectangle(GAME_WIDTH / 2, y + 15, 438, 34, selected ? 0x252d36 : 0x11161b, 0.94)
        .setStrokeStyle(1, selected ? 0xf4d35e : 0x3d454f, 1);
      const name = this.add.text(30, y + 5, this.difficultyLabel(difficulty, selected), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: selected ? '#f4d35e' : '#cfd2d6',
      });
      const stats = this.add
        .text(450, y + 6, this.difficultyStats(difficulty), {
          fontFamily: FONT_FAMILY,
          fontSize: '7px',
          color: selected ? '#f4f1de' : '#9aa0a6',
        })
        .setOrigin(1, 0);
      const blurb = this.add.text(30, y + 19, DIFFICULTY_BLURBS[id], {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: selected ? '#c9d1d9' : '#77838c',
        wordWrap: { width: 410 },
      });

      card.add([background, name, stats, blurb]);
      card.setInteractive(
        new Phaser.Geom.Rectangle(21, y - 2, 438, 34),
        Phaser.Geom.Rectangle.Contains,
      );
      card.on('pointerover', () => this.select(index));
      card.on('pointerdown', () => {
        this.select(index);
        this.activeSelection();
      });

      this.cardsContainer?.add(card);
    });

    this.updateWarning();
  }

  private difficultyLabel(difficulty: DifficultyConfig, selected: boolean): string {
    return `${selected ? '> ' : '  '}${difficulty.displayName}${
      difficulty.id === 'normal' ? '  [RECOMMENDED]' : ''
    }`;
  }

  private difficultyStats(difficulty: DifficultyConfig): string {
    if (difficulty.requiresAllEnemiesDead) {
      return '1 HP   ENEMY x5   ANY HIT KILLS   FULL CLEAR';
    }

    return `${difficulty.playerMaxHp} HP   ENEMY x${difficulty.enemyHpMultiplier}   DAMAGE x${difficulty.enemyDamageMultiplier}`;
  }

  private updateWarning(): void {
    if (!this.warningText) {
      return;
    }

    const selected = DIFFICULTY_ORDER[this.selectedIndex];
    const warning =
      selected === 'crazy'
        ? 'PACIFIST AND LEGEND ARE UNAVAILABLE ON CRAZY.'
        : selected === 'impossible'
          ? 'WARNING: FOUR HEARTS. TWO ENEMY HITS WILL KILL YOU.'
          : '';
    this.warningText.setText(warning);
  }

  private installInput(): void {
    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || this.starting) {
      return;
    }

    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        this.select(this.selectedIndex - 1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        this.select(this.selectedIndex + 1);
        break;
      case 'Enter':
      case 'Space':
        event.preventDefault();
        this.activeSelection();
        break;
      case 'Escape':
      case 'Backspace':
        event.preventDefault();
        this.close();
        break;
      default:
        break;
    }
  };

  private select(index: number): void {
    const count = DIFFICULTY_ORDER.length;
    const next = ((index % count) + count) % count;

    if (next === this.selectedIndex) {
      return;
    }

    this.selectedIndex = next;
    this.renderCards();
    this.publishHook();
  }

  private activeSelection(): void {
    if (this.starting) {
      return;
    }

    const difficultyId = DIFFICULTY_ORDER[this.selectedIndex];
    if (!difficultyId) {
      return;
    }

    this.starting = true;
    runService.startRun(difficultyId);
    const saveService = this.registry.get('saveService') as SaveService;
    saveService.recordRunStarted();
    const levelId = resolveLevelId();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Title');
      this.scene.start('Level', { levelId, difficultyId });
    });
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('Title');
  }

  private publishHook(): void {
    const selected = DIFFICULTY_ORDER[this.selectedIndex] ?? 'normal';
    const warning =
      selected === 'crazy'
        ? 'Pacifist and Legend are unavailable on Crazy.'
        : selected === 'impossible'
          ? 'Four hearts. Two enemy hits kill.'
          : '';

    setTestHook({
      ready: true,
      scene: 'RunSetup',
      difficultySelection: DIFFICULTIES[selected].displayName,
      selectedDifficulty: selected,
      difficultyWarning: warning,
      message: DIFFICULTY_BLURBS[selected],
    });
  }
}

import Phaser from 'phaser';
import { APP_VERSION, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { resolveDifficultyId } from '../data/difficulties';
import { getLevelAsset, resolveLevelId } from '../data/level-registry';
import { DEFAULT_SKIN_ID, resolveSkinId, skinTextureKey } from '../data/skins';
import type { SaveService } from '../services/save-service';
import { runService } from '../systems/run-service';
import { setTestHook } from '../utils/test-hooks';

interface MenuItem {
  label: string;
  message: string;
  action?: 'start-run' | 'achievements' | 'skins' | 'settings';
}

interface TitleSceneData {
  message?: string;
}

const DEFAULT_TITLE_MESSAGE =
  'M5 challenge update: pick a difficulty, chase badges, and unlock skins.';

const FONT_FAMILY = '"Courier New", Courier, monospace';

const MENU_ITEMS: readonly MenuItem[] = [
  {
    label: 'Start Run',
    message: 'Descending into the mine...',
    action: 'start-run',
  },
  {
    label: 'Achievements',
    message: 'Track challenge badges and lifetime achievements.',
    action: 'achievements',
  },
  {
    label: 'Skins',
    message: 'Equip unlocked miner palettes. Skins never change gameplay.',
    action: 'skins',
  },
  {
    label: 'Options',
    message: 'Tune master volume and screen shake. Changes save automatically.',
    action: 'settings',
  },
];

export class TitleScene extends Phaser.Scene {
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private messageText!: Phaser.GameObjects.Text;
  private selectedIndex = 0;
  private startingRun = false;
  private initialMessage = DEFAULT_TITLE_MESSAGE;
  private hasExplicitMessage = false;
  private saveNotice = '';
  private titleMiner: Phaser.GameObjects.Image | undefined;

  constructor() {
    super('Title');
  }

  init(data: TitleSceneData = {}): void {
    this.hasExplicitMessage = data.message !== undefined;
    this.initialMessage = data.message ?? DEFAULT_TITLE_MESSAGE;
  }

  create(): void {
    this.startingRun = false;
    this.drawBackground();
    this.drawTitle();
    this.createMenu();
    this.createFooter();
    this.installInput();

    this.select(0);
    this.showMessage(this.resolveInitialMessage());

    this.publishHook();
  }

  private resolveInitialMessage(): string {
    if (this.hasExplicitMessage) {
      return this.initialMessage;
    }

    const saveService = this.registry.get('saveService') as SaveService | undefined;
    if (saveService?.loadStatus === 'corrupt') {
      this.saveNotice = 'Save data was damaged. A backup was kept and default progress restored.';
      return this.saveNotice;
    }

    if (saveService?.loadStatus === 'unsupported') {
      this.saveNotice =
        'Save data is from an unsupported version. A backup was kept and defaults restored.';
      return this.saveNotice;
    }

    return DEFAULT_TITLE_MESSAGE;
  }

  private currentSkinTexture(): string {
    const saveService = this.registry.get('saveService') as SaveService | undefined;
    const skinId = resolveSkinId(saveService?.settings.equippedSkin ?? DEFAULT_SKIN_ID);
    return skinTextureKey(skinId);
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x0b0c10, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Layered cave silhouettes.
    graphics.fillStyle(0x10151b, 1);
    graphics.fillTriangle(0, GAME_HEIGHT, 80, 54, 190, GAME_HEIGHT);
    graphics.fillTriangle(280, GAME_HEIGHT, 390, 44, 480, GAME_HEIGHT);

    graphics.fillStyle(0x141a21, 1);
    graphics.fillTriangle(150, GAME_HEIGHT, 250, 92, 350, GAME_HEIGHT);

    // Mine floor and rails.
    graphics.fillStyle(0x18120e, 1).fillRect(0, 246, GAME_WIDTH, 24);
    graphics.lineStyle(2, 0x2e343b, 1).lineBetween(0, 246, GAME_WIDTH, 246);
    graphics.lineStyle(1, 0x3a424a, 1).lineBetween(0, 252, GAME_WIDTH, 252);
    for (let x = 4; x < GAME_WIDTH; x += 34) {
      graphics.lineStyle(1, 0x241f1b, 1).lineBetween(x, 246, x + 12, 252);
    }

    // Timber supports.
    graphics.fillStyle(0x241a13, 1).fillRect(26, 64, 10, 182);
    graphics.fillRect(444, 52, 10, 194);
    graphics.fillRect(0, 78, GAME_WIDTH, 8);
    graphics.fillStyle(0x3a2a1d, 1).fillRect(28, 64, 3, 182);
    graphics.fillRect(446, 52, 3, 194);

    // Crystals and dust.
    graphics.fillStyle(0x1f6f68, 0.95).fillTriangle(398, 246, 410, 212, 422, 246);
    graphics.fillStyle(0x2a8c82, 0.9).fillTriangle(416, 246, 429, 196, 442, 246);
    graphics.fillStyle(0x9fd8cb, 0.5).fillCircle(100, 120, 1);
    graphics.fillCircle(178, 160, 1);
    graphics.fillCircle(330, 112, 1);
    graphics.fillCircle(388, 176, 1);

    // Menu backing panel.
    this.add
      .rectangle(GAME_WIDTH / 2, 155, 300, 126, 0x0b0c10, 0.72)
      .setStrokeStyle(1, 0x3a3f45, 0.9);

    // Placeholder miner and props.
    this.add.image(54, 205, 'lantern-glow').setScale(2).setAlpha(0.7);
    this.titleMiner = this.add.image(54, 217, this.currentSkinTexture()).setScale(3);
    this.add.image(94, 248, 'rock').setScale(2);
    this.add.image(422, 232, 'crate').setScale(2);
  }

  private drawTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 39, 'MINES & GOBLINS', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: '#000000',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 37, 'MINES & GOBLINS', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: '#f4d35e',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, true, true);

    this.add
      .text(GAME_WIDTH / 2, 66, 'ONE ROCK. MANY PROBLEMS.', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x3a3f45, 0.8).lineBetween(138, 82, 342, 82);
  }

  private createMenu(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: FONT_FAMILY,
      fontSize: '11px',
      color: '#cfd2d6',
    };

    this.menuTexts = MENU_ITEMS.map((item, index) => {
      const text = this.add
        .text(GAME_WIDTH / 2, 112 + index * 26, item.label, style)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on('pointerover', () => {
        this.select(index);
      });

      text.on('pointerdown', () => {
        this.activate(index);
      });

      return text;
    });
  }

  private createFooter(): void {
    this.messageText = this.add
      .text(GAME_WIDTH / 2, 224, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#9fd8cb',
        align: 'center',
        wordWrap: { width: 410 },
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 242, 'UP / DOWN TO SELECT   ENTER TO CONFIRM', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    this.add
      .text(8, 260, `v${APP_VERSION} / M5`, {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(GAME_WIDTH - 8, 260, 'M5 META BUILD', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(1, 0.5);
  }

  private installInput(): void {
    this.input.keyboard?.on('keydown', this.handleKeyDown);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    });
  }

  private handleResume(): void {
    this.titleMiner?.setTexture(this.currentSkinTexture());
    this.publishHook();
  }

  private publishHook(): void {
    setTestHook({
      ready: true,
      scene: 'Title',
      titleSelection: MENU_ITEMS[this.selectedIndex]?.label ?? '',
      runActive: runService.isActive,
      ...(this.saveNotice ? { saveNotice: this.saveNotice } : {}),
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
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
        this.activate(this.selectedIndex);
        break;
      default:
        break;
    }
  };

  private select(index: number): void {
    const count = MENU_ITEMS.length;
    this.selectedIndex = ((index % count) + count) % count;

    this.menuTexts.forEach((text, textIndex) => {
      const item = MENU_ITEMS[textIndex];
      if (!item) {
        return;
      }

      const selected = textIndex === this.selectedIndex;
      text.setText(`${selected ? '> ' : '  '}${item.label}`);
      text.setColor(selected ? '#f4d35e' : '#cfd2d6');
    });

    const selectedItem = MENU_ITEMS[this.selectedIndex];
    if (selectedItem) {
      setTestHook({ titleSelection: selectedItem.label });
    }
  }

  private activate(index: number): void {
    const item = MENU_ITEMS[index];
    if (!item) {
      return;
    }

    if (item.action === 'start-run') {
      this.startRun();
      return;
    }

    if (item.action === 'settings') {
      this.openSettings();
      return;
    }

    if (item.action === 'achievements') {
      this.openOverlay('Achievements');
      return;
    }

    if (item.action === 'skins') {
      this.openOverlay('Skins');
      return;
    }

    this.showMessage(item.message);
  }

  private openSettings(): void {
    this.scene.launch('Settings', { returnScene: 'Title' });
    this.scene.pause();
  }

  private openOverlay(sceneKey: 'Achievements' | 'Skins'): void {
    this.scene.launch(sceneKey, { returnScene: 'Title' });
    this.scene.pause();
  }

  private startRun(): void {
    if (this.startingRun) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const debugBoss = import.meta.env.DEV && params.get('boss') === '1';
    const spawnAtExit = import.meta.env.DEV && params.get('spawn') === 'exit';

    if (!debugBoss && !spawnAtExit) {
      this.scene.launch('RunSetup');
      this.scene.pause();
      return;
    }

    this.startingRun = true;
    const difficultyId = resolveDifficultyId();
    const levelId = resolveLevelId();
    const level = getLevelAsset(levelId);
    const saveService = this.registry.get('saveService') as SaveService;
    runService.startRun(difficultyId);
    saveService.recordRunStarted();
    this.showMessage(
      debugBoss
        ? 'Debug descent: the Great Worm awaits...'
        : `Descending into ${level?.title ?? 'the mine'}...`,
    );
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (debugBoss) {
        this.scene.start('Boss', { difficultyId });
        return;
      }

      this.scene.start('Level', { levelId, difficultyId, spawnAtExit });
    });
  }

  private showMessage(message: string): void {
    this.messageText.setText(message);
    this.messageText.setAlpha(0.45);
    this.tweens.add({
      targets: this.messageText,
      alpha: 1,
      duration: 160,
      ease: 'Quad.Out',
    });
    setTestHook({ message });
  }
}

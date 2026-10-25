import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { SKIN_LIST, skinTextureKey, type SkinDefinition } from '../data/skins';
import type { AudioService, SfxName } from '../services/audio-service';
import type { SaveService } from '../services/save-service';
import { setTestHook } from '../utils/test-hooks';

const FONT_FAMILY = '"Courier New", Courier, monospace';

interface SkinsSceneData {
  returnScene?: string;
}

export class SkinsScene extends Phaser.Scene {
  private returnScene = 'Title';
  private selectedIndex = 0;
  private saveService!: SaveService;
  private content: Phaser.GameObjects.Container | undefined;
  private preview: Phaser.GameObjects.Image | undefined;

  constructor() {
    super('Skins');
  }

  init(data: SkinsSceneData = {}): void {
    this.returnScene = data.returnScene ?? 'Title';
    this.selectedIndex = 0;
  }

  create(): void {
    this.saveService = this.registry.get('saveService') as SaveService;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0c10, 1).setOrigin(0);
    this.drawBackground();

    this.add
      .text(GAME_WIDTH / 2, 18, 'MINER SKINS', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#f4d35e',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 36, 'PALETTE ONLY - NO GAMEPLAY EFFECT', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5);

    this.content = this.add.container(0, 0);
    this.render();

    this.add
      .text(GAME_WIDTH / 2, 250, 'UP / DOWN SELECT   ENTER EQUIP   ESC BACK', {
        fontFamily: FONT_FAMILY,
        fontSize: '7px',
        color: '#5f6b73',
      })
      .setOrigin(0.5);

    this.installInput();
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x10151b, 1);
    graphics.fillTriangle(0, GAME_HEIGHT, 64, 32, 156, GAME_HEIGHT);
    graphics.fillTriangle(334, GAME_HEIGHT, 424, 40, 480, GAME_HEIGHT);
    graphics.fillStyle(0x18120e, 1).fillRect(0, 243, GAME_WIDTH, 27);
    graphics.lineStyle(1, 0x2e343b, 1).lineBetween(0, 243, GAME_WIDTH, 243);
  }

  private render(): void {
    this.content?.removeAll(true);
    this.preview = undefined;

    const equippedSkin = this.saveService.settings.equippedSkin;

    SKIN_LIST.forEach((skin, index) => {
      const selected = index === this.selectedIndex;
      const unlocked = this.isUnlocked(skin);
      const equipped = skin.id === equippedSkin;
      const y = 51 + index * 19;

      const row = this.add
        .rectangle(16, y, 206, 17, selected ? 0x252d36 : 0x11161b, 0.9)
        .setOrigin(0)
        .setStrokeStyle(1, selected ? 0xf4d35e : 0x3d454f, 0.9);
      const label = this.add.text(22, y + 4, skin.name, {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: unlocked ? (selected ? '#f4d35e' : '#cfd2d6') : '#5f6b73',
      });
      const status = this.add
        .text(214, y + 5, equipped ? 'EQUIPPED' : unlocked ? 'READY' : 'LOCKED', {
          fontFamily: FONT_FAMILY,
          fontSize: '6px',
          color: equipped ? '#6fe3c4' : unlocked ? '#9fd8cb' : '#5f6b73',
        })
        .setOrigin(1, 0);

      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        this.select(index);
      });

      this.content?.add([row, label, status]);
    });

    const skin = SKIN_LIST[this.selectedIndex] ?? SKIN_LIST[0];
    if (!skin) {
      return;
    }

    const unlocked = this.isUnlocked(skin);
    const panel = this.add
      .rectangle(238, 51, 226, 178, 0x11161b, 0.92)
      .setOrigin(0)
      .setStrokeStyle(1, unlocked ? 0x9fd8cb : 0x3d454f, 1);
    const glow = this.add
      .ellipse(351, 116, 130, 110, unlocked ? 0x1f6f68 : 0x1b2129, 0.25)
      .setDepth(1);
    this.preview = this.add
      .image(351, 113, skinTextureKey(skin.id))
      .setScale(5)
      .setAlpha(unlocked ? 1 : 0.35);
    const name = this.add
      .text(351, 166, skin.name.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: unlocked ? '#f4d35e' : '#77838c',
      })
      .setOrigin(0.5);
    const description = this.add
      .text(351, 181, skin.description, {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: unlocked ? '#c9d1d9' : '#77838c',
        align: 'center',
        wordWrap: { width: 208 },
      })
      .setOrigin(0.5, 0);
    const hint = this.add
      .text(351, 207, unlocked ? 'ENTER TO EQUIP' : `LOCKED: ${skin.unlockHint}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '6px',
        color: unlocked ? '#6fe3c4' : '#ff9a8a',
        align: 'center',
        wordWrap: { width: 208 },
      })
      .setOrigin(0.5, 0);

    this.content?.add([panel, glow, this.preview, name, description, hint]);

    setTestHook({
      ready: true,
      scene: 'Skins',
      skinSelection: skin.name,
      skinName: skin.name,
      skinUnlocked: unlocked,
      equippedSkin: this.saveService.settings.equippedSkin,
      message: unlocked ? skin.description : `Locked: ${skin.unlockHint}`,
    });
  }

  private isUnlocked(skin: SkinDefinition): boolean {
    return skin.unlockAchievementId === null || Boolean(this.saveService.data.skins[skin.id]);
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
        this.equipSelected();
        break;
      case 'Escape':
      case 'Backspace':
        event.preventDefault();
        this.scene.stop();
        this.scene.resume(this.returnScene);
        break;
      default:
        break;
    }
  };

  private select(index: number): void {
    const count = SKIN_LIST.length;
    this.selectedIndex = ((index % count) + count) % count;
    this.render();
  }

  private equipSelected(): void {
    const skin = SKIN_LIST[this.selectedIndex];
    if (!skin) {
      return;
    }

    if (!this.isUnlocked(skin)) {
      return;
    }

    this.saveService.equipSkin(skin.id);
    this.playSound('pickup');
    this.render();
  }

  private playSound(key: SfxName): void {
    const audio = this.registry.get('audioService') as AudioService | undefined;
    audio?.play(key);
  }
}

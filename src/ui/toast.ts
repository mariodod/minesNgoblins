import type Phaser from 'phaser';
import { SKINS } from '../data/skins';
import type { AchievementUnlock } from '../services/achievement-service';

export function showAchievementToast(
  scene: Phaser.Scene,
  unlocks: readonly AchievementUnlock[],
): void {
  if (unlocks.length === 0) {
    return;
  }

  if (scene.scene.isActive('Toast')) {
    scene.scene.stop('Toast');
  }

  scene.scene.launch('Toast', {
    title: unlocks.length === 1 ? 'ACHIEVEMENT UNLOCKED' : 'ACHIEVEMENTS UNLOCKED',
    lines: unlocks.map((unlock) =>
      unlock.skinId ? `${unlock.name}  +  ${SKINS[unlock.skinId].name} skin` : unlock.name,
    ),
  });
}

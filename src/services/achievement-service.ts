import {
  ACHIEVEMENTS,
  type AchievementContext,
  type AchievementDefinition,
  type AchievementId,
  type AchievementTrigger,
} from '../data/achievements';
import type { SecondaryItemId } from '../data/items';
import type { SkinId } from '../data/skins';
import type { ChallengeResult } from '../systems/challenges';
import type { RunSnapshot } from '../systems/run-service';
import type { SaveService } from './save-service';

export interface AchievementUnlock {
  id: AchievementId;
  name: string;
  description: string;
  skinId?: SkinId;
}

/**
 * Bridges pure achievement conditions to persistence. Newly unlocked rewards
 * are returned so the active scene can show a toast or results entry.
 */
export class AchievementService {
  private readonly save: SaveService;

  constructor(save: SaveService) {
    this.save = save;
    this.syncSkins();
  }

  /**
   * Repairs reward skins for saves that have an achievement but no matching
   * skin record, such as data written by an older reward mapping.
   */
  syncSkins(): void {
    for (const achievement of ACHIEVEMENTS) {
      const record = this.save.data.achievements[achievement.id];
      if (achievement.skinId && record) {
        this.save.unlockSkin(achievement.skinId, record.unlockedAt);
      }
    }
  }

  evaluateLevel(run: RunSnapshot, levelIndex: number, oreHunter: boolean): AchievementUnlock[] {
    return this.evaluate('level', { run, levelIndex, oreHunter });
  }

  evaluateRun(
    run: RunSnapshot,
    challenges: readonly ChallengeResult[],
    usedItems: readonly SecondaryItemId[],
  ): AchievementUnlock[] {
    return this.evaluate('run', { run, challenges, usedItems });
  }

  evaluateItemUse(run: RunSnapshot, usedItems: readonly SecondaryItemId[]): AchievementUnlock[] {
    return this.evaluate('item', { run, usedItems });
  }

  evaluate(trigger: AchievementTrigger, context: AchievementContext): AchievementUnlock[] {
    const unlocked: AchievementUnlock[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (!achievement.triggers.includes(trigger)) {
        continue;
      }

      if (this.save.data.achievements[achievement.id]) {
        continue;
      }

      if (!achievement.isEarned(context)) {
        continue;
      }

      const record = this.unlock(achievement);
      if (record) {
        unlocked.push(record);
      }
    }

    return unlocked;
  }

  private unlock(achievement: AchievementDefinition): AchievementUnlock | null {
    if (!this.save.unlockAchievement(achievement.id)) {
      return null;
    }

    const unlock: AchievementUnlock = {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
    };

    if (achievement.skinId && this.save.unlockSkin(achievement.skinId)) {
      unlock.skinId = achievement.skinId;
    }

    return unlock;
  }
}

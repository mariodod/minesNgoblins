import type { DifficultyId } from '../data/difficulties';
import type { SecondaryItemId } from '../data/items';
import type { DamageSource } from './damage';

export type RunOutcome = 'abandoned' | 'victory' | null;

export interface RunKillRecord {
  enemyId: string;
  source: DamageSource;
  levelId: string | null;
}

export interface RunDamageRecord {
  amount: number;
  source: DamageSource;
  levelId: string | null;
  boss: boolean;
}

export interface RunItemUseRecord {
  itemId: SecondaryItemId;
  levelId: string | null;
}

export interface RunSnapshot {
  active: boolean;
  difficultyId: DifficultyId;
  levelIndex: number;
  levelId: string | null;
  startedAt: number;
  levelStartedAt: number;
  kills: number;
  killRecords: RunKillRecord[];
  damageTaken: number;
  damageRecords: RunDamageRecord[];
  deaths: number;
  itemUses: number;
  itemUseRecords: RunItemUseRecord[];
  itemsPickedUp: number;
  oreCollected: number;
  levelOreCollected: number;
  levelOreTotal: number;
  levelsCompleted: number;
  bossAttempts: number;
  bossDamageTaken: number;
  bossDefeated: boolean;
  outcome: RunOutcome;
  finishedAt: number;
  runDurationMs: number;
}

export interface RunCarryState {
  hp: number;
  ore: number;
  itemId: SecondaryItemId | null;
  itemUses: number;
}

const INACTIVE_STATE: RunSnapshot = {
  active: false,
  difficultyId: 'normal',
  levelIndex: 0,
  levelId: null,
  startedAt: 0,
  levelStartedAt: 0,
  kills: 0,
  killRecords: [],
  damageTaken: 0,
  damageRecords: [],
  deaths: 0,
  itemUses: 0,
  itemUseRecords: [],
  itemsPickedUp: 0,
  oreCollected: 0,
  levelOreCollected: 0,
  levelOreTotal: 0,
  levelsCompleted: 0,
  bossAttempts: 0,
  bossDamageTaken: 0,
  bossDefeated: false,
  outcome: null,
  finishedAt: 0,
  runDurationMs: 0,
};

function createInactiveState(): RunSnapshot {
  return {
    ...INACTIVE_STATE,
    killRecords: [],
    damageRecords: [],
    itemUseRecords: [],
  };
}

/**
 * Session-scoped run state. Scenes report gameplay events here; rule,
 * achievement, and results services consume the same snapshot.
 */
export class RunService {
  private state: RunSnapshot = createInactiveState();
  private levelCarry: RunCarryState | null = null;

  get isActive(): boolean {
    return this.state.active;
  }

  get snapshot(): RunSnapshot {
    return {
      ...this.state,
      killRecords: [...this.state.killRecords],
      damageRecords: [...this.state.damageRecords],
      itemUseRecords: [...this.state.itemUseRecords],
    };
  }

  startRun(difficultyId: DifficultyId, now = Date.now()): void {
    this.state = {
      ...createInactiveState(),
      active: true,
      difficultyId,
      startedAt: now,
      levelStartedAt: now,
    };
    this.levelCarry = null;
  }

  enterLevel(levelIndex: number, levelId: string, now = Date.now(), levelOreTotal = 0): void {
    if (!this.state.active) {
      throw new Error('Cannot enter a level without an active run.');
    }

    this.state.levelIndex = Math.max(0, Math.floor(levelIndex));
    this.state.levelId = levelId;
    this.state.levelStartedAt = now;
    this.state.levelOreCollected = 0;
    this.state.levelOreTotal = Math.max(0, Math.floor(levelOreTotal));
  }

  completeLevel(carry: RunCarryState): void {
    if (!this.state.active) {
      return;
    }

    this.state.levelsCompleted += 1;
    this.levelCarry = {
      hp: Math.max(1, Math.floor(carry.hp)),
      ore: Math.max(0, Math.floor(carry.ore)),
      itemId: carry.itemId,
      itemUses: Math.max(0, Math.floor(carry.itemUses)),
    };
  }

  /**
   * Registers a boss attempt. Retrying the encounter increments this value
   * while preserving every other run statistic.
   */
  enterBoss(now = Date.now()): void {
    if (!this.state.active) {
      throw new Error('Cannot enter the boss arena without an active run.');
    }

    this.state.levelId = 'great-worm';
    this.state.levelStartedAt = now;
    this.state.bossAttempts += 1;
    this.state.bossDamageTaken = 0;
    this.state.levelOreCollected = 0;
    this.state.levelOreTotal = 0;
  }

  /**
   * Boss victory is the only successful end state for a run.
   */
  completeBoss(now = Date.now()): void {
    if (!this.state.active || this.state.bossDefeated) {
      return;
    }

    this.state.bossDefeated = true;
    this.state.outcome = 'victory';
    this.state.finishedAt = now;
    this.state.runDurationMs = Math.max(0, now - this.state.startedAt);
    this.state.active = false;
    this.levelCarry = null;
  }

  takeCarry(): RunCarryState | null {
    const carry = this.levelCarry;
    this.levelCarry = null;
    return carry;
  }

  recordKill(source: DamageSource, enemyId: string): void {
    if (this.state.active) {
      this.state.kills += 1;
      this.state.killRecords.push({
        enemyId,
        source,
        levelId: this.state.levelId,
      });
    }
  }

  recordDamage(amount: number, source: DamageSource, boss = false): void {
    if (this.state.active && amount > 0) {
      this.state.damageTaken += amount;
      this.state.damageRecords.push({
        amount,
        source,
        levelId: this.state.levelId,
        boss,
      });

      if (boss) {
        this.state.bossDamageTaken += amount;
      }
    }
  }

  recordDeath(): void {
    if (this.state.active) {
      this.state.deaths += 1;
    }
  }

  recordItemUse(itemId: SecondaryItemId): void {
    if (this.state.active) {
      this.state.itemUses += 1;
      this.state.itemUseRecords.push({
        itemId,
        levelId: this.state.levelId,
      });
    }
  }

  recordPickup(): void {
    if (this.state.active) {
      this.state.itemsPickedUp += 1;
    }
  }

  recordOre(amount: number): void {
    if (this.state.active && amount > 0) {
      this.state.oreCollected += amount;
      this.state.levelOreCollected += amount;
    }
  }

  elapsedMs(now = Date.now()): number {
    return this.state.active ? Math.max(0, now - this.state.startedAt) : 0;
  }

  levelElapsedMs(now = Date.now()): number {
    return this.state.active ? Math.max(0, now - this.state.levelStartedAt) : 0;
  }

  endRun(now = Date.now()): void {
    if (this.state.active) {
      this.state.outcome = 'abandoned';
      this.state.finishedAt = now;
      this.state.runDurationMs = Math.max(0, now - this.state.startedAt);
    }

    this.state.active = false;
    this.levelCarry = null;
  }

  reset(): void {
    this.state = createInactiveState();
    this.levelCarry = null;
  }
}

export const runService = new RunService();

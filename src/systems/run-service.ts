import type { DifficultyId } from '../data/difficulties';
import type { SecondaryItemId } from '../data/items';

export interface RunSnapshot {
  active: boolean;
  difficultyId: DifficultyId;
  levelIndex: number;
  levelId: string | null;
  startedAt: number;
  levelStartedAt: number;
  kills: number;
  damageTaken: number;
  deaths: number;
  itemUses: number;
  itemsPickedUp: number;
  oreCollected: number;
  levelsCompleted: number;
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
  damageTaken: 0,
  deaths: 0,
  itemUses: 0,
  itemsPickedUp: 0,
  oreCollected: 0,
  levelsCompleted: 0,
};

/**
 * Session-scoped run state. Scenes report gameplay events here; future rule,
 * achievement, and results services can consume the same snapshot.
 */
export class RunService {
  private state: RunSnapshot = { ...INACTIVE_STATE };
  private levelCarry: RunCarryState | null = null;

  get isActive(): boolean {
    return this.state.active;
  }

  get snapshot(): RunSnapshot {
    return { ...this.state };
  }

  startRun(difficultyId: DifficultyId, now = Date.now()): void {
    this.state = {
      ...INACTIVE_STATE,
      active: true,
      difficultyId,
      startedAt: now,
      levelStartedAt: now,
    };
    this.levelCarry = null;
  }

  enterLevel(levelIndex: number, levelId: string, now = Date.now()): void {
    if (!this.state.active) {
      throw new Error('Cannot enter a level without an active run.');
    }

    this.state.levelIndex = Math.max(0, Math.floor(levelIndex));
    this.state.levelId = levelId;
    this.state.levelStartedAt = now;
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

  takeCarry(): RunCarryState | null {
    const carry = this.levelCarry;
    this.levelCarry = null;
    return carry;
  }

  recordKill(): void {
    if (this.state.active) {
      this.state.kills += 1;
    }
  }

  recordDamage(amount: number): void {
    if (this.state.active && amount > 0) {
      this.state.damageTaken += amount;
    }
  }

  recordDeath(): void {
    if (this.state.active) {
      this.state.deaths += 1;
    }
  }

  recordItemUse(): void {
    if (this.state.active) {
      this.state.itemUses += 1;
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
    }
  }

  elapsedMs(now = Date.now()): number {
    return this.state.active ? Math.max(0, now - this.state.startedAt) : 0;
  }

  levelElapsedMs(now = Date.now()): number {
    return this.state.active ? Math.max(0, now - this.state.levelStartedAt) : 0;
  }

  endRun(): void {
    this.state.active = false;
    this.levelCarry = null;
  }

  reset(): void {
    this.state = { ...INACTIVE_STATE };
    this.levelCarry = null;
  }
}

export const runService = new RunService();

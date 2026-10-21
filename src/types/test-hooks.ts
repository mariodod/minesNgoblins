export interface TestEnemySnapshot {
  type: string;
  hp: number;
  x: number;
  y: number;
  facing: number;
  phase: string;
  stunned: boolean;
}

export interface MinesTestHook {
  ready: boolean;
  scene: string;
  version: string;
  titleSelection?: string;
  message?: string;
  levelId?: string;
  playerX?: number;
  playerY?: number;
  playerVx?: number;
  playerVy?: number;
  grounded?: boolean;
  hp?: number;
  rocksThrown?: number;
  itemId?: string | null;
  itemUses?: number;
  itemMaxUses?: number;
  ore?: number;
  itemsUsed?: number;
  itemsCollected?: number;
  cratesBroken?: number;
  crates?: number;
  pickups?: number;
  pedestals?: number;
  itemProjectiles?: number;
  enemyCount?: number;
  dummyHp?: number;
  dead?: boolean;
  fps?: number;
  frameCount?: number;
  debug?: boolean;
  enemies?: TestEnemySnapshot[];
  enemyProjectiles?: number;
  enemyProjectilePositions?: Array<{ x: number; y: number }>;
  fallingRocks?: number;
  fallingRockPositions?: Array<{
    x: number;
    y: number;
    vy: number;
    blockedDown: boolean;
  }>;
  playerBody?: boolean;
  deflects?: number;
  bonesThrown?: number;
  boneHits?: number;
  boneBreaks?: number;
  hazardsTriggered?: number;
}

declare global {
  interface Window {
    __MINES_TEST__?: MinesTestHook;
  }
}

export {};

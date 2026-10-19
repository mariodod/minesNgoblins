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
  enemyCount?: number;
  dummyHp?: number;
  dead?: boolean;
  fps?: number;
  frameCount?: number;
  debug?: boolean;
}

declare global {
  interface Window {
    __MINES_TEST__?: MinesTestHook;
  }
}

export {};

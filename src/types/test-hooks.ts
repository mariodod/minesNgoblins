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
}

declare global {
  interface Window {
    __MINES_TEST__?: MinesTestHook;
  }
}

export {};

export interface MinesTestHook {
  ready: boolean;
  scene: string;
  version: string;
  titleSelection?: string;
  message?: string;
}

declare global {
  interface Window {
    __MINES_TEST__?: MinesTestHook;
  }
}

export {};

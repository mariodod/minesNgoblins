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
  levelNumber?: number;
  levelCount?: number;
  exit?: { x: number; y: number; width: number; height: number };
  playerX?: number;
  playerY?: number;
  playerVx?: number;
  playerVy?: number;
  grounded?: boolean;
  hp?: number;
  playerMaxHp?: number;
  difficulty?: string;
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
  runActive?: boolean;
  runLevelIndex?: number;
  runKills?: number;
  runDamageTaken?: number;
  runDeaths?: number;
  runItemUses?: number;
  runOre?: number;
  runItemsPickedUp?: number;
  runLevelsCompleted?: number;
  runTimeMs?: number;
  runBossAttempts?: number;
  runBossDefeated?: boolean;
  runOutcome?: string | null;
  runDurationMs?: number;
  runCompleted?: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  bossPhase?: number;
  bossState?: string;
  bossAttack?: string | null;
  bossVulnerable?: boolean;
  bossHeadX?: number;
  bossHeadY?: number;
  bossHeadHits?: number;
  bossBodyHits?: number;
  bossDeflects?: number;
  bossWormlings?: number;
  bossProjectiles?: number;
  bossShockwaves?: number;
  bossFallingRocks?: number;
  bossSupplies?: number;
  bossExitOpen?: boolean;
  bossVictorySequence?: boolean;
  pauseSelection?: string;
  settingsSelection?: string;
  masterVolume?: number;
  screenShake?: string;
}

declare global {
  interface Window {
    __MINES_TEST__?: MinesTestHook;
    __MINES_DEBUG__?: MinesDebugApi;
  }
}

export interface MinesDebugApi {
  hitBoss: (part: 'body' | 'head', amount?: number) => boolean;
  skipBossPhase: () => void;
  defeatBoss: () => void;
  defeatPlayer: () => void;
  damagePlayer: (amount?: number) => void;
  healPlayer: () => void;
}

export {};

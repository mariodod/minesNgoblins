import type { DifficultyId } from './difficulties';
import type { PickupId } from './items';

export type BossPhase = 1 | 2 | 3;
export type BossPart = 'body' | 'head';
export type BossAttack =
  'emerge-bite' | 'rock-spit' | 'burrow-charge' | 'quake' | 'summon-wormlings';

export type BossFightState =
  'intro' | 'idle' | 'telegraph' | 'attacking' | 'recovering' | 'transition' | 'dead' | 'victory';

export interface BossHole {
  x: number;
  y: number;
}

export interface BossRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BossArenaDefinition {
  width: number;
  height: number;
  floorY: number;
  ceilingY: number;
  spawn: { x: number; y: number };
  exit: BossRect;
  holes: readonly BossHole[];
  oneWayPlatforms: readonly BossRect[];
  ceilingRocks: readonly BossHole[];
  supplySpots: readonly BossHole[];
}

export interface BossPhaseTuning {
  recoveryMs: number;
  telegraphScale: number;
  spitRocks: number;
  quakeRocks: number;
  maxWormlings: number;
  summonCount: number;
}

export interface BossAttackTuning {
  telegraphMs: number;
  baseDamage: number;
}

export interface BossDefinition {
  id: string;
  name: string;
  baseHp: number;
  phaseThresholds: readonly [number, number];
  segmentCount: number;
  segmentSpacing: number;
  headSurfaceOffset: number;
}

/**
 * The fight is intentionally a little longer than the GDD's original 24 HP
 * sketch. The boss uses its own difficulty multiplier so Crazy keeps the
 * designed 120 HP while Normal has enough health to fill a 2-4 minute fight.
 */
export const BOSS_DEFINITION: BossDefinition = {
  id: 'great-worm',
  name: 'The Great Worm',
  baseHp: 48,
  phaseThresholds: [0.66, 0.33],
  segmentCount: 7,
  segmentSpacing: 15,
  headSurfaceOffset: 38,
};

export const BOSS_ARENA: BossArenaDefinition = {
  width: 960,
  height: 270,
  floorY: 240,
  ceilingY: 18,
  spawn: { x: 54, y: 216 },
  exit: { x: 900, y: 192, width: 44, height: 48 },
  holes: [
    { x: 240, y: 240 },
    { x: 480, y: 240 },
    { x: 720, y: 240 },
  ],
  oneWayPlatforms: [
    { x: 116, y: 176, width: 96, height: 12 },
    { x: 748, y: 176, width: 96, height: 12 },
  ],
  ceilingRocks: [
    { x: 180, y: 24 },
    { x: 360, y: 24 },
    { x: 600, y: 24 },
    { x: 780, y: 24 },
  ],
  supplySpots: [
    { x: 128, y: 240 },
    { x: 832, y: 240 },
  ],
};

export const BOSS_PHASE_TUNING: Record<BossPhase, BossPhaseTuning> = {
  1: {
    recoveryMs: 2500,
    telegraphScale: 1,
    spitRocks: 1,
    quakeRocks: 0,
    maxWormlings: 0,
    summonCount: 0,
  },
  2: {
    recoveryMs: 2250,
    telegraphScale: 0.92,
    spitRocks: 2,
    quakeRocks: 3,
    maxWormlings: 2,
    summonCount: 2,
  },
  3: {
    recoveryMs: 1950,
    telegraphScale: 0.82,
    spitRocks: 3,
    quakeRocks: 4,
    maxWormlings: 2,
    summonCount: 2,
  },
};

export const BOSS_ATTACK_TUNING: Record<BossAttack, BossAttackTuning> = {
  'emerge-bite': { telegraphMs: 680, baseDamage: 2 },
  'rock-spit': { telegraphMs: 620, baseDamage: 1 },
  'burrow-charge': { telegraphMs: 900, baseDamage: 2 },
  quake: { telegraphMs: 980, baseDamage: 2 },
  'summon-wormlings': { telegraphMs: 850, baseDamage: 0 },
};

export const BOSS_ATTACK_SEQUENCES: Record<BossPhase, readonly BossAttack[]> = {
  1: ['emerge-bite', 'rock-spit', 'emerge-bite', 'rock-spit'],
  2: ['burrow-charge', 'rock-spit', 'emerge-bite', 'quake', 'summon-wormlings'],
  3: ['quake', 'summon-wormlings', 'rock-spit', 'burrow-charge', 'emerge-bite', 'quake'],
};

export const BOSS_SUPPLIES: Record<2 | 3, readonly PickupId[]> = {
  2: ['healing-salve', 'knife'],
  3: ['healing-salve', 'rune-scroll'],
};

export const BOSS_WORMLING_HP: Record<DifficultyId, number> = {
  normal: 2,
  hard: 3,
  impossible: 3,
  crazy: 4,
};

export const BOSS_ATTACK_NAMES: Record<BossAttack, string> = {
  'emerge-bite': 'EMERGE BITE',
  'rock-spit': 'ROCK SPIT',
  'burrow-charge': 'BURROW CHARGE',
  quake: 'QUAKE',
  'summon-wormlings': 'SUMMON WORMLINGS',
};

export const BOSS_PHASE_NAMES: Record<BossPhase, string> = {
  1: 'PHASE I',
  2: 'PHASE II',
  3: 'PHASE III',
};

/**
 * Boss HP uses the explicit boss multiplier so Crazy stays at the designed
 * 120 HP while Normal can support a longer, readable encounter.
 */
export function computeBossHp(baseHp: number, bossHpMultiplier: number): number {
  return Math.max(1, Math.ceil(baseHp * bossHpMultiplier));
}

/**
 * Health at or below a threshold enters the next phase. The worm starts in
 * phase one and only ever advances as its health drops.
 */
export function resolveBossPhase(hp: number, maxHp: number): BossPhase {
  if (maxHp <= 0 || hp <= 0) {
    return 3;
  }

  const ratio = hp / maxHp;

  if (ratio > BOSS_DEFINITION.phaseThresholds[0]) {
    return 1;
  }

  if (ratio > BOSS_DEFINITION.phaseThresholds[1]) {
    return 2;
  }

  return 3;
}

export function selectBossAttack(phase: BossPhase, index: number): BossAttack {
  const sequence = BOSS_ATTACK_SEQUENCES[phase];
  const safeIndex = ((index % sequence.length) + sequence.length) % sequence.length;

  return sequence[safeIndex] ?? 'emerge-bite';
}

/**
 * Only the head takes damage. Body hits are a deliberate no-damage deflect in
 * both the entity and the boss arena.
 */
export function resolveBossPartDamage(part: BossPart, amount: number): number {
  if (part === 'body' || amount <= 0) {
    return 0;
  }

  return amount;
}

export function chooseHoleForAttack(
  attack: BossAttack,
  playerX: number,
  holes: readonly BossHole[],
): number {
  if (attack === 'quake' || attack === 'summon-wormlings') {
    return 1;
  }

  const nearest = nearestHoleIndex(playerX, holes);

  if (attack === 'rock-spit') {
    // The centre hole keeps spits inside the midpoint camera and gives the
    // player room to read the telegraph instead of a projectile from offscreen.
    return Math.floor(holes.length / 2);
  }

  return nearest;
}

export function nearestHoleIndex(x: number, holes: readonly BossHole[]): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  holes.forEach((hole, index) => {
    const distance = Math.abs(hole.x - x);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

/**
 * A charge starts on the side opposite the player so the warning lane leaves
 * time to move or jump.
 */
export function chooseChargeDirection(playerX: number, arenaWidth: number): -1 | 1 {
  return playerX < arenaWidth / 2 ? -1 : 1;
}

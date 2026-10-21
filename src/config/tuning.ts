export const PLAYER_TUNING = {
  maxHp: 5,
  runSpeed: 110,
  groundAcceleration: 1400,
  groundFriction: 1800,
  airAcceleration: 900,
  airDrag: 200,
  jumpVelocity: 300,
  gravity: 900,
  maxFallSpeed: 500,
  coyoteMs: 100,
  jumpBufferMs: 120,
  jumpCutMultiplier: 0.5,
  dropThroughMs: 250,
  invulnerableMs: 1200,
  knockbackX: 160,
  knockbackY: 180,
} as const;

export const ROCK_TUNING = {
  speed: 300,
  gravity: 350,
  bounce: 0.45,
  cooldownMs: 400,
  lifetimeMs: 4000,
  bounceLifetimeMs: 750,
  damage: 1,
} as const;

export const PROJECTILE_TUNING = {
  bone: {
    lifetimeMs: 3000,
    damage: 1,
    bounce: 0,
  },
} as const;

export const ENEMY_TUNING = {
  hurtFlashMs: 70,
  knockbackX: 70,
  knockbackY: 110,
  stunMs: 1000,
  deathDurationMs: 260,
  hpPipOffsetY: 6,
  hpPipSpacing: 5,
  hpPipWidth: 4,
  hpPipHeight: 2,
  minHpForPips: 3,
} as const;

export const FEEDBACK_TUNING = {
  hitStopMs: 45,
  hitParticles: 5,
  killParticles: 8,
  screenShakeMs: 120,
  screenShakeIntensity: 0.006,
} as const;

export const HAZARD_TUNING = {
  spikeDamage: 1,
  fallingRockDamage: 2,
  fallingRockTelegraphMs: 650,
  fallingRockShadowWidth: 24,
  fallingRockShadowHeight: 5,
} as const;

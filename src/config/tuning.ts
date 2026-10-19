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
  speed: 260,
  gravity: 600,
  bounce: 0.45,
  cooldownMs: 400,
  lifetimeMs: 4000,
  bounceLifetimeMs: 750,
  damage: 1,
} as const;

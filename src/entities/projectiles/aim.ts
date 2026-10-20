export type AimDirection = 'up' | 'level' | 'down';

export interface ProjectileLaunch {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface ProjectileLaunchOptions {
  originX: number;
  originY: number;
  facing: number;
  aim: AimDirection;
  speed: number;
}

export interface AimedArcOptions {
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  speed: number;
  gravity: number;
  minFlightTime?: number;
  maxFlightTime?: number;
  maxRiseSpeed?: number;
}

export interface AimedArcLaunch {
  velocityX: number;
  velocityY: number;
  flightTime: number;
}

/**
 * Pure projectile-aim math so arc behavior can be unit tested without a scene.
 */
export function computeProjectileLaunch(options: ProjectileLaunchOptions): ProjectileLaunch {
  const facing = options.facing >= 0 ? 1 : -1;
  const angle = options.aim === 'up' ? -Math.PI / 4 : options.aim === 'down' ? Math.PI / 4 : 0;

  return {
    x: options.originX + facing * 7,
    y: options.originY - 2,
    velocityX: Math.cos(angle) * options.speed * facing,
    velocityY: Math.sin(angle) * options.speed,
  };
}

/**
 * Solves the launch velocity needed for a projectile to pass through a target
 * under constant gravity. Used by enemy archers so their telegraphs are fair.
 */
export function computeAimedArc(options: AimedArcOptions): AimedArcLaunch {
  const minFlightTime = options.minFlightTime ?? 0.3;
  const maxFlightTime = options.maxFlightTime ?? 1.6;
  const maxRiseSpeed = options.maxRiseSpeed ?? 360;
  const direction = options.targetX >= options.originX ? 1 : -1;
  const horizontalDistance = Math.abs(options.targetX - options.originX);
  const flightTime = Math.min(
    maxFlightTime,
    Math.max(minFlightTime, horizontalDistance / options.speed),
  );
  const requiredVelocityY =
    (options.targetY - options.originY - 0.5 * options.gravity * flightTime * flightTime) /
    flightTime;

  return {
    velocityX: direction * options.speed,
    velocityY: Math.max(-maxRiseSpeed, Math.min(80, requiredVelocityY)),
    flightTime,
  };
}

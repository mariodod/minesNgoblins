import { ROCK_TUNING } from '../config/tuning';

export type AimDirection = 'up' | 'level' | 'down';

export interface RockLaunch {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface RockLaunchOptions {
  originX: number;
  originY: number;
  facing: number;
  aim: AimDirection;
}

/**
 * Pure rock-aim math so the arc behavior can be unit tested without a scene.
 */
export function computeRockLaunch(options: RockLaunchOptions): RockLaunch {
  const facing = options.facing >= 0 ? 1 : -1;
  const angle = options.aim === 'up' ? -Math.PI / 4 : options.aim === 'down' ? Math.PI / 4 : 0;

  return {
    x: options.originX + facing * 7,
    y: options.originY - 2,
    velocityX: Math.cos(angle) * ROCK_TUNING.speed * facing,
    velocityY: Math.sin(angle) * ROCK_TUNING.speed,
  };
}

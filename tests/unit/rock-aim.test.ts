import { describe, expect, it } from 'vitest';
import { ROCK_TUNING } from '../../src/config/tuning';
import { computeRockLaunch } from '../../src/entities/rock-aim';

describe('computeRockLaunch', () => {
  it('throws level when aiming horizontally to the right', () => {
    const launch = computeRockLaunch({ originX: 100, originY: 50, facing: 1, aim: 'level' });

    expect(launch.x).toBe(107);
    expect(launch.y).toBe(48);
    expect(launch.velocityX).toBeCloseTo(ROCK_TUNING.speed);
    expect(launch.velocityY).toBeCloseTo(0);
  });

  it('throws level to the left when facing left', () => {
    const launch = computeRockLaunch({ originX: 100, originY: 50, facing: -1, aim: 'level' });

    expect(launch.x).toBe(93);
    expect(launch.velocityX).toBeCloseTo(-ROCK_TUNING.speed);
    expect(launch.velocityY).toBeCloseTo(0);
  });

  it('throws upward at 45 degrees when aiming up', () => {
    const launch = computeRockLaunch({ originX: 100, originY: 50, facing: 1, aim: 'up' });
    const component = ROCK_TUNING.speed * Math.SQRT1_2;

    expect(launch.velocityX).toBeCloseTo(component);
    expect(launch.velocityY).toBeCloseTo(-component);
  });

  it('throws downward at 45 degrees when aiming down', () => {
    const launch = computeRockLaunch({ originX: 100, originY: 50, facing: -1, aim: 'down' });
    const component = ROCK_TUNING.speed * Math.SQRT1_2;

    expect(launch.velocityX).toBeCloseTo(-component);
    expect(launch.velocityY).toBeCloseTo(component);
  });

  it('treats a zero facing value as right', () => {
    const launch = computeRockLaunch({ originX: 100, originY: 50, facing: 0, aim: 'level' });

    expect(launch.x).toBe(107);
    expect(launch.velocityX).toBeCloseTo(ROCK_TUNING.speed);
  });
});

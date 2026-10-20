import { describe, expect, it } from 'vitest';
import { ROCK_TUNING } from '../../src/config/tuning';
import { computeAimedArc, computeProjectileLaunch } from '../../src/entities/projectiles/aim';

const speed = ROCK_TUNING.speed;

describe('computeProjectileLaunch', () => {
  it('throws level when aiming horizontally to the right', () => {
    const launch = computeProjectileLaunch({
      originX: 100,
      originY: 50,
      facing: 1,
      aim: 'level',
      speed,
    });

    expect(launch.x).toBe(107);
    expect(launch.y).toBe(48);
    expect(launch.velocityX).toBeCloseTo(speed);
    expect(launch.velocityY).toBeCloseTo(0);
  });

  it('throws level to the left when facing left', () => {
    const launch = computeProjectileLaunch({
      originX: 100,
      originY: 50,
      facing: -1,
      aim: 'level',
      speed,
    });

    expect(launch.x).toBe(93);
    expect(launch.velocityX).toBeCloseTo(-speed);
    expect(launch.velocityY).toBeCloseTo(0);
  });

  it('throws upward at 45 degrees when aiming up', () => {
    const launch = computeProjectileLaunch({
      originX: 100,
      originY: 50,
      facing: 1,
      aim: 'up',
      speed,
    });
    const component = speed * Math.SQRT1_2;

    expect(launch.velocityX).toBeCloseTo(component);
    expect(launch.velocityY).toBeCloseTo(-component);
  });

  it('throws downward at 45 degrees when aiming down', () => {
    const launch = computeProjectileLaunch({
      originX: 100,
      originY: 50,
      facing: -1,
      aim: 'down',
      speed,
    });
    const component = speed * Math.SQRT1_2;

    expect(launch.velocityX).toBeCloseTo(-component);
    expect(launch.velocityY).toBeCloseTo(component);
  });

  it('treats a zero facing value as right', () => {
    const launch = computeProjectileLaunch({
      originX: 100,
      originY: 50,
      facing: 0,
      aim: 'level',
      speed,
    });

    expect(launch.x).toBe(107);
    expect(launch.velocityX).toBeCloseTo(speed);
  });

  it('uses the requested projectile speed', () => {
    const launch = computeProjectileLaunch({
      originX: 10,
      originY: 10,
      facing: 1,
      aim: 'level',
      speed: 999,
    });

    expect(launch.velocityX).toBeCloseTo(999);
  });
});

describe('computeAimedArc', () => {
  const originX = 952;
  const originY = 269;
  const speed = 160;
  const gravity = 500;

  it('passes through a target at skeleton range', () => {
    const targetX = 820;
    const targetY = 270;
    const arc = computeAimedArc({
      originX,
      originY,
      targetX,
      targetY,
      speed,
      gravity,
    });
    const endX = originX + arc.velocityX * arc.flightTime;
    const endY = originY + arc.velocityY * arc.flightTime + 0.5 * gravity * arc.flightTime ** 2;

    expect(endX).toBeCloseTo(targetX);
    expect(endY).toBeCloseTo(targetY);
    expect(arc.velocityY).toBeGreaterThan(-360);
    expect(arc.velocityX).toBe(-speed);
  });

  it('reaches the edge of the skeleton detect range without clamping', () => {
    const targetX = 722;
    const targetY = 270;
    const arc = computeAimedArc({
      originX,
      originY,
      targetX,
      targetY,
      speed,
      gravity,
    });
    const endX = originX + arc.velocityX * arc.flightTime;
    const endY = originY + arc.velocityY * arc.flightTime + 0.5 * gravity * arc.flightTime ** 2;

    expect(endX).toBeCloseTo(targetX);
    expect(endY).toBeCloseTo(targetY, 0);
    expect(arc.velocityY).toBeGreaterThanOrEqual(-360);
  });

  it('aims right when the target is to the right', () => {
    const arc = computeAimedArc({
      originX,
      originY,
      targetX: 1080,
      targetY: 270,
      speed,
      gravity,
    });

    expect(arc.velocityX).toBe(speed);
  });

  it('clamps extreme upward launches', () => {
    const arc = computeAimedArc({
      originX,
      originY,
      targetX: 952 + 200,
      targetY: -500,
      speed,
      gravity,
      maxRiseSpeed: 300,
    });

    expect(arc.velocityY).toBe(-300);
  });
});

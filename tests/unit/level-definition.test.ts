import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelValidationError, parseLevelDefinition } from '../../src/data/level-definition';

const mapPath = new URL('../../public/maps/movement-test.json', import.meta.url);
const movementTestMap = JSON.parse(readFileSync(mapPath, 'utf8')) as Record<string, unknown>;

function cloneMap(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(movementTestMap)) as Record<string, unknown>;
}

describe('parseLevelDefinition', () => {
  it('parses the movement test map', () => {
    const level = parseLevelDefinition(movementTestMap);

    expect(level.id).toBe('movement-test');
    expect(level.worldWidth).toBe(1024);
    expect(level.worldHeight).toBe(320);
    expect(level.solids).toHaveLength(4);
    expect(level.oneWayPlatforms).toHaveLength(7);
    expect(level.enemies).toHaveLength(2);
    expect(level.spawn).toEqual({ x: 56, y: 260 });
    expect(level.killY).toBe(380);
  });

  it('rejects a missing spawn point', () => {
    const map = cloneMap();
    delete map['spawn'];

    expect(() => parseLevelDefinition(map)).toThrow(LevelValidationError);
  });

  it('rejects geometry that extends past the level bounds', () => {
    const map = cloneMap();
    map['solids'] = [{ x: 1000, y: 0, width: 100, height: 16 }];

    expect(() => parseLevelDefinition(map)).toThrow(/extends past the level bounds/);
  });

  it('rejects unknown enemy types', () => {
    const map = cloneMap();
    map['enemies'] = [{ type: 'dragon', x: 64, y: 64 }];

    expect(() => parseLevelDefinition(map)).toThrow(/enemies\[0\]\.type/);
  });

  it('rejects a kill plane above the level floor', () => {
    const map = cloneMap();
    map['killY'] = 128;

    expect(() => parseLevelDefinition(map)).toThrow(/killY must be below/);
  });
});

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
    expect(level.worldWidth).toBe(1280);
    expect(level.worldHeight).toBe(320);
    expect(level.solids).toHaveLength(2);
    expect(level.oneWayPlatforms).toHaveLength(9);
    expect(level.enemies).toHaveLength(5);
    expect(level.enemies.map((enemy) => enemy.type)).toEqual([
      'practice-dummy',
      'cave-bat',
      'goblin-scavenger',
      'skeleton-thrower',
      'armored-beetle',
    ]);
    expect(level.hazards).toHaveLength(2);
    expect(level.hazards[0]).toMatchObject({ type: 'spikes', width: 32, height: 8 });
    expect(level.hazards[1]).toMatchObject({ type: 'falling-rock', width: 32, height: 24 });
    expect(level.props).toHaveLength(9);
    expect(level.props.find((prop) => prop.type === 'pedestal')).toMatchObject({
      type: 'pedestal',
      item: 'knife',
    });
    expect(level.props.filter((prop) => prop.type === 'crate')).toHaveLength(3);
    expect(level.enemyHpBonus).toBe(0);
    expect(level.spawn).toEqual({ x: 56, y: 260 });
    expect(level.killY).toBe(380);
  });

  it('defaults hazards and enemy HP bonus when omitted', () => {
    const map = cloneMap();
    delete map['hazards'];
    delete map['enemyHpBonus'];

    const level = parseLevelDefinition(map);

    expect(level.hazards).toEqual([]);
    expect(level.enemyHpBonus).toBe(0);
  });

  it('rejects a missing spawn point', () => {
    const map = cloneMap();
    delete map['spawn'];

    expect(() => parseLevelDefinition(map)).toThrow(LevelValidationError);
  });

  it('rejects geometry that extends past the level bounds', () => {
    const map = cloneMap();
    map['solids'] = [{ x: 1200, y: 0, width: 100, height: 16 }];

    expect(() => parseLevelDefinition(map)).toThrow(/extends past the level bounds/);
  });

  it('rejects unknown enemy types', () => {
    const map = cloneMap();
    map['enemies'] = [{ type: 'dragon', x: 64, y: 64 }];

    expect(() => parseLevelDefinition(map)).toThrow(/enemies\[0\]\.type/);
  });

  it('rejects unknown hazard types', () => {
    const map = cloneMap();
    map['hazards'] = [{ type: 'lava', x: 64, y: 64, width: 16, height: 16 }];

    expect(() => parseLevelDefinition(map)).toThrow(/hazards\[0\]\.type/);
  });

  it('rejects a crate without authored contents', () => {
    const map = cloneMap();
    map['props'] = [{ type: 'crate', x: 64, y: 64 }];

    expect(() => parseLevelDefinition(map)).toThrow(/contents/);
  });

  it('rejects a crate with an unknown contents item', () => {
    const map = cloneMap();
    map['props'] = [{ type: 'crate', x: 64, y: 64, contents: 'dynamite' }];

    expect(() => parseLevelDefinition(map)).toThrow(/contents/);
  });

  it('rejects a pedestal without an item', () => {
    const map = cloneMap();
    map['props'] = [{ type: 'pedestal', x: 64, y: 64 }];

    expect(() => parseLevelDefinition(map)).toThrow(/item/);
  });

  it('rejects an unknown prop type', () => {
    const map = cloneMap();
    map['props'] = [{ type: 'anvil', x: 64, y: 64 }];

    expect(() => parseLevelDefinition(map)).toThrow(/props\[0\]\.type/);
  });

  it('rejects a negative enemy HP bonus', () => {
    const map = cloneMap();
    map['enemyHpBonus'] = -1;

    expect(() => parseLevelDefinition(map)).toThrow(/enemyHpBonus/);
  });

  it('rejects a kill plane above the level floor', () => {
    const map = cloneMap();
    map['killY'] = 128;

    expect(() => parseLevelDefinition(map)).toThrow(/killY must be below/);
  });
});

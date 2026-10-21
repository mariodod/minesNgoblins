import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelValidationError, parseLevelDefinition } from '../../src/data/level-definition';
import {
  getLevelIndex,
  LEVEL_ASSETS,
  LEVEL_COUNT,
  LEVEL_ORDER,
} from '../../src/data/level-registry';

function readMap(path: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL(`../../public/${path}`, import.meta.url), 'utf8'),
  ) as Record<string, unknown>;
}

const shaftMap = readMap('maps/shaft-entrance.json');

function cloneMap(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(shaftMap)) as Record<string, unknown>;
}

describe('parseLevelDefinition', () => {
  it('parses the shaft entrance map', () => {
    const level = parseLevelDefinition(shaftMap);

    expect(level.id).toBe('shaft-entrance');
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
    expect(level.exit).toEqual({ x: 1232, y: 240, width: 48, height: 48 });
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

  it('rejects a missing exit', () => {
    const map = cloneMap();
    delete map['exit'];

    expect(() => parseLevelDefinition(map)).toThrow(/exit/);
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

describe('authored run levels', () => {
  it('defines four levels in run order', () => {
    expect(LEVEL_COUNT).toBe(4);
    expect(LEVEL_ORDER).toEqual([
      'shaft-entrance',
      'goblin-tunnels',
      'crystal-caverns',
      'deep-vein',
    ]);
    expect(LEVEL_ASSETS.map((asset) => asset.number)).toEqual([1, 2, 3, 4]);
  });

  it.each(LEVEL_ASSETS)('validates $id', (asset) => {
    const level = parseLevelDefinition(readMap(asset.path));

    expect(level.id).toBe(asset.id);
    expect(level.name).toBe(asset.title);
    expect(level.spawn.x).toBeGreaterThan(0);
    expect(level.spawn.y).toBeGreaterThan(0);
    expect(level.exit.width).toBeGreaterThan(0);
    expect(level.exit.height).toBeGreaterThan(0);
    expect(level.enemies.length).toBeGreaterThan(0);
    expect(getLevelIndex(level.id)).toBe(asset.number - 1);
  });

  it('places crystal decorations in the caverns and deep vein', () => {
    const caverns = parseLevelDefinition(readMap('maps/crystal-caverns.json'));
    const deepVein = parseLevelDefinition(readMap('maps/deep-vein.json'));

    expect(caverns.props.filter((prop) => prop.type === 'crystal').length).toBeGreaterThan(0);
    expect(deepVein.props.filter((prop) => prop.type === 'crystal').length).toBeGreaterThan(0);
  });
});

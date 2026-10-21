import { ENEMY_IDS, type EnemyId } from './enemies';
import { isPickupId, PICKUP_IDS, type PickupId } from './items';

export interface LevelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelPoint {
  x: number;
  y: number;
}

export type EnemyType = EnemyId;
export type PropType = 'crate' | 'crystal' | 'lantern' | 'pedestal';
export type HazardType = 'spikes' | 'falling-rock';

export interface EnemySpawn extends LevelPoint {
  type: EnemyType;
}

export interface CrateSpawn extends LevelPoint {
  type: 'crate';
  contents: PickupId;
}

export interface PedestalSpawn extends LevelPoint {
  type: 'pedestal';
  item: PickupId;
}

export interface LanternSpawn extends LevelPoint {
  type: 'lantern';
}

export interface CrystalSpawn extends LevelPoint {
  type: 'crystal';
}

export type PropSpawn = CrateSpawn | PedestalSpawn | LanternSpawn | CrystalSpawn;

export interface HazardSpawn extends LevelRect {
  type: HazardType;
}

export interface LevelDefinition {
  id: string;
  name: string;
  tileSize: number;
  widthTiles: number;
  heightTiles: number;
  spawn: LevelPoint;
  solids: LevelRect[];
  oneWayPlatforms: LevelRect[];
  enemies: EnemySpawn[];
  props: PropSpawn[];
  hazards: HazardSpawn[];
  exit: LevelRect;
  enemyHpBonus: number;
  killY: number;
  worldWidth: number;
  worldHeight: number;
}

export class LevelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LevelValidationError';
  }
}

export function parseLevelDefinition(value: unknown): LevelDefinition {
  if (!isRecord(value)) {
    throw new LevelValidationError('Level must be a JSON object.');
  }

  const id = readString(value, 'id');
  const name = readString(value, 'name');
  const tileSize = readPositiveInt(value, 'tileSize');
  const widthTiles = readPositiveInt(value, 'widthTiles');
  const heightTiles = readPositiveInt(value, 'heightTiles');
  const worldWidth = widthTiles * tileSize;
  const worldHeight = heightTiles * tileSize;

  if (tileSize !== 16) {
    throw new LevelValidationError(`tileSize must be 16, received ${tileSize}.`);
  }

  const spawn = readPoint(value['spawn'], 'spawn');
  if (!isInside(spawn, worldWidth, worldHeight)) {
    throw new LevelValidationError('spawn must be inside the level bounds.');
  }

  const solids = readRectList(value['solids'], 'solids', worldWidth, worldHeight);
  const oneWayPlatforms = readRectList(
    value['oneWayPlatforms'],
    'oneWayPlatforms',
    worldWidth,
    worldHeight,
  );
  const enemies = readSpawnList(value['enemies'], 'enemies', worldWidth, worldHeight, ENEMY_IDS);
  const props = readPropList(value['props'], 'props', worldWidth, worldHeight);
  const hazards = readHazardList(value['hazards'], 'hazards', worldWidth, worldHeight);
  const exit = readRect(value['exit'], 'exit', worldWidth, worldHeight);
  const enemyHpBonus = readOptionalNonNegativeInt(value, 'enemyHpBonus', 0);

  const killY = readNumber(value, 'killY');
  if (killY <= worldHeight) {
    throw new LevelValidationError('killY must be below the level bounds.');
  }

  return {
    id,
    name,
    tileSize,
    widthTiles,
    heightTiles,
    spawn,
    solids,
    oneWayPlatforms,
    enemies,
    props,
    hazards,
    exit,
    enemyHpBonus,
    killY,
    worldWidth,
    worldHeight,
  };
}

function readPropList(
  value: unknown,
  path: string,
  worldWidth: number,
  worldHeight: number,
): PropSpawn[] {
  if (!Array.isArray(value)) {
    throw new LevelValidationError(`${path} must be an array.`);
  }

  return value.map((entry, index) => {
    const propPath = `${path}[${index}]`;

    if (!isRecord(entry)) {
      throw new LevelValidationError(`${propPath} must be an object.`);
    }

    const type = readString(entry, 'type', propPath);
    const point = readPoint(entry, propPath);

    if (!isInside(point, worldWidth, worldHeight)) {
      throw new LevelValidationError(`${propPath} must be inside the level bounds.`);
    }

    if (type === 'crate') {
      return { ...point, type, contents: readPickupId(entry, 'contents', propPath) };
    }

    if (type === 'pedestal') {
      return { ...point, type, item: readPickupId(entry, 'item', propPath) };
    }

    if (type === 'lantern') {
      return { ...point, type };
    }

    if (type === 'crystal') {
      return { ...point, type };
    }

    throw new LevelValidationError(
      `${propPath}.type must be one of: crate, crystal, lantern, pedestal.`,
    );
  });
}

function readPickupId(record: Record<string, unknown>, key: string, path: string): PickupId {
  const value = readString(record, key, path);

  if (!isPickupId(value)) {
    throw new LevelValidationError(`${path}.${key} must be one of: ${PICKUP_IDS.join(', ')}.`);
  }

  return value;
}

function readHazardList(
  value: unknown,
  path: string,
  worldWidth: number,
  worldHeight: number,
): HazardSpawn[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new LevelValidationError(`${path} must be an array.`);
  }

  const rects = readRectList(value, path, worldWidth, worldHeight);

  return rects.map((rect, index) => {
    const entry = value[index];

    if (!isRecord(entry)) {
      throw new LevelValidationError(`${path}[${index}] must be an object.`);
    }

    const type = readString(entry, 'type', `${path}[${index}]`);

    if (type !== 'spikes' && type !== 'falling-rock') {
      throw new LevelValidationError(
        `${path}[${index}].type must be one of: spikes, falling-rock.`,
      );
    }

    return { ...rect, type };
  });
}

function readRectList(
  value: unknown,
  path: string,
  worldWidth: number,
  worldHeight: number,
): LevelRect[] {
  if (!Array.isArray(value)) {
    throw new LevelValidationError(`${path} must be an array.`);
  }

  return value.map((entry, index) => readRect(entry, `${path}[${index}]`, worldWidth, worldHeight));
}

function readRect(
  value: unknown,
  path: string,
  worldWidth: number,
  worldHeight: number,
): LevelRect {
  if (!isRecord(value)) {
    throw new LevelValidationError(`${path} must be an object.`);
  }

  const rect: LevelRect = {
    x: readNumber(value, 'x', path),
    y: readNumber(value, 'y', path),
    width: readPositiveNumber(value, 'width', path),
    height: readPositiveNumber(value, 'height', path),
  };

  if (rect.x < 0 || rect.y < 0) {
    throw new LevelValidationError(`${path} cannot have negative coordinates.`);
  }

  if (rect.x + rect.width > worldWidth || rect.y + rect.height > worldHeight) {
    throw new LevelValidationError(`${path} extends past the level bounds.`);
  }

  return rect;
}

function readSpawnList<T extends string>(
  value: unknown,
  path: string,
  worldWidth: number,
  worldHeight: number,
  allowedTypes: readonly T[],
): Array<LevelPoint & { type: T }> {
  if (!Array.isArray(value)) {
    throw new LevelValidationError(`${path} must be an array.`);
  }

  return value.map((entry, index) => {
    const spawnPath = `${path}[${index}]`;

    if (!isRecord(entry)) {
      throw new LevelValidationError(`${spawnPath} must be an object.`);
    }

    const type = readString(entry, 'type', spawnPath);
    if (!(allowedTypes as readonly string[]).includes(type)) {
      throw new LevelValidationError(
        `${spawnPath}.type must be one of: ${allowedTypes.join(', ')}.`,
      );
    }

    const point = readPoint(entry, spawnPath);
    if (!isInside(point, worldWidth, worldHeight)) {
      throw new LevelValidationError(`${spawnPath} must be inside the level bounds.`);
    }

    return { ...point, type: type as T };
  });
}

function readPoint(value: unknown, path: string): LevelPoint {
  if (!isRecord(value)) {
    throw new LevelValidationError(`${path} must be an object with x and y.`);
  }

  return {
    x: readNumber(value, 'x', path),
    y: readNumber(value, 'y', path),
  };
}

function readString(record: Record<string, unknown>, key: string, path = 'level'): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new LevelValidationError(`${path}.${key} must be a non-empty string.`);
  }

  return value;
}

function readPositiveInt(record: Record<string, unknown>, key: string, path = 'level'): number {
  const value = readNumber(record, key, path);
  if (!Number.isInteger(value) || value <= 0) {
    throw new LevelValidationError(`${path}.${key} must be a positive integer.`);
  }

  return value;
}

function readOptionalNonNegativeInt(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
  path = 'level',
): number {
  if (record[key] === undefined) {
    return fallback;
  }

  const value = readNumber(record, key, path);

  if (!Number.isInteger(value) || value < 0) {
    throw new LevelValidationError(`${path}.${key} must be a non-negative integer.`);
  }

  return value;
}

function readPositiveNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = readNumber(record, key, path);
  if (value <= 0) {
    throw new LevelValidationError(`${path}.${key} must be positive.`);
  }

  return value;
}

function readNumber(record: Record<string, unknown>, key: string, path = 'level'): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new LevelValidationError(`${path}.${key} must be a finite number.`);
  }

  return value;
}

function isInside(point: LevelPoint, width: number, height: number): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

export type EnemyType = 'practice-dummy';
export type PropType = 'crate' | 'lantern';

export interface EnemySpawn extends LevelPoint {
  type: EnemyType;
}

export interface PropSpawn extends LevelPoint {
  type: PropType;
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
  const enemies = readSpawnList(value['enemies'], 'enemies', worldWidth, worldHeight, [
    'practice-dummy',
  ] as const);
  const props = readSpawnList(value['props'], 'props', worldWidth, worldHeight, [
    'crate',
    'lantern',
  ] as const);

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
    killY,
    worldWidth,
    worldHeight,
  };
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

  return value.map((entry, index) => {
    const rectPath = `${path}[${index}]`;

    if (!isRecord(entry)) {
      throw new LevelValidationError(`${rectPath} must be an object.`);
    }

    const rect: LevelRect = {
      x: readNumber(entry, 'x', rectPath),
      y: readNumber(entry, 'y', rectPath),
      width: readPositiveNumber(entry, 'width', rectPath),
      height: readPositiveNumber(entry, 'height', rectPath),
    };

    if (rect.x < 0 || rect.y < 0) {
      throw new LevelValidationError(`${rectPath} cannot have negative coordinates.`);
    }

    if (rect.x + rect.width > worldWidth || rect.y + rect.height > worldHeight) {
      throw new LevelValidationError(`${rectPath} extends past the level bounds.`);
    }

    return rect;
  });
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

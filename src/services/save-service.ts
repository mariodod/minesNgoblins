import { DEFAULT_SKIN_ID, isSkinId } from '../data/skins';
import { isSecondaryItemId, type SecondaryItemId } from '../data/items';

export const SAVE_KEY = 'minesNgoblins.save.v1';
export const SAVE_VERSION = 1;
export { DEFAULT_SKIN_ID } from '../data/skins';

const SAVE_BACKUP_PREFIX = 'minesNgoblins.save.backup.';

export type SaveLoadStatus = 'empty' | 'ok' | 'corrupt' | 'unsupported';
export type ScreenShakeSetting = 'full' | 'reduced' | 'off';
export type FlashIntensitySetting = 'full' | 'reduced';

export interface KeybindSettings {
  moveLeft: string;
  moveRight: string;
  jump: string;
  throwStone: string;
  useItem: string;
  interact: string;
  pause: string;
}

export interface SaveSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  screenShake: ScreenShakeSetting;
  flashIntensity: FlashIntensitySetting;
  equippedSkin: string;
  keybinds: KeybindSettings;
}

export interface UnlockRecord {
  unlockedAt: string;
}

export type AchievementRecord = UnlockRecord;
export type SkinRecord = UnlockRecord;

export interface SaveStats {
  runsStarted: number;
  runsCompleted: number;
  bestRunTimeMs: number | null;
  totalDeaths: number;
  totalKills: number;
  usedItems: SecondaryItemId[];
}

export interface SaveDataV1 {
  version: 1;
  settings: SaveSettings;
  achievements: Record<string, AchievementRecord>;
  skins: Record<string, SkinRecord>;
  stats: SaveStats;
}

export interface SaveLoadResult {
  data: SaveDataV1;
  status: SaveLoadStatus;
  backupKey?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_KEYBINDS: KeybindSettings = {
  moveLeft: 'A',
  moveRight: 'D',
  jump: 'SPACE',
  throwStone: 'X',
  useItem: 'C',
  interact: 'E',
  pause: 'ESC',
};

export const DEFAULT_SETTINGS: SaveSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  screenShake: 'full',
  flashIntensity: 'full',
  equippedSkin: DEFAULT_SKIN_ID,
  keybinds: DEFAULT_KEYBINDS,
};

export function createDefaultSettings(): SaveSettings {
  return {
    ...DEFAULT_SETTINGS,
    keybinds: { ...DEFAULT_KEYBINDS },
  };
}

export function createDefaultSaveData(): SaveDataV1 {
  return {
    version: SAVE_VERSION,
    settings: createDefaultSettings(),
    achievements: {},
    skins: {},
    stats: {
      runsStarted: 0,
      runsCompleted: 0,
      bestRunTimeMs: null,
      totalDeaths: 0,
      totalKills: 0,
      usedItems: [],
    },
  };
}

export function parseSaveData(raw: string | null): {
  data: SaveDataV1;
  status: SaveLoadStatus;
} {
  if (raw === null || raw.trim() === '') {
    return { data: createDefaultSaveData(), status: 'empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { data: createDefaultSaveData(), status: 'corrupt' };
  }

  if (!isRecord(parsed)) {
    return { data: createDefaultSaveData(), status: 'corrupt' };
  }

  const version = parsed['version'];
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { data: createDefaultSaveData(), status: 'corrupt' };
  }

  if (version !== SAVE_VERSION) {
    return { data: createDefaultSaveData(), status: 'unsupported' };
  }

  return {
    status: 'ok',
    data: {
      version: SAVE_VERSION,
      settings: parseSettings(parsed['settings']),
      achievements: parseUnlockRecords(parsed['achievements']),
      skins: parseUnlockRecords(parsed['skins']),
      stats: parseStats(parsed['stats']),
    },
  };
}

export function loadSave(storage: StorageLike): SaveLoadResult {
  const raw = safeGet(storage);
  const parsed = parseSaveData(raw);

  if ((parsed.status === 'corrupt' || parsed.status === 'unsupported') && raw !== null) {
    const backupKey = `${SAVE_BACKUP_PREFIX}${Date.now()}`;

    try {
      storage.setItem(backupKey, raw);
      storage.setItem(SAVE_KEY, JSON.stringify(parsed.data));
    } catch {
      // Storage may be blocked or full. The in-memory save still works.
    }

    return { data: parsed.data, status: parsed.status, backupKey };
  }

  return { data: parsed.data, status: parsed.status };
}

export class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

export class SaveService {
  private readonly storage: StorageLike;
  private cached: SaveDataV1;
  readonly loadStatus: SaveLoadStatus;
  readonly backupKey: string | undefined;

  constructor(storage: StorageLike = getDefaultStorage()) {
    this.storage = storage;
    const loaded = loadSave(storage);
    this.cached = loaded.data;
    this.loadStatus = loaded.status;
    this.backupKey = loaded.backupKey;
    this.sanitizeEquippedSkin();
  }

  get data(): Readonly<SaveDataV1> {
    return this.cached;
  }

  get settings(): Readonly<SaveSettings> {
    return this.cached.settings;
  }

  updateSettings(patch: Partial<SaveSettings>): void {
    this.cached = {
      ...this.cached,
      settings: {
        ...this.cached.settings,
        ...patch,
        keybinds: patch.keybinds
          ? { ...this.cached.settings.keybinds, ...patch.keybinds }
          : this.cached.settings.keybinds,
      },
    };
    this.persist();
  }

  unlockAchievement(id: string, unlockedAt = new Date().toISOString()): boolean {
    if (this.cached.achievements[id]) {
      return false;
    }

    this.cached = {
      ...this.cached,
      achievements: {
        ...this.cached.achievements,
        [id]: { unlockedAt },
      },
    };
    this.persist();
    return true;
  }

  unlockSkin(id: string, unlockedAt = new Date().toISOString()): boolean {
    if (!isSkinId(id) || this.cached.skins[id]) {
      return false;
    }

    this.cached = {
      ...this.cached,
      skins: {
        ...this.cached.skins,
        [id]: { unlockedAt },
      },
    };
    this.persist();
    return true;
  }

  equipSkin(id: string): void {
    if (!isSkinId(id) || (id !== DEFAULT_SKIN_ID && !this.cached.skins[id])) {
      return;
    }

    this.updateSettings({ equippedSkin: id });
  }

  recordItemUsed(itemId: SecondaryItemId): void {
    if (this.cached.stats.usedItems.includes(itemId)) {
      return;
    }

    this.updateStats({
      usedItems: [...this.cached.stats.usedItems, itemId],
    });
  }

  recordRunStarted(): void {
    this.updateStats({ runsStarted: this.cached.stats.runsStarted + 1 });
  }

  recordRunCompleted(durationMs: number): void {
    const duration = Math.max(0, Math.round(durationMs));
    const previousBest = this.cached.stats.bestRunTimeMs;

    this.updateStats({
      runsCompleted: this.cached.stats.runsCompleted + 1,
      bestRunTimeMs: previousBest === null ? duration : Math.min(previousBest, duration),
    });
  }

  recordDeath(): void {
    this.updateStats({ totalDeaths: this.cached.stats.totalDeaths + 1 });
  }

  recordKills(count = 1): void {
    this.updateStats({ totalKills: this.cached.stats.totalKills + Math.max(0, count) });
  }

  private sanitizeEquippedSkin(): void {
    const id = this.cached.settings.equippedSkin;
    const usable = id === DEFAULT_SKIN_ID || (isSkinId(id) && this.cached.skins[id] !== undefined);

    if (usable) {
      return;
    }

    this.cached = {
      ...this.cached,
      settings: {
        ...this.cached.settings,
        equippedSkin: DEFAULT_SKIN_ID,
      },
    };
    this.persist();
  }

  reset(): void {
    this.cached = createDefaultSaveData();

    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      // Ignore storage failures; the in-memory reset still applies.
    }

    this.persist();
  }

  private updateStats(patch: Partial<SaveStats>): void {
    this.cached = {
      ...this.cached,
      stats: {
        ...this.cached.stats,
        ...patch,
      },
    };
    this.persist();
  }

  private persist(): void {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.cached));
    } catch {
      // Storage may be blocked or full; keep the in-memory state usable.
    }
  }
}

function parseSettings(value: unknown): SaveSettings {
  const record = isRecord(value) ? value : {};

  return {
    masterVolume: readVolume(record['masterVolume'], DEFAULT_SETTINGS.masterVolume),
    musicVolume: readVolume(record['musicVolume'], DEFAULT_SETTINGS.musicVolume),
    sfxVolume: readVolume(record['sfxVolume'], DEFAULT_SETTINGS.sfxVolume),
    muted: readBoolean(record['muted'], DEFAULT_SETTINGS.muted),
    screenShake: readEnum(
      record['screenShake'],
      ['full', 'reduced', 'off'] as const,
      DEFAULT_SETTINGS.screenShake,
    ),
    flashIntensity: readEnum(
      record['flashIntensity'],
      ['full', 'reduced'] as const,
      DEFAULT_SETTINGS.flashIntensity,
    ),
    equippedSkin: readString(record['equippedSkin'], DEFAULT_SETTINGS.equippedSkin),
    keybinds: parseKeybinds(record['keybinds']),
  };
}

function parseKeybinds(value: unknown): KeybindSettings {
  const record = isRecord(value) ? value : {};

  return {
    moveLeft: readString(record['moveLeft'], DEFAULT_KEYBINDS.moveLeft),
    moveRight: readString(record['moveRight'], DEFAULT_KEYBINDS.moveRight),
    jump: readString(record['jump'], DEFAULT_KEYBINDS.jump),
    throwStone: readString(record['throwStone'], DEFAULT_KEYBINDS.throwStone),
    useItem: readString(record['useItem'], DEFAULT_KEYBINDS.useItem),
    interact: readString(record['interact'], DEFAULT_KEYBINDS.interact),
    pause: readString(record['pause'], DEFAULT_KEYBINDS.pause),
  };
}

function parseUnlockRecords(value: unknown): Record<string, UnlockRecord> {
  const records: Record<string, UnlockRecord> = {};

  if (!isRecord(value)) {
    return records;
  }

  for (const [id, entry] of Object.entries(value)) {
    if (isRecord(entry) && typeof entry['unlockedAt'] === 'string') {
      records[id] = { unlockedAt: entry['unlockedAt'] };
    }
  }

  return records;
}

function parseStats(value: unknown): SaveStats {
  const record = isRecord(value) ? value : {};

  return {
    runsStarted: readNonNegativeInt(record['runsStarted'], 0),
    runsCompleted: readNonNegativeInt(record['runsCompleted'], 0),
    bestRunTimeMs: readNullableNonNegativeInt(record['bestRunTimeMs']),
    totalDeaths: readNonNegativeInt(record['totalDeaths'], 0),
    totalKills: readNonNegativeInt(record['totalKills'], 0),
    usedItems: parseUsedItems(record['usedItems']),
  };
}

function parseUsedItems(value: unknown): SecondaryItemId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: SecondaryItemId[] = [];

  for (const entry of value) {
    if (typeof entry === 'string' && isSecondaryItemId(entry) && !items.includes(entry)) {
      items.push(entry);
    }
  }

  return items;
}

function readVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }

  return fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function readNullableNonNegativeInt(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return readNonNegativeInt(value, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeGet(storage: StorageLike): string | null {
  try {
    return storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

function getDefaultStorage(): StorageLike {
  if (typeof window === 'undefined') {
    return new MemoryStorage();
  }

  try {
    const storage = window.localStorage;
    const probeKey = `${SAVE_KEY}.probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return new MemoryStorage();
  }
}

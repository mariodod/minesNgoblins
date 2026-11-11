import { describe, expect, it } from 'vitest';
import {
  createDefaultSaveData,
  loadSave,
  MemoryStorage,
  parseSaveData,
  SAVE_KEY,
  SaveService,
} from '../../src/services/save-service';
import { DEFAULT_KEYBINDS } from '../../src/services/keybinds';

describe('save data', () => {
  it('creates independent defaults', () => {
    const first = createDefaultSaveData();
    const second = createDefaultSaveData();

    expect(first.version).toBe(1);
    expect(first.settings.masterVolume).toBe(0.8);
    expect(first.settings.keybinds.jump).toBe('Space');
    expect(first.stats.bestRunTimeMs).toBeNull();
    expect(first).not.toBe(second);
    expect(first.settings.keybinds).not.toBe(second.settings.keybinds);
  });

  it('returns defaults when no save exists', () => {
    const result = parseSaveData(null);

    expect(result.status).toBe('empty');
    expect(result.data).toEqual(createDefaultSaveData());
  });

  it('fills missing fields from defaults', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: {
        masterVolume: 0.25,
        screenShake: 'off',
      },
      stats: {
        runsStarted: 3,
      },
    });

    const result = parseSaveData(raw);

    expect(result.status).toBe('ok');
    expect(result.data.settings.masterVolume).toBe(0.25);
    expect(result.data.settings.musicVolume).toBe(0.6);
    expect(result.data.settings.screenShake).toBe('off');
    expect(result.data.settings.keybinds.jump).toBe(DEFAULT_KEYBINDS.jump);
    expect(result.data.stats.runsStarted).toBe(3);
    expect(result.data.stats.runsCompleted).toBe(0);
  });

  it('upgrades legacy key names and keeps flash off', () => {
    const result = parseSaveData(
      JSON.stringify({
        version: 1,
        settings: {
          flashIntensity: 'off',
          keybinds: { moveLeft: 'A', jump: 'SPACE', pause: 'ESC' },
        },
      }),
    );

    expect(result.data.settings.flashIntensity).toBe('off');
    expect(result.data.settings.keybinds.moveLeft).toBe('KeyA');
    expect(result.data.settings.keybinds.jump).toBe('Space');
    expect(result.data.settings.keybinds.pause).toBe('Escape');
    expect(result.data.settings.keybinds.interact).toBe(DEFAULT_KEYBINDS.interact);
  });

  it('resolves duplicate bindings from a hand-edited save', () => {
    const result = parseSaveData(
      JSON.stringify({
        version: 1,
        settings: {
          keybinds: { moveLeft: 'KeyQ', moveRight: 'KeyQ', jump: 'KeyQ' },
        },
      }),
    );

    const { keybinds } = result.data.settings;
    expect(keybinds.moveLeft).toBe('KeyQ');
    expect(keybinds.moveRight).toBe(DEFAULT_KEYBINDS.moveRight);
    expect(keybinds.jump).toBe(DEFAULT_KEYBINDS.jump);
    expect(new Set(Object.values(keybinds)).size).toBe(7);
  });

  it('rejects malformed JSON', () => {
    const result = parseSaveData('{not valid json');

    expect(result.status).toBe('corrupt');
    expect(result.data).toEqual(createDefaultSaveData());
  });

  it('rejects unsupported save versions', () => {
    const result = parseSaveData(JSON.stringify({ version: 99 }));

    expect(result.status).toBe('unsupported');
    expect(result.data.version).toBe(1);
  });

  it('backs up corrupt data and replaces it with defaults', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{broken');

    const result = loadSave(storage);
    const backupKey = result.backupKey;

    expect(result.status).toBe('corrupt');
    expect(backupKey).toBeDefined();
    if (!backupKey) {
      throw new Error('Expected a backup key');
    }

    expect(storage.getItem(backupKey)).toBe('{broken');
    expect(parseSaveData(storage.getItem(SAVE_KEY)).status).toBe('ok');
  });

  it('round-trips a complete v1 save without losing fields', () => {
    const original = createDefaultSaveData();
    original.settings = {
      masterVolume: 0.15,
      musicVolume: 0.55,
      sfxVolume: 0.95,
      muted: true,
      screenShake: 'reduced',
      flashIntensity: 'off',
      equippedSkin: 'obsidian',
      keybinds: {
        moveLeft: 'KeyJ',
        moveRight: 'KeyL',
        jump: 'KeyI',
        throwStone: 'KeyU',
        useItem: 'KeyO',
        interact: 'KeyK',
        pause: 'KeyP',
      },
    };
    original.achievements = {
      pacifist: { unlockedAt: '2026-10-01T10:00:00.000Z' },
    };
    original.skins = {
      obsidian: { unlockedAt: '2026-10-02T11:00:00.000Z' },
    };
    original.stats = {
      runsStarted: 12,
      runsCompleted: 4,
      bestRunTimeMs: 654_321,
      totalDeaths: 9,
      totalKills: 41,
      usedItems: ['knife', 'flintlock', 'rune-scroll'],
    };

    const parsed = parseSaveData(JSON.stringify(original));

    expect(parsed.status).toBe('ok');
    expect(parsed.data).toEqual(original);
  });

  it('backs up and resets a save from an unsupported version', () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ version: 2, settings: { masterVolume: 0.1 } });
    storage.setItem(SAVE_KEY, future);

    const result = loadSave(storage);

    expect(result.status).toBe('unsupported');
    expect(result.data).toEqual(createDefaultSaveData());
    expect(result.backupKey).toBeDefined();
    if (result.backupKey) {
      expect(storage.getItem(result.backupKey)).toBe(future);
    }
    expect(parseSaveData(storage.getItem(SAVE_KEY))).toMatchObject({
      status: 'ok',
      data: { version: 1 },
    });
  });

  it('treats a non-object payload as corrupt and keeps the original for recovery', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '["not", "a", "save"]');

    const result = loadSave(storage);

    expect(result.status).toBe('corrupt');
    expect(result.backupKey).toBeDefined();
    if (result.backupKey) {
      expect(storage.getItem(result.backupKey)).toBe('["not", "a", "save"]');
    }
  });

  it('clamps and replaces malformed fields instead of failing the load', () => {
    const parsed = parseSaveData(
      JSON.stringify({
        version: 1,
        settings: {
          masterVolume: 4,
          musicVolume: -2,
          sfxVolume: 'loud',
          muted: 'yes',
          screenShake: 'violent',
          flashIntensity: 'strobe',
          equippedSkin: '',
          keybinds: 'not-an-object',
        },
        achievements: [],
        skins: { obsidian: { unlockedAt: 12 } },
        stats: {
          runsStarted: -1,
          runsCompleted: 2.5,
          bestRunTimeMs: -10,
          totalDeaths: 'many',
          totalKills: Number.MAX_SAFE_INTEGER,
          usedItems: 'knife',
        },
      }),
    );

    expect(parsed.status).toBe('ok');
    expect(parsed.data.settings.masterVolume).toBe(1);
    expect(parsed.data.settings.musicVolume).toBe(0);
    expect(parsed.data.settings.sfxVolume).toBe(0.8);
    expect(parsed.data.settings.muted).toBe(false);
    expect(parsed.data.settings.screenShake).toBe('full');
    expect(parsed.data.settings.flashIntensity).toBe('full');
    expect(parsed.data.settings.equippedSkin).toBe('delver');
    expect(parsed.data.settings.keybinds).toEqual(DEFAULT_KEYBINDS);
    expect(parsed.data.achievements).toEqual({});
    expect(parsed.data.skins).toEqual({});
    expect(parsed.data.stats).toEqual({
      runsStarted: 0,
      runsCompleted: 0,
      bestRunTimeMs: 0,
      totalDeaths: 0,
      totalKills: Number.MAX_SAFE_INTEGER,
      usedItems: [],
    });
  });

  it('keeps working in memory when storage rejects every write', () => {
    class ReadOnlyStorage extends MemoryStorage {
      override setItem(): void {
        throw new Error('QuotaExceededError');
      }
    }

    const storage = new ReadOnlyStorage();

    expect(() => loadSave(storage)).not.toThrow();

    const service = new SaveService(storage);
    expect(() => service.updateSettings({ masterVolume: 0.2 })).not.toThrow();
    expect(service.settings.masterVolume).toBe(0.2);
  });
});

describe('SaveService', () => {
  it('persists settings and unlocks', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);

    service.updateSettings({ masterVolume: 0.3, screenShake: 'reduced' });
    expect(service.unlockAchievement('pacifist', '2026-10-19T00:00:00.000Z')).toBe(true);
    expect(service.unlockAchievement('pacifist')).toBe(false);
    service.unlockSkin('pale-wanderer', '2026-10-19T00:00:00.000Z');
    service.equipSkin('pale-wanderer');
    service.recordRunStarted();
    service.recordRunCompleted(123_456);
    service.recordDeath();
    service.recordKills(2);

    const reloaded = new SaveService(storage);

    expect(reloaded.settings.masterVolume).toBe(0.3);
    expect(reloaded.settings.screenShake).toBe('reduced');
    expect(reloaded.settings.equippedSkin).toBe('pale-wanderer');
    expect(reloaded.data.achievements['pacifist']?.unlockedAt).toBe('2026-10-19T00:00:00.000Z');
    expect(reloaded.data.stats.runsStarted).toBe(1);
    expect(reloaded.data.stats.runsCompleted).toBe(1);
    expect(reloaded.data.stats.bestRunTimeMs).toBe(123_456);
    expect(reloaded.data.stats.totalDeaths).toBe(1);
    expect(reloaded.data.stats.totalKills).toBe(2);
  });

  it('does not equip a locked skin and reset restores defaults', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);

    service.equipSkin('locked-skin');
    expect(service.settings.equippedSkin).toBe('delver');

    service.equipSkin('obsidian');
    expect(service.settings.equippedSkin).toBe('delver');

    service.updateSettings({ masterVolume: 0.1 });
    service.reset();

    expect(service.settings.masterVolume).toBe(0.8);
    expect(service.data.stats.runsStarted).toBe(0);
    expect(new SaveService(storage).settings.masterVolume).toBe(0.8);
  });

  it('records each used secondary item once and persists the set', () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);

    service.recordItemUsed('knife');
    service.recordItemUsed('knife');
    service.recordItemUsed('rune-scroll');

    expect(service.data.stats.usedItems).toEqual(['knife', 'rune-scroll']);
    expect(new SaveService(storage).data.stats.usedItems).toEqual(['knife', 'rune-scroll']);
  });

  it('sanitizes invalid and locked equipped skins when loading', () => {
    const invalidStorage = new MemoryStorage();
    const invalidSave = createDefaultSaveData();
    invalidSave.settings.equippedSkin = 'not-a-skin';
    invalidStorage.setItem(SAVE_KEY, JSON.stringify(invalidSave));

    const invalid = new SaveService(invalidStorage);
    expect(invalid.settings.equippedSkin).toBe('delver');

    const lockedStorage = new MemoryStorage();
    const lockedSave = createDefaultSaveData();
    lockedSave.settings.equippedSkin = 'obsidian';
    lockedStorage.setItem(SAVE_KEY, JSON.stringify(lockedSave));

    const locked = new SaveService(lockedStorage);
    expect(locked.settings.equippedSkin).toBe('delver');

    const unlockedStorage = new MemoryStorage();
    const unlockedSave = createDefaultSaveData();
    unlockedSave.settings.equippedSkin = 'obsidian';
    unlockedSave.skins['obsidian'] = { unlockedAt: '2026-10-19T00:00:00.000Z' };
    unlockedStorage.setItem(SAVE_KEY, JSON.stringify(unlockedSave));

    const unlocked = new SaveService(unlockedStorage);
    expect(unlocked.settings.equippedSkin).toBe('obsidian');
  });

  it('filters invalid and duplicate used items from stored data', () => {
    const parsed = parseSaveData(
      JSON.stringify({
        version: 1,
        stats: {
          usedItems: ['knife', 'knife', 'bogus', 7, 'rune-scroll'],
        },
      }),
    );

    expect(parsed.status).toBe('ok');
    expect(parsed.data.stats.usedItems).toEqual(['knife', 'rune-scroll']);
  });

  it('reports a backup key when recovering through SaveService', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{broken');

    const service = new SaveService(storage);

    expect(service.loadStatus).toBe('corrupt');
    expect(service.backupKey).toBeDefined();
    expect(service.settings.equippedSkin).toBe('delver');
    expect(parseSaveData(storage.getItem(SAVE_KEY)).status).toBe('ok');

    if (service.backupKey) {
      expect(storage.getItem(service.backupKey)).toBe('{broken');
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  createDefaultSaveData,
  DEFAULT_KEYBINDS,
  loadSave,
  MemoryStorage,
  parseSaveData,
  SAVE_KEY,
  SaveService,
} from '../../src/services/save-service';

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

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
    expect(first.settings.keybinds.jump).toBe('SPACE');
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

    service.updateSettings({ masterVolume: 0.1 });
    service.reset();

    expect(service.settings.masterVolume).toBe(0.8);
    expect(service.data.stats.runsStarted).toBe(0);
    expect(new SaveService(storage).settings.masterVolume).toBe(0.8);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { AudioService, hasAudioBackend } from '../../src/services/audio-service';

afterEach(() => {
  vi.unstubAllGlobals();
});

class FakeSound {
  volume: number;
  playing = false;
  destroyed = false;

  constructor(volume: number) {
    this.volume = volume;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  play(): boolean {
    this.playing = true;
    return true;
  }

  setVolume(value: number): void {
    this.volume = value;
  }

  destroy(): boolean {
    this.destroyed = true;
    this.playing = false;
    return true;
  }
}

class FakeSoundManager {
  volume = 1;
  mute = false;
  played: Array<{ key: string; volume: number }> = [];
  added: Array<{ key: string; sound: FakeSound }> = [];
  /** Keys present in the Phaser audio cache. */
  available = new Set(['jump', 'music-title', 'music-mines', 'music-boss']);
  readonly game = {
    cache: { audio: { exists: (key: string) => this.available.has(key) } },
  };

  play(key: string, config?: { volume?: number }): boolean {
    this.played.push({ key, volume: config?.volume ?? 1 });
    return true;
  }

  add(key: string, config?: { volume?: number }): FakeSound {
    const sound = new FakeSound(config?.volume ?? 1);
    this.added.push({ key, sound });
    return sound;
  }
}

function createService(): { audio: AudioService; manager: FakeSoundManager } {
  const manager = new FakeSoundManager();
  const audio = new AudioService(manager as unknown as Phaser.Sound.BaseSoundManager);
  return { audio, manager };
}

describe('hasAudioBackend', () => {
  it('detects Web Audio and its older webkit alias', () => {
    class FakeAudioContext {}

    vi.stubGlobal('window', {});
    expect(hasAudioBackend()).toBe(false);

    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    expect(hasAudioBackend()).toBe(true);

    vi.stubGlobal('window', { webkitAudioContext: FakeAudioContext });
    expect(hasAudioBackend()).toBe(true);
  });
});

describe('AudioService', () => {
  it('clamps master volume and ignores non-finite values', () => {
    const { audio, manager } = createService();

    audio.setMasterVolume(0.45);
    expect(manager.volume).toBe(0.45);

    audio.setMasterVolume(2);
    expect(manager.volume).toBe(1);

    audio.setMasterVolume(Number.NaN);
    expect(manager.volume).toBe(0);
  });

  it('applies saved settings to the manager on startup', () => {
    const { audio, manager } = createService();

    audio.applySettings({ masterVolume: 0.5, musicVolume: 0.7, sfxVolume: 0.9, muted: true });
    expect(manager.volume).toBe(0.5);
    expect(manager.mute).toBe(true);
  });

  it('scales effects by the effects volume and stays silent when muted', () => {
    const { audio, manager } = createService();
    audio.setSfxVolume(0.5);

    audio.play('jump');
    expect(manager.played).toHaveLength(1);
    expect(manager.played[0]!.key).toBe('jump');
    expect(manager.played[0]!.volume).toBeCloseTo(0.5);

    audio.setMuted(true);
    audio.play('jump');
    expect(manager.played).toHaveLength(1);
  });

  it('loops one music track at a time and ignores repeats', () => {
    const { audio, manager } = createService();
    audio.setMusicVolume(1);

    audio.playMusic('music-mines', 0);
    expect(manager.added).toHaveLength(1);
    expect(manager.added[0]!.key).toBe('music-mines');
    expect(manager.added[0]!.sound.isPlaying).toBe(true);

    audio.playMusic('music-mines', 0);
    expect(manager.added).toHaveLength(1);

    audio.playMusic('music-boss', 0);
    expect(manager.added).toHaveLength(2);
    expect(manager.added[0]!.sound.destroyed).toBe(true);

    audio.stopMusic(0);
    expect(manager.added[1]!.sound.destroyed).toBe(true);
    expect(audio.currentMusic).toBeUndefined();
  });

  it('stays silent when the audio pack was skipped', () => {
    const { audio, manager } = createService();
    manager.available.clear();

    audio.play('jump');
    audio.playMusic('music-title', 0);

    expect(manager.played).toHaveLength(0);
    expect(manager.added).toHaveLength(0);
    expect(audio.currentMusic).toBeUndefined();
  });

  it('follows music volume changes while a track is playing', () => {
    const { audio, manager } = createService();

    audio.playMusic('music-title', 0);
    audio.setMusicVolume(0.25);
    const sound = manager.added[0]!.sound;

    expect(sound.volume).toBeGreaterThan(0);
    expect(sound.volume).toBeLessThanOrEqual(0.15);
  });
});

import type Phaser from 'phaser';
import { ASSET_MANIFEST, type AudioAsset } from '../data/assets';

export type SfxName =
  | 'jump'
  | 'land'
  | 'throw'
  | 'bounce'
  | 'hit'
  | 'enemy-down'
  | 'hurt'
  | 'death'
  | 'bone-throw'
  | 'deflect'
  | 'rumble'
  | 'boulder'
  | 'knife'
  | 'gunshot'
  | 'magic'
  | 'rune-blast'
  | 'crate-break'
  | 'pickup'
  | 'heal'
  | 'ore'
  | 'elevator'
  | 'empty'
  | 'boss-roar'
  | 'boss-hurt'
  | 'boss-spit'
  | 'boss-burrow'
  | 'boss-quake'
  | 'boss-charge'
  | 'boss-summon'
  | 'boss-phase'
  | 'boss-defeat'
  | 'boss-victory';

export type MusicName = 'music-title' | 'music-mines' | 'music-boss';

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
};

const FADE_STEP_MS = 30;
const MUSIC_FADE_MS = 320;

/**
 * `BaseSound` does not declare volume in the Phaser typings, but every concrete
 * sound class implements it. Keep the one cast here instead of at each call.
 */
type ManagedSound = Phaser.Sound.BaseSound & {
  volume: number;
  setVolume: (value: number) => void;
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function findAsset(key: string): AudioAsset | undefined {
  return ASSET_MANIFEST.audio.find((asset) => asset.key === key);
}

/**
 * Plays the generated sound pack through Phaser's sound manager so the global
 * volume and mute switches cover effects and music at once. Music is a single
 * looping track per scene with a short fade when the track changes.
 */
export class AudioService {
  private readonly manager: Phaser.Sound.BaseSoundManager;
  private settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private music: ManagedSound | undefined;
  private musicKey: MusicName | undefined;
  private musicFade: ReturnType<typeof setInterval> | undefined;

  constructor(manager: Phaser.Sound.BaseSoundManager) {
    this.manager = manager;
    this.applySettings(DEFAULT_SETTINGS);
  }

  get currentMusic(): MusicName | undefined {
    return this.music?.isPlaying ? this.musicKey : undefined;
  }

  get isMuted(): boolean {
    return this.settings.muted;
  }

  applySettings(settings: AudioSettings): void {
    this.settings = {
      masterVolume: clampVolume(settings.masterVolume),
      musicVolume: clampVolume(settings.musicVolume),
      sfxVolume: clampVolume(settings.sfxVolume),
      muted: settings.muted,
    };

    this.manager.volume = this.settings.masterVolume;
    this.manager.mute = this.settings.muted;
    this.applyMusicVolume();
  }

  setMasterVolume(value: number): void {
    this.settings = { ...this.settings, masterVolume: clampVolume(value) };
    this.manager.volume = this.settings.masterVolume;
  }

  setMusicVolume(value: number): void {
    this.settings = { ...this.settings, musicVolume: clampVolume(value) };
    this.applyMusicVolume();
  }

  setSfxVolume(value: number): void {
    this.settings = { ...this.settings, sfxVolume: clampVolume(value) };
  }

  setMuted(muted: boolean): void {
    this.settings = { ...this.settings, muted };
    this.manager.mute = muted;
  }

  play(name: SfxName): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0) {
      return;
    }

    const asset = findAsset(name);

    if (!asset) {
      return;
    }

    this.manager.play(name, { volume: asset.volume * this.settings.sfxVolume });
  }

  /** Switch to a looping track. Repeating the current track is a no-op. */
  playMusic(key: MusicName, fadeMs = MUSIC_FADE_MS): void {
    if (this.musicKey === key && this.music?.isPlaying) {
      return;
    }

    this.stopMusic(fadeMs);

    const asset = findAsset(key);

    if (!asset || asset.category !== 'music') {
      return;
    }

    const sound = this.manager.add(key, { loop: true, volume: 0 }) as ManagedSound;
    this.music = sound;
    this.musicKey = key;
    sound.play();
    this.fadeMusic(this.musicTargetVolume(asset), fadeMs);
  }

  stopMusic(fadeMs = MUSIC_FADE_MS): void {
    const sound = this.music;
    this.cancelFade();
    this.music = undefined;
    this.musicKey = undefined;

    if (!sound) {
      return;
    }

    if (fadeMs <= 0) {
      sound.destroy();
      return;
    }

    this.runFade(sound, sound.volume, 0, fadeMs, () => sound.destroy());
  }

  private get musicBaseVolume(): number {
    const key = this.musicKey;
    return key ? (findAsset(key)?.volume ?? 0.5) : 0.5;
  }

  private musicTargetVolume(asset: AudioAsset): number {
    return asset.volume * this.settings.musicVolume;
  }

  private applyMusicVolume(): void {
    if (!this.music) {
      return;
    }

    this.music.setVolume(this.musicBaseVolume * this.settings.musicVolume);
  }

  private fadeMusic(target: number, fadeMs: number): void {
    const sound = this.music;

    if (!sound) {
      return;
    }

    this.cancelFade();
    this.musicFade = this.runFade(sound, sound.volume, target, fadeMs);
  }

  /**
   * Each fade owns its own interval. A track being replaced keeps fading out
   * on its own timer while the new track fades in, so neither is orphaned.
   */
  private runFade(
    sound: ManagedSound,
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void,
  ): ReturnType<typeof setInterval> | undefined {
    if (durationMs <= 0) {
      sound.setVolume(to);
      onComplete?.();
      return undefined;
    }

    const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      sound.setVolume(from + ((to - from) * step) / steps);

      if (step >= steps) {
        clearInterval(timer);
        onComplete?.();
      }
    }, FADE_STEP_MS);

    return timer;
  }

  private cancelFade(): void {
    if (this.musicFade !== undefined) {
      clearInterval(this.musicFade);
      this.musicFade = undefined;
    }
  }
}

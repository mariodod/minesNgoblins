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

interface SfxSpec {
  wave: OscillatorType;
  startFrequency: number;
  endFrequency: number;
  duration: number;
  volume: number;
}

const SFX_SPECS: Record<SfxName, SfxSpec> = {
  jump: { wave: 'square', startFrequency: 240, endFrequency: 520, duration: 0.1, volume: 0.05 },
  land: { wave: 'triangle', startFrequency: 90, endFrequency: 50, duration: 0.07, volume: 0.04 },
  throw: { wave: 'triangle', startFrequency: 200, endFrequency: 90, duration: 0.08, volume: 0.045 },
  bounce: { wave: 'square', startFrequency: 120, endFrequency: 70, duration: 0.05, volume: 0.03 },
  hit: { wave: 'square', startFrequency: 95, endFrequency: 40, duration: 0.07, volume: 0.05 },
  'enemy-down': {
    wave: 'sawtooth',
    startFrequency: 170,
    endFrequency: 35,
    duration: 0.2,
    volume: 0.055,
  },
  hurt: { wave: 'sawtooth', startFrequency: 150, endFrequency: 65, duration: 0.18, volume: 0.06 },
  death: { wave: 'sawtooth', startFrequency: 110, endFrequency: 28, duration: 0.5, volume: 0.07 },
  'bone-throw': {
    wave: 'triangle',
    startFrequency: 300,
    endFrequency: 150,
    duration: 0.09,
    volume: 0.04,
  },
  deflect: {
    wave: 'square',
    startFrequency: 900,
    endFrequency: 300,
    duration: 0.06,
    volume: 0.035,
  },
  rumble: {
    wave: 'sawtooth',
    startFrequency: 55,
    endFrequency: 25,
    duration: 0.35,
    volume: 0.04,
  },
  boulder: {
    wave: 'square',
    startFrequency: 95,
    endFrequency: 28,
    duration: 0.18,
    volume: 0.055,
  },
  knife: {
    wave: 'triangle',
    startFrequency: 520,
    endFrequency: 180,
    duration: 0.07,
    volume: 0.035,
  },
  gunshot: {
    wave: 'square',
    startFrequency: 220,
    endFrequency: 45,
    duration: 0.12,
    volume: 0.06,
  },
  magic: {
    wave: 'sine',
    startFrequency: 320,
    endFrequency: 760,
    duration: 0.16,
    volume: 0.04,
  },
  'rune-blast': {
    wave: 'sawtooth',
    startFrequency: 240,
    endFrequency: 40,
    duration: 0.26,
    volume: 0.06,
  },
  'crate-break': {
    wave: 'square',
    startFrequency: 140,
    endFrequency: 50,
    duration: 0.11,
    volume: 0.05,
  },
  pickup: {
    wave: 'square',
    startFrequency: 440,
    endFrequency: 880,
    duration: 0.1,
    volume: 0.04,
  },
  heal: {
    wave: 'sine',
    startFrequency: 380,
    endFrequency: 720,
    duration: 0.2,
    volume: 0.045,
  },
  ore: {
    wave: 'triangle',
    startFrequency: 620,
    endFrequency: 980,
    duration: 0.12,
    volume: 0.04,
  },
  elevator: {
    wave: 'sine',
    startFrequency: 160,
    endFrequency: 420,
    duration: 0.45,
    volume: 0.05,
  },
  empty: {
    wave: 'square',
    startFrequency: 100,
    endFrequency: 80,
    duration: 0.05,
    volume: 0.025,
  },
  'boss-roar': {
    wave: 'sawtooth',
    startFrequency: 85,
    endFrequency: 28,
    duration: 0.65,
    volume: 0.085,
  },
  'boss-hurt': {
    wave: 'square',
    startFrequency: 180,
    endFrequency: 55,
    duration: 0.12,
    volume: 0.065,
  },
  'boss-spit': {
    wave: 'triangle',
    startFrequency: 260,
    endFrequency: 90,
    duration: 0.14,
    volume: 0.05,
  },
  'boss-burrow': {
    wave: 'sawtooth',
    startFrequency: 70,
    endFrequency: 22,
    duration: 0.38,
    volume: 0.05,
  },
  'boss-quake': {
    wave: 'sawtooth',
    startFrequency: 45,
    endFrequency: 18,
    duration: 0.62,
    volume: 0.09,
  },
  'boss-charge': {
    wave: 'sawtooth',
    startFrequency: 120,
    endFrequency: 48,
    duration: 0.55,
    volume: 0.07,
  },
  'boss-summon': {
    wave: 'sine',
    startFrequency: 140,
    endFrequency: 360,
    duration: 0.4,
    volume: 0.05,
  },
  'boss-phase': {
    wave: 'sawtooth',
    startFrequency: 60,
    endFrequency: 180,
    duration: 0.8,
    volume: 0.08,
  },
  'boss-defeat': {
    wave: 'sawtooth',
    startFrequency: 95,
    endFrequency: 18,
    duration: 1.2,
    volume: 0.09,
  },
  'boss-victory': {
    wave: 'sine',
    startFrequency: 220,
    endFrequency: 660,
    duration: 0.9,
    volume: 0.06,
  },
};

/**
 * Placeholder SFX synthesized with WebAudio. No asset files yet.
 * The audio context is created lazily on the first sound, after the player
 * has interacted with the page (starting a run), so autoplay policy is happy.
 */
export class AudioService {
  private context: AudioContext | undefined;
  private masterVolume = 1;

  setVolume(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }

    this.masterVolume = Math.min(1, Math.max(0, value));
  }

  get volume(): number {
    return this.masterVolume;
  }

  play(name: SfxName): void {
    if (this.masterVolume <= 0) {
      return;
    }

    const context = this.getContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }

    const spec = SFX_SPECS[name];
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = spec.wave;
    oscillator.frequency.setValueAtTime(spec.startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, spec.endFrequency),
      now + spec.duration,
    );

    gain.gain.setValueAtTime(Math.max(0.0001, spec.volume * this.masterVolume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + spec.duration);
  }

  private getContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }

    const audioContextClass = window.AudioContext;

    if (!audioContextClass) {
      return undefined;
    }

    this.context = new audioContextClass();
    return this.context;
  }
}

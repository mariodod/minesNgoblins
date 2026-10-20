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
  | 'boulder';

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
};

/**
 * Placeholder SFX synthesized with WebAudio. No asset files yet.
 * The audio context is created lazily on the first sound, after the player
 * has interacted with the page (starting a run), so autoplay policy is happy.
 */
export class AudioService {
  private context: AudioContext | undefined;

  play(name: SfxName): void {
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

    gain.gain.setValueAtTime(spec.volume, now);
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

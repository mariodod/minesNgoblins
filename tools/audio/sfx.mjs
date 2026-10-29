/**
 * One-shot sound effects. Every key here must exist in `SfxName`
 * (src/services/audio-service.ts); the generator asserts that they match.
 */
import { SAMPLE_RATE, createBuffer, finalize, mixInto, renderVoice } from './synth.mjs';

const SR = SAMPLE_RATE;

function build(duration, peak, parts) {
  const buffer = createBuffer(duration, SR);

  for (const [at, voice] of parts) {
    mixInto(buffer, at, renderVoice(SR, voice));
  }

  return { seconds: duration, samples: finalize(buffer, { peak }) };
}

const noise = (duration, cutoff, gain, extra = {}) => ({
  waveform: 'noise',
  frequency: 1,
  endFrequency: 1,
  duration,
  gain,
  attack: 0.002,
  decay: duration * 0.85,
  sustain: 0,
  release: 0.01,
  noiseCutoff: cutoff,
  ...extra,
});

export const SFX = {
  jump: () =>
    build(0.13, 0.62, [
      [
        0,
        {
          waveform: 'pulse',
          duty: 0.3,
          frequency: 300,
          endFrequency: 640,
          duration: 0.11,
          gain: 0.55,
          attack: 0.003,
          decay: 0.08,
          sustain: 0,
          release: 0.02,
        },
      ],
    ]),

  land: () =>
    build(0.14, 0.6, [
      [0, noise(0.06, 900, 0.5)],
      [
        0,
        {
          waveform: 'sine',
          frequency: 95,
          endFrequency: 45,
          duration: 0.12,
          gain: 0.6,
          attack: 0.002,
          decay: 0.09,
          sustain: 0,
          release: 0.02,
        },
      ],
    ]),

  throw: () =>
    build(0.12, 0.55, [
      [0, noise(0.09, 2600, 0.45)],
      [
        0,
        {
          waveform: 'triangle',
          frequency: 260,
          endFrequency: 110,
          duration: 0.1,
          gain: 0.4,
          attack: 0.002,
          decay: 0.08,
          sustain: 0,
          release: 0.01,
        },
      ],
    ]),

  bounce: () =>
    build(0.1, 0.5, [
      [
        0,
        {
          waveform: 'pulse',
          duty: 0.5,
          frequency: 170,
          endFrequency: 90,
          duration: 0.09,
          gain: 0.6,
          attack: 0.002,
          decay: 0.07,
          sustain: 0,
          release: 0.01,
        },
      ],
    ]),

  hit: () =>
    build(0.12, 0.6, [
      [0, noise(0.07, 3200, 0.6)],
      [
        0,
        {
          waveform: 'square',
          frequency: 115,
          endFrequency: 55,
          duration: 0.1,
          gain: 0.4,
          attack: 0.002,
          decay: 0.08,
          sustain: 0,
          release: 0.01,
        },
      ],
    ]),

  'enemy-down': () =>
    build(0.34, 0.62, [
      [
        0,
        {
          waveform: 'saw',
          frequency: 230,
          endFrequency: 48,
          duration: 0.3,
          gain: 0.5,
          attack: 0.003,
          decay: 0.22,
          sustain: 0.08,
          release: 0.06,
        },
      ],
      [0.04, noise(0.2, 1200, 0.35)],
    ]),

  hurt: () =>
    build(0.3, 0.68, [
      [
        0,
        {
          waveform: 'pulse',
          duty: 0.35,
          frequency: 215,
          endFrequency: 70,
          duration: 0.26,
          gain: 0.55,
          attack: 0.003,
          decay: 0.2,
          sustain: 0.1,
          release: 0.05,
        },
      ],
      [0, noise(0.12, 2400, 0.4)],
    ]),

  death: () =>
    build(0.85, 0.72, [
      [
        0,
        {
          waveform: 'saw',
          frequency: 200,
          endFrequency: 30,
          duration: 0.8,
          gain: 0.55,
          attack: 0.005,
          decay: 0.5,
          sustain: 0.2,
          release: 0.25,
          vibrato: 0.08,
          vibratoRate: 7,
          tremolo: 0.25,
          tremoloRate: 9,
        },
      ],
      [0.05, noise(0.4, 900, 0.25)],
    ]),

  'bone-throw': () =>
    build(0.14, 0.5, [
      [0, noise(0.11, 5200, 0.5)],
      [
        0,
        {
          waveform: 'triangle',
          frequency: 520,
          endFrequency: 240,
          duration: 0.1,
          gain: 0.3,
          attack: 0.002,
          decay: 0.08,
          sustain: 0,
          release: 0.01,
        },
      ],
    ]),

  deflect: () =>
    build(0.12, 0.55, [
      [
        0,
        {
          waveform: 'sine',
          frequency: 1450,
          endFrequency: 1320,
          duration: 0.1,
          gain: 0.45,
          attack: 0.001,
          decay: 0.07,
          sustain: 0,
          release: 0.01,
        },
      ],
      [
        0,
        {
          waveform: 'sine',
          frequency: 2150,
          endFrequency: 1980,
          duration: 0.08,
          gain: 0.28,
          attack: 0.001,
          decay: 0.05,
          sustain: 0,
          release: 0.01,
        },
      ],
    ]),

  rumble: () =>
    build(0.5, 0.6, [
      [
        0,
        {
          waveform: 'sine',
          frequency: 58,
          endFrequency: 26,
          duration: 0.46,
          gain: 0.6,
          attack: 0.02,
          decay: 0.2,
          sustain: 0.4,
          release: 0.2,
        },
      ],
      [0, noise(0.44, 210, 0.35)],
    ]),

  boulder: () =>
    build(0.24, 0.62, [
      [
        0,
        {
          waveform: 'sine',
          frequency: 88,
          endFrequency: 32,
          duration: 0.2,
          gain: 0.6,
          attack: 0.002,
          decay: 0.14,
          sustain: 0,
          release: 0.04,
        },
      ],
      [0, noise(0.16, 700, 0.4)],
    ]),

  knife: () =>
    build(0.09, 0.5, [
      [
        0,
        {
          waveform: 'sine',
          frequency: 1250,
          endFrequency: 520,
          duration: 0.08,
          gain: 0.55,
          attack: 0.001,
          decay: 0.06,
          sustain: 0,
          release: 0.01,
        },
      ],
    ]),

  gunshot: () =>
    build(0.2, 0.7, [
      [0, noise(0.14, 3800, 0.7)],
      [
        0,
        {
          waveform: 'sine',
          frequency: 170,
          endFrequency: 45,
          duration: 0.16,
          gain: 0.5,
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.04,
        },
      ],
    ]),

  magic: () =>
    build(0.26, 0.55, [
      [
        0,
        {
          waveform: 'sine',
          frequency: 420,
          endFrequency: 900,
          duration: 0.22,
          gain: 0.45,
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.08,
          vibrato: 0.02,
          vibratoRate: 11,
        },
      ],
      [
        0.05,
        {
          waveform: 'triangle',
          frequency: 840,
          endFrequency: 1480,
          duration: 0.16,
          gain: 0.28,
          attack: 0.01,
          decay: 0.08,
          sustain: 0.2,
          release: 0.05,
        },
      ],
    ]),

  'rune-blast': () =>
    build(0.38, 0.7, [
      [0, noise(0.3, 1600, 0.55)],
      [
        0,
        {
          waveform: 'saw',
          frequency: 320,
          endFrequency: 42,
          duration: 0.34,
          gain: 0.45,
          attack: 0.004,
          decay: 0.24,
          sustain: 0.15,
          release: 0.08,
        },
      ],
    ]),

  'crate-break': () =>
    build(0.2, 0.6, [
      [0, noise(0.14, 1500, 0.6)],
      [
        0,
        {
          waveform: 'square',
          frequency: 210,
          endFrequency: 85,
          duration: 0.16,
          gain: 0.35,
          attack: 0.002,
          decay: 0.1,
          sustain: 0,
          release: 0.05,
        },
      ],
    ]),

  pickup: () =>
    build(0.2, 0.58, [
      [
        0,
        {
          waveform: 'pulse',
          duty: 0.25,
          frequency: 660,
          endFrequency: 660,
          duration: 0.09,
          gain: 0.5,
          attack: 0.002,
          decay: 0.06,
          sustain: 0,
          release: 0.02,
        },
      ],
      [
        0.07,
        {
          waveform: 'pulse',
          duty: 0.25,
          frequency: 990,
          endFrequency: 990,
          duration: 0.11,
          gain: 0.5,
          attack: 0.002,
          decay: 0.07,
          sustain: 0,
          release: 0.03,
        },
      ],
    ]),

  heal: () =>
    build(0.42, 0.55, [
      ...[440, 554, 660].map((frequency, index) => [
        index * 0.08,
        {
          waveform: 'sine',
          frequency,
          endFrequency: frequency,
          duration: 0.22,
          gain: 0.4,
          attack: 0.01,
          decay: 0.12,
          sustain: 0.25,
          release: 0.08,
        },
      ]),
    ]),

  ore: () =>
    build(0.22, 0.55, [
      [
        0,
        {
          waveform: 'triangle',
          frequency: 880,
          endFrequency: 1320,
          duration: 0.1,
          gain: 0.45,
          attack: 0.002,
          decay: 0.06,
          sustain: 0,
          release: 0.03,
        },
      ],
      [
        0.06,
        {
          waveform: 'triangle',
          frequency: 1320,
          endFrequency: 1320,
          duration: 0.12,
          gain: 0.3,
          attack: 0.002,
          decay: 0.08,
          sustain: 0,
          release: 0.03,
        },
      ],
    ]),

  elevator: () =>
    build(0.6, 0.55, [
      [
        0,
        {
          waveform: 'sine',
          frequency: 120,
          endFrequency: 280,
          duration: 0.56,
          gain: 0.45,
          attack: 0.05,
          decay: 0.2,
          sustain: 0.5,
          release: 0.2,
          tremolo: 0.2,
          tremoloRate: 6,
        },
      ],
      [0, noise(0.5, 520, 0.2)],
    ]),

  empty: () =>
    build(0.07, 0.35, [
      [
        0,
        {
          waveform: 'square',
          frequency: 95,
          endFrequency: 80,
          duration: 0.06,
          gain: 0.5,
          attack: 0.002,
          decay: 0.04,
          sustain: 0,
          release: 0.01,
        },
      ],
    ]),

  'boss-roar': () =>
    build(0.95, 0.8, [
      [
        0,
        {
          waveform: 'saw',
          frequency: 95,
          endFrequency: 26,
          duration: 0.9,
          gain: 0.55,
          attack: 0.03,
          decay: 0.4,
          sustain: 0.35,
          release: 0.3,
          vibrato: 0.07,
          vibratoRate: 9,
        },
      ],
      [0, noise(0.8, 420, 0.35, { attack: 0.05, decay: 0.5, sustain: 0.2, release: 0.2 })],
    ]),

  'boss-hurt': () =>
    build(0.22, 0.7, [
      [
        0,
        {
          waveform: 'square',
          frequency: 195,
          endFrequency: 60,
          duration: 0.18,
          gain: 0.55,
          attack: 0.003,
          decay: 0.12,
          sustain: 0.1,
          release: 0.05,
        },
      ],
      [0, noise(0.1, 2200, 0.4)],
    ]),

  'boss-spit': () =>
    build(0.22, 0.6, [
      [0, noise(0.18, 1200, 0.5)],
      [
        0,
        {
          waveform: 'triangle',
          frequency: 330,
          endFrequency: 110,
          duration: 0.18,
          gain: 0.4,
          attack: 0.003,
          decay: 0.12,
          sustain: 0,
          release: 0.05,
        },
      ],
    ]),

  'boss-burrow': () =>
    build(0.6, 0.6, [
      [0, noise(0.5, 300, 0.6, { attack: 0.04, decay: 0.3, sustain: 0.3, release: 0.2 })],
      [
        0,
        {
          waveform: 'sine',
          frequency: 72,
          endFrequency: 22,
          duration: 0.54,
          gain: 0.45,
          attack: 0.04,
          decay: 0.25,
          sustain: 0.3,
          release: 0.2,
        },
      ],
    ]),

  'boss-quake': () =>
    build(0.9, 0.85, [
      [
        0,
        {
          waveform: 'sine',
          frequency: 44,
          endFrequency: 18,
          duration: 0.85,
          gain: 0.7,
          attack: 0.02,
          decay: 0.4,
          sustain: 0.45,
          release: 0.3,
        },
      ],
      [0, noise(0.8, 190, 0.5, { attack: 0.03, decay: 0.5, sustain: 0.3, release: 0.25 })],
    ]),

  'boss-charge': () =>
    build(0.7, 0.75, [
      [
        0,
        {
          waveform: 'saw',
          frequency: 130,
          endFrequency: 42,
          duration: 0.66,
          gain: 0.5,
          attack: 0.04,
          decay: 0.3,
          sustain: 0.4,
          release: 0.2,
        },
      ],
      [0, noise(0.6, 900, 0.4, { attack: 0.05, decay: 0.35, sustain: 0.3, release: 0.15 })],
    ]),

  'boss-summon': () =>
    build(0.55, 0.6, [
      ...[220, 277, 330].map((frequency, index) => [
        index * 0.02,
        {
          waveform: 'sine',
          frequency,
          endFrequency: frequency * 1.5,
          duration: 0.5,
          gain: 0.3,
          attack: 0.08,
          decay: 0.2,
          sustain: 0.35,
          release: 0.18,
        },
      ]),
    ]),

  'boss-phase': () =>
    build(1.05, 0.82, [
      [
        0,
        {
          waveform: 'saw',
          frequency: 62,
          endFrequency: 230,
          duration: 1,
          gain: 0.5,
          attack: 0.06,
          decay: 0.4,
          sustain: 0.45,
          release: 0.35,
          vibrato: 0.04,
          vibratoRate: 5,
        },
      ],
      [
        0,
        {
          waveform: 'sine',
          frequency: 31,
          endFrequency: 62,
          duration: 1,
          gain: 0.45,
          attack: 0.05,
          decay: 0.4,
          sustain: 0.4,
          release: 0.35,
        },
      ],
      [0.2, noise(0.7, 1500, 0.25, { attack: 0.1, decay: 0.4, sustain: 0.2, release: 0.2 })],
    ]),

  'boss-defeat': () =>
    build(1.7, 0.85, [
      [
        0,
        {
          waveform: 'saw',
          frequency: 105,
          endFrequency: 18,
          duration: 1.6,
          gain: 0.6,
          attack: 0.01,
          decay: 0.7,
          sustain: 0.3,
          release: 0.5,
          vibrato: 0.09,
          vibratoRate: 6,
          tremolo: 0.3,
          tremoloRate: 7,
        },
      ],
      [0.1, noise(1.3, 700, 0.35, { attack: 0.05, decay: 0.8, sustain: 0.2, release: 0.4 })],
    ]),

  'boss-victory': () =>
    build(1.5, 0.72, [
      ...[523, 659, 784, 1047].map((frequency, index) => [
        index * 0.14,
        {
          waveform: 'pulse',
          duty: 0.5,
          frequency,
          endFrequency: frequency,
          duration: index === 3 ? 0.9 : 0.24,
          gain: 0.4,
          attack: 0.006,
          decay: 0.18,
          sustain: index === 3 ? 0.45 : 0.15,
          release: index === 3 ? 0.4 : 0.08,
        },
      ]),
    ]),
};

export const SFX_KEYS = Object.keys(SFX);

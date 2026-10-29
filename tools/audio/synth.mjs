/**
 * Small deterministic synth used by the audio pack.
 *
 * Voices are rendered offline into float buffers, mixed, soft-clipped, and
 * written as PCM WAV. Noise uses a seeded xorshift generator so repeated
 * `npm run assets` runs produce byte-identical files.
 */
export const SAMPLE_RATE = 16000;

const NOTE_OFFSETS = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/** Convert a note name such as `A2` or `C#4` to hertz (A4 = 440). */
export function noteToFrequency(name) {
  const match = /^([A-G][#b]?)(-?\d)$/.exec(name);

  if (!match) {
    throw new Error(`Unknown note "${name}"`);
  }

  const semitone = NOTE_OFFSETS[match[1]];
  const octave = Number.parseInt(match[2], 10);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

export function createBuffer(seconds, sampleRate = SAMPLE_RATE) {
  return {
    sampleRate,
    data: new Float32Array(Math.max(1, Math.ceil(seconds * sampleRate))),
  };
}

/** Mix a rendered voice into a buffer at an offset in seconds. */
export function mixInto(buffer, startSeconds, samples) {
  const offset = Math.round(startSeconds * buffer.sampleRate);

  for (let index = 0; index < samples.length; index += 1) {
    const target = offset + index;

    if (target >= 0 && target < buffer.data.length) {
      buffer.data[target] += samples[index];
    }
  }
}

function xorshift(seed) {
  let state = seed | 0 || 0x9e3779b9;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function envelopeAt(t, { attack, decay, sustain, duration, release }) {
  const releaseStart = Math.max(attack + decay, duration - release);

  if (t < attack) {
    return attack > 0 ? t / attack : 1;
  }

  if (t < attack + decay) {
    const progress = decay > 0 ? (t - attack) / decay : 1;
    return 1 - (1 - sustain) * progress;
  }

  if (t < releaseStart) {
    return sustain;
  }

  const remaining = duration - t;
  return release > 0 ? Math.max(0, sustain * (remaining / release)) : 0;
}

export function renderVoice(sampleRate, options) {
  const {
    waveform = 'square',
    frequency,
    endFrequency = frequency,
    duration,
    gain = 0.2,
    attack = 0.004,
    decay = 0.12,
    sustain = 0,
    release = 0.02,
    duty = 0.5,
    vibrato = 0,
    vibratoRate = 6,
    tremolo = 0,
    tremoloRate = 8,
    exponential = true,
    noiseCutoff = 0,
    seed = 0x2545f491,
  } = options;

  const length = Math.max(1, Math.round(duration * sampleRate));
  const samples = new Float32Array(length);
  const random = xorshift(seed);
  let phase = 0;
  let filtered = 0;
  const filterAlpha = noiseCutoff > 0 ? 1 - Math.exp((-2 * Math.PI * noiseCutoff) / sampleRate) : 1;

  for (let index = 0; index < length; index += 1) {
    const t = index / sampleRate;
    const progress = duration > 0 ? t / duration : 1;
    const sweep = exponential
      ? frequency * (endFrequency / frequency) ** progress
      : frequency + (endFrequency - frequency) * progress;
    const wobble = vibrato > 0 ? 1 + vibrato * Math.sin(2 * Math.PI * vibratoRate * t) : 1;
    const currentFrequency = Math.max(1, sweep * wobble);
    phase += (2 * Math.PI * currentFrequency) / sampleRate;

    if (phase > Math.PI * 2) {
      phase -= Math.PI * 2;
    }

    let value;
    const turn = phase / (Math.PI * 2);

    switch (waveform) {
      case 'sine':
        value = Math.sin(phase);
        break;
      case 'triangle':
        value = 1 - 4 * Math.abs(turn - 0.5);
        break;
      case 'saw':
        value = 2 * turn - 1;
        break;
      case 'pulse':
        value = turn < duty ? 1 : -1;
        break;
      case 'noise': {
        const white = random() * 2 - 1;
        filtered += filterAlpha * (white - filtered);
        value = noiseCutoff > 0 ? filtered : white;
        break;
      }
      case 'square':
      default:
        value = turn < 0.5 ? 1 : -1;
        break;
    }

    const envelope = envelopeAt(t, { attack, decay, sustain, duration, release });
    const tremoloGain =
      tremolo > 0 ? 1 - tremolo * (0.5 + 0.5 * Math.sin(2 * Math.PI * tremoloRate * t)) : 1;
    samples[index] = value * envelope * gain * tremoloGain;
  }

  return samples;
}

/**
 * Combine voices, soft-clip the sum, normalise the peak, and trim the first and
 * last few milliseconds so loops and one-shots never start or end on a click.
 */
export function finalize(buffer, { peak = 0.82, fade = 0.004 } = {}) {
  const data = buffer.data;
  let maximum = 0;
  let sum = 0;

  for (let index = 0; index < data.length; index += 1) {
    sum += data[index];
  }

  // Pulse waves with a narrow duty cycle carry a large DC offset. Removing it
  // buys headroom and stops one-shots from thumping when they start.
  const mean = sum / data.length;

  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.tanh((data[index] - mean) * 1.2);
    maximum = Math.max(maximum, Math.abs(data[index]));
  }

  const scale = maximum > 0 ? peak / maximum : 1;
  const fadeSamples = Math.min(Math.floor(fade * buffer.sampleRate), Math.floor(data.length / 2));

  for (let index = 0; index < data.length; index += 1) {
    let gain = scale;

    if (index < fadeSamples) {
      gain *= index / fadeSamples;
    } else if (index >= data.length - fadeSamples) {
      gain *= (data.length - index - 1) / fadeSamples;
    }

    data[index] *= gain;
  }

  return data;
}

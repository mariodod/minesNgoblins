/**
 * Music loops. Each track is four bars of 16th-note steps, arranged by hand so
 * the three themes share one chiptune palette: pulse leads, triangle bass,
 * noise percussion.
 */
import {
  SAMPLE_RATE,
  createBuffer,
  finalize,
  mixInto,
  noteToFrequency,
  renderVoice,
} from './synth.mjs';

const SR = SAMPLE_RATE;

const REST = null;

const INSTRUMENTS = {
  bass: (frequency, duration, gain) =>
    renderVoice(SR, {
      waveform: 'triangle',
      frequency,
      duration,
      gain,
      attack: 0.005,
      decay: duration * 0.45,
      sustain: 0.55,
      release: 0.035,
    }),

  lead: (frequency, duration, gain) =>
    renderVoice(SR, {
      waveform: 'pulse',
      duty: 0.25,
      frequency,
      duration,
      gain,
      attack: 0.006,
      decay: 0.09,
      sustain: 0.45,
      release: 0.05,
      vibrato: 0.012,
      vibratoRate: 5.5,
    }),

  arp: (frequency, duration, gain) =>
    renderVoice(SR, {
      waveform: 'pulse',
      duty: 0.125,
      frequency,
      duration,
      gain,
      attack: 0.003,
      decay: duration * 0.85,
      sustain: 0,
      release: 0.012,
    }),

  pad: (frequency, duration, gain) =>
    renderVoice(SR, {
      waveform: 'triangle',
      frequency,
      duration,
      gain,
      attack: 0.18,
      decay: 0.25,
      sustain: 0.6,
      release: 0.25,
    }),

  kick: (duration, gain) =>
    renderVoice(SR, {
      waveform: 'sine',
      frequency: 125,
      endFrequency: 42,
      duration,
      gain,
      attack: 0.002,
      decay: duration * 0.8,
      sustain: 0,
      release: 0.01,
    }),

  snare: (duration, gain) => {
    const buffer = createBuffer(duration, SR);
    mixInto(
      buffer,
      0,
      renderVoice(SR, {
        waveform: 'noise',
        frequency: 1,
        endFrequency: 1,
        duration,
        gain: gain * 1.2,
        attack: 0.001,
        decay: duration * 0.8,
        sustain: 0,
        release: 0.01,
        noiseCutoff: 2600,
        seed: 0x51ed2701,
      }),
    );
    mixInto(
      buffer,
      0,
      renderVoice(SR, {
        waveform: 'triangle',
        frequency: 215,
        endFrequency: 150,
        duration,
        gain: gain * 0.6,
        attack: 0.001,
        decay: duration * 0.7,
        sustain: 0,
        release: 0.01,
      }),
    );
    return buffer.data;
  },

  hat: (duration, gain) =>
    renderVoice(SR, {
      waveform: 'noise',
      frequency: 1,
      endFrequency: 1,
      duration,
      gain,
      attack: 0.001,
      decay: duration * 0.7,
      sustain: 0,
      release: 0.005,
      noiseCutoff: 8200,
      seed: 0x1b3f6d09,
    }),
};

/** Percussion channels write `x` markers instead of note names. */
function isPercussion(instrument) {
  return instrument === 'kick' || instrument === 'snare' || instrument === 'hat';
}

function renderTrack({ key, bpm, bars, channels, peak = 0.72 }) {
  const stepSeconds = 60 / bpm / 4;
  const stepCount = bars * 16;
  const seconds = stepCount * stepSeconds;
  const buffer = createBuffer(seconds, SR);

  for (const channel of channels) {
    const instrument = INSTRUMENTS[channel.instrument];
    const percussion = isPercussion(channel.instrument);

    if (!instrument) {
      throw new Error(`${key}: unknown instrument "${channel.instrument}"`);
    }

    for (let step = 0; step < stepCount; step += 1) {
      const token = channel.tokens[step];

      if (!token) {
        continue;
      }

      const duration = stepSeconds * (channel.steps ?? 1) * (channel.hold ?? 1);
      const gain = channel.gain ?? 0.4;
      const samples = percussion
        ? instrument(duration, gain)
        : instrument(noteToFrequency(token), duration, gain);

      mixInto(buffer, step * stepSeconds, samples);
    }
  }

  return { key, seconds, samples: finalize(buffer, { peak, fade: 0.006 }) };
}

/** Repeat a bar token list to fill the loop. */
function barsOf(bars, perBar) {
  return bars.flatMap((bar) => perBar(bar));
}

function bar(root, fifth, bassSteps) {
  const tokens = new Array(16).fill(REST);

  for (const [step, offset] of bassSteps) {
    tokens[step] = offset === 0 ? root : offset === 1 ? fifth : root;
  }

  return tokens;
}

const KICK_BACKBEAT = [0, 8];

/** Percussion bars are just a list of 16th-note steps that have a hit. */
function hitBar(steps) {
  const tokens = new Array(16).fill(REST);

  for (const step of steps) {
    tokens[step] = 'x';
  }

  return tokens;
}

const BASS_LONG = [
  [0, 0],
  [6, 1],
  [12, 0],
];

const BASS_EIGHTHS = [
  [0, 0],
  [2, 0],
  [4, 1],
  [6, 0],
  [8, 0],
  [10, 0],
  [12, 1],
  [14, 0],
];

const ARP_EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];

function arpBar(notes) {
  const tokens = new Array(16).fill(REST);

  ARP_EIGHTHS.forEach((step, index) => {
    tokens[step] = notes[index % notes.length];
  });

  return tokens;
}

function withTitles(tokens, title) {
  if (tokens.length !== 64) {
    throw new Error(`${title}: expected 64 steps, got ${tokens.length}`);
  }

  return tokens;
}

const TITLE = renderTrack({
  key: 'music-title',
  bpm: 84,
  bars: 4,
  channels: [
    {
      instrument: 'pad',
      gain: 0.16,
      hold: 15,
      tokens: barsOf(['Am', 'Am', 'F', 'G'], (barName) => {
        const root = { Am: 'A3', F: 'F3', G: 'G3' }[barName];
        const tokens = new Array(16).fill(REST);
        tokens[0] = root;
        return tokens;
      }),
    },
    {
      instrument: 'bass',
      gain: 0.42,
      tokens: withTitles(
        barsOf(
          [
            ['A2', 'E3'],
            ['A2', 'E3'],
            ['F2', 'C3'],
            ['G2', 'D3'],
          ],
          ([root, fifth]) => bar(root, fifth, BASS_LONG),
        ),
        'music-title bass',
      ),
    },
    {
      instrument: 'arp',
      gain: 0.12,
      steps: 2,
      tokens: withTitles(
        barsOf(
          [
            ['A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'E4', 'C4'],
            ['A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'E4', 'C4'],
            ['F3', 'A3', 'C4', 'A3', 'F3', 'A3', 'C4', 'A3'],
            ['G3', 'B3', 'D4', 'B3', 'G3', 'B3', 'D4', 'B3'],
          ],
          arpBar,
        ),
        'music-title arp',
      ),
    },
    {
      instrument: 'lead',
      gain: 0.24,
      steps: 2,
      tokens: withTitles(
        [
          REST,
          REST,
          'E5',
          REST,
          'D5',
          REST,
          REST,
          REST,
          'C5',
          REST,
          REST,
          'A4',
          REST,
          REST,
          REST,
          REST,
          REST,
          REST,
          'A4',
          REST,
          'C5',
          REST,
          'D5',
          REST,
          'E5',
          REST,
          REST,
          REST,
          REST,
          REST,
          REST,
          REST,
          REST,
          REST,
          'F5',
          REST,
          'E5',
          REST,
          REST,
          REST,
          'C5',
          REST,
          'A4',
          REST,
          REST,
          REST,
          REST,
          REST,
          'B4',
          REST,
          REST,
          REST,
          'D5',
          REST,
          REST,
          REST,
          'G4',
          REST,
          REST,
          REST,
          REST,
          REST,
          REST,
          REST,
        ],
        'music-title lead',
      ),
    },
    {
      instrument: 'kick',
      gain: 0.3,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar(KICK_BACKBEAT)),
        'music-title kick',
      ),
    },
    {
      instrument: 'hat',
      gain: 0.05,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar([4, 12])),
        'music-title hat',
      ),
    },
  ],
});

const MINES = renderTrack({
  key: 'music-mines',
  bpm: 132,
  bars: 4,
  channels: [
    {
      instrument: 'bass',
      gain: 0.4,
      steps: 2,
      tokens: withTitles(
        barsOf(
          [
            ['A2', 'E3'],
            ['F2', 'C3'],
            ['C3', 'G3'],
            ['G2', 'D3'],
          ],
          ([root, fifth]) => bar(root, fifth, BASS_EIGHTHS),
        ),
        'music-mines bass',
      ),
    },
    {
      instrument: 'arp',
      gain: 0.09,
      steps: 2,
      tokens: withTitles(
        barsOf(
          [
            ['A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'E4', 'C4'],
            ['F3', 'A3', 'C4', 'A3', 'F3', 'A3', 'C4', 'A3'],
            ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'E4'],
            ['G3', 'B3', 'D4', 'B3', 'G3', 'B3', 'D4', 'B3'],
          ],
          arpBar,
        ),
        'music-mines arp',
      ),
    },
    {
      instrument: 'lead',
      gain: 0.22,
      steps: 2,
      tokens: withTitles(
        [
          REST,
          'E5',
          REST,
          REST,
          'D5',
          REST,
          'C5',
          REST,
          REST,
          'A4',
          REST,
          REST,
          'C5',
          REST,
          'D5',
          REST,
          REST,
          'C5',
          REST,
          REST,
          'A4',
          REST,
          'C5',
          REST,
          REST,
          'F4',
          REST,
          REST,
          'A4',
          REST,
          REST,
          REST,
          REST,
          'G4',
          REST,
          REST,
          'C5',
          REST,
          'E5',
          REST,
          REST,
          'D5',
          REST,
          REST,
          'C5',
          REST,
          'G4',
          REST,
          REST,
          'D5',
          REST,
          REST,
          'B4',
          REST,
          'G4',
          REST,
          REST,
          'A4',
          REST,
          REST,
          'B4',
          REST,
          'D5',
          REST,
        ],
        'music-mines lead',
      ),
    },
    {
      instrument: 'kick',
      gain: 0.32,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar([0, 6, 8, 14])),
        'music-mines kick',
      ),
    },
    {
      instrument: 'snare',
      gain: 0.16,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar([4, 12])),
        'music-mines snare',
      ),
    },
    {
      instrument: 'hat',
      gain: 0.06,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar([0, 2, 4, 6, 8, 10, 12, 14])),
        'music-mines hat',
      ),
    },
  ],
});

const BOSS = renderTrack({
  key: 'music-boss',
  bpm: 152,
  bars: 4,
  peak: 0.78,
  channels: [
    {
      instrument: 'bass',
      gain: 0.44,
      steps: 2,
      tokens: withTitles(
        barsOf(
          [
            ['D2', 'A2'],
            ['D2', 'A2'],
            ['Bb2', 'F3'],
            ['A2', 'E3'],
          ],
          ([root, fifth]) => bar(root, fifth, BASS_EIGHTHS),
        ),
        'music-boss bass',
      ),
    },
    {
      instrument: 'arp',
      gain: 0.1,
      steps: 1,
      tokens: withTitles(
        barsOf(
          [
            ['D4', 'F4', 'A4', 'F4'],
            ['D4', 'F4', 'A4', 'F4'],
            ['Bb3', 'D4', 'F4', 'D4'],
            ['A3', 'C#4', 'E4', 'C#4'],
          ],
          arpBar,
        ),
        'music-boss arp',
      ),
    },
    {
      instrument: 'lead',
      gain: 0.26,
      steps: 1,
      tokens: withTitles(
        [
          'D5',
          REST,
          'F5',
          REST,
          'E5',
          REST,
          'D5',
          REST,
          'A4',
          REST,
          'D5',
          REST,
          'F5',
          REST,
          'E5',
          REST,
          'D5',
          REST,
          'A4',
          REST,
          'Bb4',
          REST,
          'A4',
          REST,
          'F4',
          REST,
          'A4',
          REST,
          'D5',
          REST,
          REST,
          REST,
          'F5',
          REST,
          'D5',
          REST,
          'Bb4',
          REST,
          'D5',
          REST,
          'F5',
          REST,
          'A5',
          REST,
          'F5',
          REST,
          'D5',
          REST,
          'E5',
          REST,
          'C#5',
          REST,
          'A4',
          REST,
          'C#5',
          REST,
          'E5',
          REST,
          'A5',
          REST,
          'E5',
          REST,
          'C#5',
          REST,
        ],
        'music-boss lead',
      ),
    },
    {
      instrument: 'kick',
      gain: 0.34,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar([0, 3, 6, 8, 11, 14])),
        'music-boss kick',
      ),
    },
    {
      instrument: 'snare',
      gain: 0.18,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar([4, 12])),
        'music-boss snare',
      ),
    },
    {
      instrument: 'hat',
      gain: 0.07,
      tokens: withTitles(
        barsOf([0, 1, 2, 3], () => hitBar([0, 2, 4, 6, 8, 10, 12, 14])),
        'music-boss hat',
      ),
    },
  ],
});

export const MUSIC = [TITLE, MINES, BOSS];

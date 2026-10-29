/**
 * Generates the WAV audio pack and returns manifest entries.
 *
 * Called by tools/assets/build-assets.mjs so one command regenerates art,
 * audio, and the shared manifest.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { MUSIC } from './music.mjs';
import { SFX } from './sfx.mjs';
import { SAMPLE_RATE } from './synth.mjs';
import { encodeWav } from './wav.mjs';

const MUSIC_VOLUME = {
  'music-title': 0.45,
  'music-mines': 0.5,
  'music-boss': 0.55,
};

/**
 * The TypeScript service owns the list of playable keys, so read it and fail
 * the build when the generator and the code drift apart.
 */
function declaredKeys(projectRoot, typeName) {
  const source = readFileSync(join(projectRoot, 'src', 'services', 'audio-service.ts'), 'utf8');
  const match = new RegExp(`export type ${typeName}\\s*=([^;]+);`).exec(source);

  if (!match) {
    throw new Error(`Could not find "export type ${typeName}" in audio-service.ts`);
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]).sort();
}

function assertSameKeys(label, expected, actual) {
  const missing = expected.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !expected.includes(key));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label} mismatch. Missing from generator: ${missing.join(', ') || 'none'}. ` +
        `Not declared in audio-service.ts: ${extra.join(', ') || 'none'}.`,
    );
  }
}

export function buildAudio(publicRoot, projectRoot) {
  const entries = [];
  const sfxKeys = Object.keys(SFX).sort();
  const musicKeys = MUSIC.map((track) => track.key).sort();

  assertSameKeys('SFX keys', declaredKeys(projectRoot, 'SfxName'), sfxKeys);
  assertSameKeys('Music keys', declaredKeys(projectRoot, 'MusicName'), musicKeys);

  for (const [key, render] of Object.entries(SFX)) {
    const { seconds, samples } = render();
    const url = `audio/sfx/${key}.wav`;
    const target = join(publicRoot, url);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, encodeWav(samples, SAMPLE_RATE));
    entries.push({ key, url, category: 'sfx', seconds, volume: 1 });
  }

  for (const track of MUSIC) {
    const url = `audio/music/${track.key}.wav`;
    const target = join(publicRoot, url);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, encodeWav(track.samples, SAMPLE_RATE));
    entries.push({
      key: track.key,
      url,
      category: 'music',
      seconds: track.seconds,
      volume: MUSIC_VOLUME[track.key] ?? 0.5,
    });
  }

  const totalBytes = entries.reduce((total, entry) => {
    const size = readFileSync(join(publicRoot, entry.url)).byteLength;
    return total + size;
  }, 0);

  console.log(
    `Generated ${sfxKeys.length} sound effects and ${musicKeys.length} music loops ` +
      `(${(totalBytes / 1024).toFixed(0)} KB) at ${SAMPLE_RATE} Hz.`,
  );
  console.log(`Audio written to ${relative(projectRoot, join(publicRoot, 'audio'))}`);

  return entries;
}

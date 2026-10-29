/**
 * Minimal 16-bit mono PCM WAV encoder.
 *
 * The audio pack is generated as WAV because it decodes everywhere without a
 * native encoder, and the pack is fetched from `public/` so the size never
 * lands in the JS bundle.
 */
import { Buffer } from 'node:buffer';

const HEADER_BYTES = 44;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

/** Clamp and convert float samples in [-1, 1] to signed 16-bit PCM. */
function toPcm(samples) {
  const data = Buffer.alloc(samples.length * 2);

  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index] ?? 0));
    data.writeInt16LE(Math.round(value * 32767), index * 2);
  }

  return data;
}

export function encodeWav(samples, sampleRate) {
  const data = toPcm(samples);
  const buffer = Buffer.alloc(HEADER_BYTES + data.length);
  const byteRate = sampleRate * CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + data.length, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(data.length, 40);
  data.copy(buffer, HEADER_BYTES);

  return buffer;
}

import { describe, expect, it } from 'vitest';
import { AudioService } from '../../src/services/audio-service';

describe('AudioService', () => {
  it('stores a clamped master volume', () => {
    const audio = new AudioService();

    audio.setVolume(0.45);
    expect(audio.volume).toBe(0.45);

    audio.setVolume(2);
    expect(audio.volume).toBe(1);

    audio.setVolume(-1);
    expect(audio.volume).toBe(0);
  });

  it('ignores non-finite volume updates', () => {
    const audio = new AudioService();
    audio.setVolume(0.3);
    audio.setVolume(Number.NaN);

    expect(audio.volume).toBe(0.3);
  });
});

import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { flashCamera } from '../../src/utils/camera-flash';

function makeScene(intensity?: string): { scene: Phaser.Scene; flash: ReturnType<typeof vi.fn> } {
  const flash = vi.fn();
  const saveService = intensity ? { settings: { flashIntensity: intensity } } : undefined;

  return {
    scene: {
      registry: { get: () => saveService },
      cameras: { main: { flash } },
    } as unknown as Phaser.Scene,
    flash,
  };
}

describe('flashCamera', () => {
  it('uses the full colour by default', () => {
    const { scene, flash } = makeScene();
    flashCamera(scene, 110, 140, 20, 20);
    expect(flash).toHaveBeenCalledWith(110, 140, 20, 20);
  });

  it('dims the colour when reduced', () => {
    const { scene, flash } = makeScene('reduced');
    flashCamera(scene, 110, 140, 20, 20);
    expect(flash).toHaveBeenCalledWith(110, 49, 7, 7);
  });

  it('skips the flash when disabled', () => {
    const { scene, flash } = makeScene('off');
    flashCamera(scene, 110, 140, 20, 20);
    expect(flash).not.toHaveBeenCalled();
  });
});

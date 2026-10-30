import type Phaser from 'phaser';
import type { SaveService } from '../services/save-service';

/**
 * Camera flash that honours the Flash Intensity accessibility setting.
 * `reduced` dims the colour instead of shortening the effect so the timing
 * stays readable; `off` removes the flash entirely.
 */
export function flashCamera(
  scene: Phaser.Scene,
  duration: number,
  red: number,
  green: number,
  blue: number,
): void {
  const settings = (scene.registry.get('saveService') as SaveService | undefined)?.settings;
  const intensity = settings?.flashIntensity ?? 'full';

  if (intensity === 'off') {
    return;
  }

  const scale = intensity === 'reduced' ? 0.35 : 1;

  scene.cameras.main.flash(
    duration,
    Math.round(red * scale),
    Math.round(green * scale),
    Math.round(blue * scale),
  );
}

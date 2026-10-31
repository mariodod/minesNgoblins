import { expect, test } from '@playwright/test';
import { bootToTitle, collectPageErrors, pressKey, readHook } from './helpers';

const AUDIO_ASSET_COUNT = 35;

// Playwright's WebKit build ships without Web Audio, so Phaser's HTML5 audio
// fallback cannot decode the WAV pack. The game detects this and boots silent;
// real Safari has Web Audio and runs these tests normally.
test.skip(({ browserName }) => browserName === 'webkit', 'WebKit build has no Web Audio');

test('loads the generated audio pack without errors', async ({ page }) => {
  const errors = collectPageErrors(page);

  await bootToTitle(page);
  await expect.poll(() => readHook<number>(page, 'audioAssets')).toBe(AUDIO_ASSET_COUNT);

  expect(errors).toEqual([]);
});

test('walks the title, level, and boss themes as the run changes scenes', async ({ page }) => {
  await bootToTitle(page);

  // The first key press unlocks the browser audio context, which lets the
  // title loop start reporting itself as playing.
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'music')).toBe('music-title');
  await pressKey(page, 'ArrowUp');

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('RunSetup');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 8000 }).toBe('Level');
  await expect.poll(() => readHook<string>(page, 'music')).toBe('music-mines');
});

test('switches to the boss theme in the debug arena', async ({ page }) => {
  await bootToTitle(page, '/?boss=1');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Boss');
  await expect.poll(() => readHook<string>(page, 'music')).toBe('music-boss');
});

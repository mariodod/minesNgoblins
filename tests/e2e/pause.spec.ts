import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, startRun } from './helpers';

test('pause opens settings, resumes the run, and keeps the player in place', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);
  await expect.poll(() => readHook<number>(page, 'hp')).toBe(5);

  await page.keyboard.press('Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Resume');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Options');

  await page.keyboard.press('Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Settings');
  await expect.poll(() => readHook<string>(page, 'settingsSelection')).toBe('Master Volume');

  await page.keyboard.press('ArrowRight');
  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(0.9);

  await page.keyboard.press('Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');

  await page.keyboard.press('Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Level');
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);

  expect(errors).toEqual([]);
});

test('restarting from pause resets the current level', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => readHook<number>(page, 'playerX')).toBeGreaterThan(100);

  await page.keyboard.press('Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');

  await page.keyboard.press('ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Restart Level');
  await page.keyboard.press('Enter');

  await expect.poll(() => readHook<number>(page, 'playerX'), { timeout: 8000 }).toBeLessThan(80);
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('shaft-entrance');
  await expect.poll(() => readHook<number>(page, 'runDeaths')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'hp')).toBe(5);

  expect(errors).toEqual([]);
});

test('quit run confirms, ends the run, and returns to the title screen', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Quit Run');

  await page.keyboard.press('Enter');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Confirm Quit');

  await page.keyboard.press('Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(false);
  await expect.poll(() => readHook<string>(page, 'message')).toContain('Run abandoned');

  expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { collectPageErrors, pressKey, readHook, startRun } from './helpers';

test('pause opens settings, resumes the run, and keeps the player in place', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);
  await expect.poll(() => readHook<number>(page, 'hp')).toBe(5);

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Resume');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Restart Level');
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Options');

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Settings');
  await expect.poll(() => readHook<string>(page, 'settingsSelection')).toBe('Master Volume');

  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(0.9);

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Level');
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);

  expect(errors).toEqual([]);
});

test('restarting from pause resets the current level', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);

  // Keep the key held until the player actually moves. WebKit's software
  // renderer runs fewer physics steps per second, so a fixed wait is flaky.
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(() => readHook<number>(page, 'playerX'), { timeout: 8000 })
    .toBeGreaterThan(100);
  await page.keyboard.up('ArrowRight');

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Restart Level');
  await pressKey(page, 'Enter');

  await expect.poll(() => readHook<number>(page, 'playerX'), { timeout: 8000 }).toBeLessThan(80);
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('shaft-entrance');
  await expect.poll(() => readHook<number>(page, 'runDeaths')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'hp')).toBe(5);

  expect(errors).toEqual([]);
});

test('quit run confirms, ends the run, and returns to the title screen', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);
  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Restart Level');
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Options');
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Quit Run');

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Confirm Quit');

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(false);
  await expect.poll(() => readHook<string>(page, 'message')).toContain('Run abandoned');

  expect(errors).toEqual([]);
});

test('starts a fresh run after quitting, twice in a row', async ({ page }) => {
  const errors = collectPageErrors(page);

  const quitRun = async (): Promise<void> => {
    await pressKey(page, 'Escape');
    await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');
    for (let step = 0; step < 3; step += 1) {
      await pressKey(page, 'ArrowDown');
    }
    await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Quit Run');
    await pressKey(page, 'Enter');
    await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Confirm Quit');
    await pressKey(page, 'Enter');
    await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');
  };

  const startFreshRun = async (): Promise<void> => {
    await pressKey(page, 'Enter');
    await expect.poll(() => readHook<string>(page, 'scene')).toBe('RunSetup');
    await pressKey(page, 'Enter');
    await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 8000 }).toBe('Level');
    await expect.poll(() => readHook<string>(page, 'levelId')).toBe('shaft-entrance');
    await expect.poll(() => readHook<number>(page, 'hp')).toBe(5);
    await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);

    const before = (await readHook<number>(page, 'frameCount')) ?? 0;
    await page.waitForTimeout(300);
    const after = (await readHook<number>(page, 'frameCount')) ?? 0;
    expect(after).toBeGreaterThan(before);

    await page.keyboard.down('ArrowRight');
    await expect
      .poll(() => readHook<number>(page, 'playerX'), { timeout: 8000 })
      .toBeGreaterThan(56);
    await page.keyboard.up('ArrowRight');
  };

  await startRun(page);
  await quitRun();
  await startFreshRun();
  await quitRun();
  await startFreshRun();

  expect(errors).toEqual([]);
});

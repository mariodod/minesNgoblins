import { expect, test, type Page } from '@playwright/test';
import { bootToTitle, pressKey, readHook, settleInput } from './helpers';

async function openOptions(page: Page): Promise<void> {
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'titleSelection')).toBe('Achievements');
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'titleSelection')).toBe('Skins');
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'titleSelection')).toBe('Options');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Settings');
  await settleInput(page);
}

async function selectRow(page: Page, row: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await readHook<string>(page, 'settingsSelection')) === row) {
      return;
    }

    await pressKey(page, 'ArrowDown');
  }

  await expect.poll(() => readHook<string>(page, 'settingsSelection')).toBe(row);
}

test('flash intensity cycles, persists, and always leaves a readable frame', async ({ page }) => {
  await bootToTitle(page);
  await openOptions(page);
  await selectRow(page, 'Flash Intensity');

  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<string>(page, 'flashIntensity')).toBe('reduced');
  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<string>(page, 'flashIntensity')).toBe('off');
  await pressKey(page, 'ArrowLeft');
  await expect.poll(() => readHook<string>(page, 'flashIntensity')).toBe('reduced');

  await page.reload();
  await page.waitForFunction(
    () => window.__MINES_TEST__?.ready === true && window.__MINES_TEST__?.scene === 'Title',
  );
  await settleInput(page);
  await openOptions(page);

  await expect.poll(() => readHook<string>(page, 'flashIntensity')).toBe('reduced');
});

test('rebinding jump and pause applies in the level and survives a reload', async ({ page }) => {
  await bootToTitle(page);
  await openOptions(page);
  await selectRow(page, 'Controls');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Controls');
  await expect.poll(() => readHook<string>(page, 'controlsSelection')).toBe('Move Left');

  await pressKey(page, 'ArrowDown');
  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'controlsSelection')).toBe('Jump');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string | null>(page, 'awaitingKey')).toBe('jump');
  await pressKey(page, 'v');
  await expect
    .poll(() => readHook<Record<string, string>>(page, 'keybinds'))
    .toMatchObject({
      jump: 'KeyV',
    });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await readHook<string>(page, 'controlsSelection')) === 'Pause') {
      break;
    }

    await pressKey(page, 'ArrowDown');
  }

  await expect.poll(() => readHook<string>(page, 'controlsSelection')).toBe('Pause');
  await pressKey(page, 'Enter');
  await pressKey(page, 'q');
  await expect
    .poll(() => readHook<Record<string, string>>(page, 'keybinds'))
    .toMatchObject({
      pause: 'KeyQ',
    });

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Settings');
  await page.waitForTimeout(150);
  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await readHook<string>(page, 'titleSelection')) === 'Start Run') {
      break;
    }

    await pressKey(page, 'ArrowDown');
  }

  await expect.poll(() => readHook<string>(page, 'titleSelection')).toBe('Start Run');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('RunSetup');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 8000 }).toBe('Level');
  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);

  const standingY = (await readHook<number>(page, 'playerY')) ?? 0;

  // The old default no longer jumps.
  await pressKey(page, 'Space');
  await page.waitForTimeout(160);
  expect(Math.abs(((await readHook<number>(page, 'playerY')) ?? 0) - standingY)).toBeLessThan(4);

  await page.keyboard.down('v');
  await expect.poll(() => readHook<number>(page, 'playerY')).toBeLessThan(standingY - 8);
  await page.keyboard.up('v');
  await expect.poll(() => readHook<boolean>(page, 'grounded'), { timeout: 8000 }).toBe(true);

  // The old pause default no longer pauses; the new binding does.
  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Level');
  await pressKey(page, 'q');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');

  // The bound pause key also resumes.
  await pressKey(page, 'q');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Level');

  await page.reload();
  await page.waitForFunction(
    () => window.__MINES_TEST__?.ready === true && window.__MINES_TEST__?.scene === 'Title',
  );
  await settleInput(page);
  await openOptions(page);
  await selectRow(page, 'Controls');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Controls');
  await expect
    .poll(() => readHook<Record<string, string>>(page, 'keybinds'))
    .toMatchObject({
      jump: 'KeyV',
      pause: 'KeyQ',
    });
});

test('fullscreen toggles from the options row', async ({ page }) => {
  await bootToTitle(page);
  await openOptions(page);
  await selectRow(page, 'Fullscreen');

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<boolean>(page, 'fullscreen')).toBe(true);

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<boolean>(page, 'fullscreen')).toBe(false);
});

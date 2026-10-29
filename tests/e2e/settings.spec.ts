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
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if ((await readHook<string>(page, 'settingsSelection')) === row) {
      return;
    }

    await pressKey(page, 'ArrowDown');
  }

  await expect.poll(() => readHook<string>(page, 'settingsSelection')).toBe(row);
}

test('options change and persist every audio setting', async ({ page }) => {
  await bootToTitle(page);
  await openOptions(page);

  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(0.9);
  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(1);

  await selectRow(page, 'Music Volume');
  await pressKey(page, 'ArrowLeft');
  await expect.poll(() => readHook<number>(page, 'musicVolume')).toBe(0.5);

  await selectRow(page, 'Sfx Volume');
  await pressKey(page, 'ArrowLeft');
  await expect.poll(() => readHook<number>(page, 'sfxVolume')).toBe(0.7);

  await selectRow(page, 'Mute');
  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<boolean>(page, 'muted')).toBe(true);

  await selectRow(page, 'Screen Shake');
  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<string>(page, 'screenShake')).toBe('reduced');

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');

  await page.reload();
  await page.waitForFunction(
    () => window.__MINES_TEST__?.ready === true && window.__MINES_TEST__?.scene === 'Title',
  );
  await settleInput(page);
  await openOptions(page);

  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'musicVolume')).toBe(0.5);
  await expect.poll(() => readHook<number>(page, 'sfxVolume')).toBe(0.7);
  await expect.poll(() => readHook<boolean>(page, 'muted')).toBe(true);
  await expect.poll(() => readHook<string>(page, 'screenShake')).toBe('reduced');
});

test('unmute brings the audio back without losing the other settings', async ({ page }) => {
  await bootToTitle(page);
  await openOptions(page);

  await selectRow(page, 'Mute');
  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<boolean>(page, 'muted')).toBe(true);
  await pressKey(page, 'ArrowLeft');
  await expect.poll(() => readHook<boolean>(page, 'muted')).toBe(false);

  await expect.poll(() => readHook<string>(page, 'message')).toBe('Audio on.');
});

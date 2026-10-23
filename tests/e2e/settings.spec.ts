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

test('title options change and persist volume and screen shake', async ({ page }) => {
  await bootToTitle(page);
  await openOptions(page);

  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(0.9);
  await pressKey(page, 'ArrowRight');
  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(1);

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'settingsSelection')).toBe('Screen Shake');
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
  await expect.poll(() => readHook<string>(page, 'screenShake')).toBe('reduced');
});

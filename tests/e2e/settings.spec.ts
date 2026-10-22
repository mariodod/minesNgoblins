import { expect, test, type Page } from '@playwright/test';
import { bootToTitle, readHook } from './helpers';

async function openOptions(page: Page): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press('ArrowDown');
  }

  await expect.poll(() => readHook<string>(page, 'titleSelection')).toBe('Options');
  await page.keyboard.press('Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Settings');
}

test('title options change and persist volume and screen shake', async ({ page }) => {
  await bootToTitle(page);
  await openOptions(page);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(1);

  await page.keyboard.press('ArrowDown');
  await expect.poll(() => readHook<string>(page, 'settingsSelection')).toBe('Screen Shake');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => readHook<string>(page, 'screenShake')).toBe('reduced');

  await page.keyboard.press('Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');

  await page.reload();
  await page.waitForFunction(() => window.__MINES_TEST__?.ready === true);
  await openOptions(page);

  await expect.poll(() => readHook<number>(page, 'masterVolume')).toBe(1);
  await expect.poll(() => readHook<string>(page, 'screenShake')).toBe('reduced');
});

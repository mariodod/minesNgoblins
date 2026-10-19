import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, startRun } from './helpers';

test('toggles the development debug overlay with F3', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);
  await expect.poll(() => readHook<boolean>(page, 'debug')).toBe(false);

  await page.keyboard.press('F3');
  await expect.poll(() => readHook<boolean>(page, 'debug')).toBe(true);

  await page.keyboard.press('F3');
  await expect.poll(() => readHook<boolean>(page, 'debug')).toBe(false);

  expect(errors).toEqual([]);
});

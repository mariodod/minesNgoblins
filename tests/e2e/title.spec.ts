import { expect, test } from '@playwright/test';
import { bootToTitle, collectPageErrors, pressKey } from './helpers';

test('boots to the title screen and supports keyboard navigation', async ({ page }) => {
  const errors = collectPageErrors(page);

  await bootToTitle(page);

  await expect(page.locator('canvas')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__MINES_TEST__?.titleSelection))
    .toBe('Start Run');

  await pressKey(page, 'ArrowDown');
  await expect
    .poll(() => page.evaluate(() => window.__MINES_TEST__?.titleSelection))
    .toBe('Achievements');

  await pressKey(page, 'Enter');
  await expect.poll(() => page.evaluate(() => window.__MINES_TEST__?.message)).toContain('M5');

  expect(errors).toEqual([]);
});

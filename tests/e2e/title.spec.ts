import { expect, test } from '@playwright/test';

test('boots to the title screen and supports keyboard navigation', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('/');
  await page.waitForFunction(() => window.__MINES_TEST__?.ready === true);

  await expect(page.locator('canvas')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__MINES_TEST__?.titleSelection))
    .toBe('Start Run');

  await page.keyboard.press('ArrowDown');
  await expect
    .poll(() => page.evaluate(() => window.__MINES_TEST__?.titleSelection))
    .toBe('Achievements');

  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__MINES_TEST__?.message)).toContain('M5');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

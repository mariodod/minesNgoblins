import { expect, test } from '@playwright/test';
import { bootToTitle, collectPageErrors, pressKey } from './helpers';

test('boots to the title screen and opens the achievements screen', async ({ page }) => {
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
  await expect.poll(() => page.evaluate(() => window.__MINES_TEST__?.scene)).toBe('Achievements');
  await expect.poll(() => page.evaluate(() => window.__MINES_TEST__?.achievementCount)).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.__MINES_TEST__?.message))
    .toContain('0/12 achievements');

  await pressKey(page, 'Escape');
  await expect.poll(() => page.evaluate(() => window.__MINES_TEST__?.scene)).toBe('Title');

  expect(errors).toEqual([]);
});

test('the credits screen lists the license inventory and returns to the title', async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await bootToTitle(page);

  for (let step = 0; step < 4; step += 1) {
    await pressKey(page, 'ArrowDown');
  }

  await expect
    .poll(() => page.evaluate(() => window.__MINES_TEST__?.titleSelection))
    .toBe('Credits');
  await pressKey(page, 'Enter');
  await expect.poll(() => page.evaluate(() => window.__MINES_TEST__?.scene)).toBe('Credits');
  await expect
    .poll(() => page.evaluate(() => window.__MINES_TEST__?.message))
    .toContain('original generated works');

  await pressKey(page, 'Escape');
  await expect.poll(() => page.evaluate(() => window.__MINES_TEST__?.scene)).toBe('Title');
  expect(errors).toEqual([]);
});

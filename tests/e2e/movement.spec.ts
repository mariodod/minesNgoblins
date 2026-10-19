import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, startRun } from './helpers';

test('starts a run, moves, jumps, and drops through a platform', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);

  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);

  const startX = (await readHook<number>(page, 'playerX')) ?? 0;
  const startY = (await readHook<number>(page, 'playerY')) ?? 0;

  await page.keyboard.down('ArrowRight');
  await expect.poll(() => readHook<number>(page, 'playerX')).toBeGreaterThan(startX + 20);

  await page.waitForFunction(() => (window.__MINES_TEST__?.playerX ?? 0) > 78);
  await page.keyboard.down('Space');
  await expect.poll(() => readHook<number>(page, 'playerY')).toBeLessThan(startY - 8);
  await page.waitForTimeout(160);
  await page.keyboard.up('Space');

  await page.waitForFunction(() => (window.__MINES_TEST__?.playerX ?? 0) > 130);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => readHook<number>(page, 'playerY')).toBeLessThan(260);
  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);

  const platformY = (await readHook<number>(page, 'playerY')) ?? 0;
  await page.keyboard.down('ArrowDown');
  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowDown');

  await expect.poll(() => readHook<number>(page, 'playerY')).toBeGreaterThan(platformY + 8);
  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);

  expect(errors).toEqual([]);
});

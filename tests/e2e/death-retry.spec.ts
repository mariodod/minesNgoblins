import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, startRun } from './helpers';

test('death restarts the level with full hearts', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);

  await page.keyboard.down('ArrowRight');
  await expect.poll(() => readHook<boolean>(page, 'dead'), { timeout: 12000 }).toBe(true);
  await page.keyboard.up('ArrowRight');

  await expect.poll(() => readHook<number>(page, 'playerX'), { timeout: 8000 }).toBeLessThan(100);
  await expect.poll(() => readHook<number>(page, 'hp')).toBe(5);
  await expect.poll(() => readHook<number>(page, 'dummyHp')).toBe(3);

  expect(errors).toEqual([]);
});

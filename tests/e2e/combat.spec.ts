import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, startRun } from './helpers';

test('throws rocks to damage and destroy a practice dummy', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);

  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window.__MINES_TEST__?.playerX ?? 0) > 190);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);
  await expect.poll(() => readHook<number>(page, 'dummyHp')).toBe(3);

  for (let throwIndex = 1; throwIndex <= 3; throwIndex += 1) {
    await page.keyboard.press('x');
    await expect.poll(() => readHook<number>(page, 'rocksThrown')).toBe(throwIndex);
    await expect.poll(() => readHook<number>(page, 'dummyHp')).toBe(3 - throwIndex);
    await page.waitForTimeout(450);
  }

  await expect.poll(() => readHook<number>(page, 'enemyCount')).toBe(1);
  expect(errors).toEqual([]);
});

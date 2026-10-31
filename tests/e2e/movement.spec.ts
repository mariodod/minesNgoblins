import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, settleInput, startRun } from './helpers';

test('starts a run, drops through a platform, moves, and jumps', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);
  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);

  // The player spawns on a one-way platform above the solid floor.
  const platformY = (await readHook<number>(page, 'playerY')) ?? 0;
  expect(platformY).toBeLessThan(268);

  // Aim down for a frame before jumping, so the drop-through sees both inputs
  // in the same physics step regardless of how the engine queues key events.
  await page.keyboard.down('ArrowDown');
  await settleInput(page);
  await page.keyboard.down('Space');
  await expect
    .poll(() => readHook<number>(page, 'playerY'), { timeout: 8000 })
    .toBeGreaterThan(platformY + 8);
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowDown');
  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);

  // Run right along the floor.
  const startX = (await readHook<number>(page, 'playerX')) ?? 0;
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => readHook<number>(page, 'playerX')).toBeGreaterThan(startX + 20);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => readHook<number>(page, 'playerY')).toBeGreaterThan(270);

  // Jump from the floor.
  const floorY = (await readHook<number>(page, 'playerY')) ?? 0;
  await page.keyboard.down('Space');
  await expect.poll(() => readHook<number>(page, 'playerY')).toBeLessThan(floorY - 8);
  await page.waitForTimeout(150);
  await page.keyboard.up('Space');
  await expect.poll(() => readHook<boolean>(page, 'grounded'), { timeout: 8000 }).toBe(true);

  expect(errors).toEqual([]);
});

test('held WASD movement survives a level transition', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page);
  await expect.poll(() => readHook<boolean>(page, 'grounded')).toBe(true);

  const startX = (await readHook<number>(page, 'playerX')) ?? 0;
  await page.keyboard.down('KeyD');
  await expect.poll(() => readHook<number>(page, 'playerX')).toBeGreaterThan(startX + 20);

  await page.keyboard.press('F4');
  await expect.poll(() => readHook<number>(page, 'levelNumber')).toBe(2);
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('goblin-tunnels');

  await expect.poll(() => readHook<number>(page, 'playerX'), { timeout: 8000 }).toBeGreaterThan(70);

  await page.keyboard.up('KeyD');

  expect(errors).toEqual([]);
});

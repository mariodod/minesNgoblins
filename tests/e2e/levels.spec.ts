import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, startRun } from './helpers';

const LEVELS = [
  { id: 'shaft-entrance', number: 1 },
  { id: 'goblin-tunnels', number: 2 },
  { id: 'crystal-caverns', number: 3 },
  { id: 'deep-vein', number: 4 },
] as const;

for (const level of LEVELS) {
  test(`${level.id} loads as level ${level.number} of 4`, async ({ page }) => {
    const errors = collectPageErrors(page);

    await startRun(page, `/?level=${level.id}`);

    await expect.poll(() => readHook<string>(page, 'levelId')).toBe(level.id);
    await expect.poll(() => readHook<number>(page, 'levelNumber')).toBe(level.number);
    await expect.poll(() => readHook<number>(page, 'levelCount')).toBe(4);
    await expect.poll(() => readHook<number>(page, 'runLevelIndex')).toBe(level.number - 1);
    await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);
    await expect.poll(() => readHook<number>(page, 'hp')).toBeGreaterThan(0);

    const exit = await readHook<{ x: number; y: number; width: number; height: number }>(
      page,
      'exit',
    );
    expect(exit?.width).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

test('riding the level exit advances the run to the next level', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page, '/?level=shaft-entrance&spawn=exit');
  await expect.poll(() => readHook<number>(page, 'playerX')).toBeGreaterThan(1200);

  await page.keyboard.press('E');
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('goblin-tunnels');
  await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(1);
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);

  expect(errors).toEqual([]);
});

test('the elevator stays locked on Crazy while enemies remain', async ({ page }) => {
  const errors = collectPageErrors(page);

  await startRun(page, '/?difficulty=crazy&level=shaft-entrance&spawn=exit');
  await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('crazy');
  await expect.poll(() => readHook<number>(page, 'enemyCount')).toBeGreaterThan(0);
  await expect.poll(() => readHook<number>(page, 'playerX')).toBeGreaterThan(1200);

  await page.keyboard.press('E');
  await page.waitForTimeout(500);

  expect(await readHook<string>(page, 'levelId')).toBe('shaft-entrance');
  expect(await readHook<number>(page, 'runLevelsCompleted')).toBe(0);
  expect(await readHook<boolean>(page, 'runActive')).toBe(true);

  expect(errors).toEqual([]);
});

test('debug skip advances the run through all four levels into the boss arena', async ({
  page,
}) => {
  const errors = collectPageErrors(page);

  await startRun(page, '/?level=shaft-entrance');
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('shaft-entrance');

  for (const level of LEVELS.slice(1)) {
    await page.keyboard.press('F4');
    await expect.poll(() => readHook<string>(page, 'levelId')).toBe(level.id);
    await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(level.number - 1);
    await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);
  }

  await page.keyboard.press('F4');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Boss');
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('great-worm');
  await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(4);
  await expect.poll(() => readHook<number>(page, 'runBossAttempts')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'bossMaxHp')).toBe(48);
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);

  expect(errors).toEqual([]);
});

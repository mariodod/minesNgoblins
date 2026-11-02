import { expect, test } from '@playwright/test';
import { collectPageErrors, pressKey, readHook, startRun } from './helpers';

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

for (const level of LEVELS) {
  test(`the elevator stays locked on Crazy in ${level.id} while enemies remain`, async ({
    page,
  }) => {
    const errors = collectPageErrors(page);

    await startRun(page, `/?difficulty=crazy&level=${level.id}&spawn=exit`);
    await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('crazy');
    await expect.poll(() => readHook<string>(page, 'levelId')).toBe(level.id);
    await expect.poll(() => readHook<number>(page, 'enemyCount')).toBeGreaterThan(0);

    const exit = await readHook<{ x: number; y: number; width: number; height: number }>(
      page,
      'exit',
    );
    await expect
      .poll(() => readHook<number>(page, 'playerX'))
      .toBeGreaterThanOrEqual(exit?.x ?? 0);

    await pressKey(page, 'E');
    await page.waitForTimeout(500);

    expect(await readHook<string>(page, 'levelId')).toBe(level.id);
    expect(await readHook<number>(page, 'runLevelsCompleted')).toBe(0);
    expect(await readHook<boolean>(page, 'runActive')).toBe(true);
    expect(await readHook<number>(page, 'crazyEnemiesRemaining')).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test(`clearing every enemy unlocks the Crazy exit in ${level.id}`, async ({ page }) => {
    const errors = collectPageErrors(page);

    await startRun(page, `/?difficulty=crazy&level=${level.id}&spawn=exit`);
    await expect.poll(() => readHook<number>(page, 'enemyCount')).toBeGreaterThan(0);

    const cleared = await page.evaluate(() => {
      const debug = window.__MINES_LEVEL_DEBUG__;
      if (!debug) {
        return false;
      }

      debug.defeatAllEnemies();
      return true;
    });

    expect(cleared).toBe(true);
    await expect.poll(() => readHook<number>(page, 'crazyEnemiesRemaining')).toBe(0);
    await expect.poll(() => readHook<number>(page, 'enemyCount')).toBe(0);

    await pressKey(page, 'E');

    const next = LEVELS.find((candidate) => candidate.number === level.number + 1);
    if (next) {
      await expect.poll(() => readHook<string>(page, 'levelId'), { timeout: 8000 }).toBe(next.id);
      await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(1);
    } else {
      await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 8000 }).toBe('Boss');
      await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(1);
      await expect.poll(() => readHook<number>(page, 'bossMaxHp')).toBe(120);
    }

    expect(errors).toEqual([]);
  });
}

test('debug skip advances through all four levels and preserves Hard into the boss', async ({
  page,
}) => {
  const errors = collectPageErrors(page);

  await startRun(page, '/?level=shaft-entrance&difficulty=hard');
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('shaft-entrance');
  await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('hard');

  for (const level of LEVELS.slice(1)) {
    await page.keyboard.press('F4');
    await expect.poll(() => readHook<string>(page, 'levelId')).toBe(level.id);
    await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(level.number - 1);
    await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);
  }

  await page.keyboard.press('F4');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Boss');
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('great-worm');
  await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('hard');
  await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(4);
  await expect.poll(() => readHook<number>(page, 'runBossAttempts')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'bossMaxHp')).toBe(72);
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);

  expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { collectPageErrors, readHook, startRun } from './helpers';

const CASES = [
  { id: 'hard', playerHp: 5, dummyHp: 6 },
  { id: 'impossible', playerHp: 4, dummyHp: 9 },
  { id: 'crazy', playerHp: 1, dummyHp: 15 },
] as const;

for (const difficulty of CASES) {
  test(`${difficulty.id} difficulty applies player and enemy HP scaling`, async ({ page }) => {
    const errors = collectPageErrors(page);

    await startRun(page, `/?difficulty=${difficulty.id}`);

    await expect.poll(() => readHook<number>(page, 'hp')).toBe(difficulty.playerHp);
    await expect.poll(() => readHook<number>(page, 'playerMaxHp')).toBe(difficulty.playerHp);
    await expect.poll(() => readHook<string>(page, 'difficulty')).toBe(difficulty.id);
    await expect.poll(() => readHook<number>(page, 'dummyHp')).toBe(difficulty.dummyHp);

    expect(errors).toEqual([]);
  });
}

test('an unknown difficulty query falls back to normal', async ({ page }) => {
  await startRun(page, '/?difficulty=nightmare');

  await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('normal');
  await expect.poll(() => readHook<number>(page, 'playerMaxHp')).toBe(5);
});

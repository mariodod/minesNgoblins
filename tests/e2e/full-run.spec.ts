import { expect, test, type Page } from '@playwright/test';
import { collectPageErrors, pressKey, readHook, startRun } from './helpers';

interface ChallengeHook {
  id: string;
  status: string;
}

const LEVEL_IDS = ['shaft-entrance', 'goblin-tunnels', 'crystal-caverns', 'deep-vein'] as const;

async function skipToBoss(page: Page): Promise<void> {
  for (let level = 1; level < LEVEL_IDS.length; level += 1) {
    await pressKey(page, 'F4');
    await expect
      .poll(() => readHook<string>(page, 'levelId'), { timeout: 10_000 })
      .toBe(LEVEL_IDS[level]);
    await expect
      .poll(() => readHook<number>(page, 'runLevelsCompleted'), { timeout: 8000 })
      .toBe(level);
  }

  await pressKey(page, 'F4');
  await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 10_000 }).toBe('Boss');
  await expect.poll(() => readHook<number>(page, 'runLevelsCompleted')).toBe(4);
}

async function finishAtResults(page: Page): Promise<void> {
  await page.evaluate(() => window.__MINES_DEBUG__?.defeatBoss());
  await expect.poll(() => readHook<boolean>(page, 'runCompleted')).toBe(true);
  await expect.poll(() => readHook<boolean>(page, 'bossExitOpen'), { timeout: 10_000 }).toBe(true);

  await pressKey(page, 'E');
  await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 8000 }).toBe('Results');
}

function statusOf(challenges: ChallengeHook[] | undefined, id: string): string | undefined {
  return challenges?.find((challenge) => challenge.id === id)?.status;
}

/**
 * Scripted complete-run evidence for the three challenge badges. Level
 * traversal and the boss kill use development hooks, but every run statistic,
 * badge rule, achievement, and Results line is produced by the shipping code
 * path. Rock-only boss timing is measured separately in `docs/m7-qa.md`.
 */
test('a scripted Normal run earns Pacifist, Primitive, Untouchable, and Legend', async ({
  page,
}) => {
  const errors = collectPageErrors(page);

  await startRun(page, '/');
  await expect.poll(() => readHook<number>(page, 'runKills')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'runDamageTaken')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'runItemUses')).toBe(0);

  await skipToBoss(page);
  await finishAtResults(page);

  await expect.poll(() => readHook<number>(page, 'runKills')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'runDamageTaken')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'runItemUses')).toBe(0);

  const challenges = await readHook<ChallengeHook[]>(page, 'challengeResults');
  expect(statusOf(challenges, 'pacifist')).toBe('complete');
  expect(statusOf(challenges, 'primitive')).toBe('complete');
  expect(statusOf(challenges, 'untouchable')).toBe('complete');
  expect(statusOf(challenges, 'legend')).toBe('complete');
  await expect.poll(() => readHook<number>(page, 'runBestTimeMs')).toBeGreaterThan(0);

  const achievements = await readHook<string[]>(page, 'achievementsUnlocked');
  expect(achievements).toEqual(expect.arrayContaining(['pacifist', 'primitive', 'untouchable']));

  expect(errors).toEqual([]);
});

test('a scripted Crazy run completes with the all-kill rules and badge exclusions', async ({
  page,
}) => {
  const errors = collectPageErrors(page);

  await startRun(page, '/?difficulty=crazy');
  await expect.poll(() => readHook<number>(page, 'playerMaxHp')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'crazyEnemiesRemaining')).toBeGreaterThan(0);

  await skipToBoss(page);
  await expect.poll(() => readHook<number>(page, 'bossMaxHp')).toBe(120);

  await finishAtResults(page);

  const challenges = await readHook<ChallengeHook[]>(page, 'challengeResults');
  expect(statusOf(challenges, 'pacifist')).toBe('unavailable');
  expect(statusOf(challenges, 'primitive')).toBe('complete');
  expect(statusOf(challenges, 'untouchable')).toBe('complete');
  expect(statusOf(challenges, 'legend')).toBe('unavailable');

  const achievements = await readHook<string[]>(page, 'achievementsUnlocked');
  expect(achievements).toContain('crazy_clear');
  expect(achievements).not.toContain('pacifist');

  expect(errors).toEqual([]);
});

// Hard and Impossible use the same exit rules as Normal, but they are the
// difficulties a player is most likely to abandon; complete each one so the
// "every difficulty is completable" claim has direct evidence.
for (const { id, playerMaxHp, bossMaxHp } of [
  { id: 'hard', playerMaxHp: 5, bossMaxHp: 72 },
  { id: 'impossible', playerMaxHp: 4, bossMaxHp: 96 },
] as const) {
  test(`a scripted ${id} run reaches Results`, async ({ page }) => {
    const errors = collectPageErrors(page);

    await startRun(page, `/?difficulty=${id}`);
    await expect.poll(() => readHook<number>(page, 'playerMaxHp')).toBe(playerMaxHp);
    await expect.poll(() => readHook<string>(page, 'difficulty')).toBe(id);

    await skipToBoss(page);
    await expect.poll(() => readHook<number>(page, 'bossMaxHp')).toBe(bossMaxHp);

    await finishAtResults(page);
    await expect.poll(() => readHook<boolean>(page, 'runCompleted')).toBe(true);

    expect(errors).toEqual([]);
  });
}

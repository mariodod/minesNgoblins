import { expect, test, type Page } from '@playwright/test';
import {
  bootToTitle,
  collectPageErrors,
  openRunSetup,
  pressKey,
  readHook,
  startRun,
} from './helpers';

interface ChallengeHook {
  id: string;
  status: string;
  reason: string | null;
}

async function startBoss(page: Page, path = '/?boss=1'): Promise<void> {
  await bootToTitle(page, path);
  await pressKey(page, 'Enter');
  await page.waitForFunction(() => window.__MINES_TEST__?.scene === 'Boss');
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);
}

async function finishBossAtResults(page: Page): Promise<void> {
  await page.evaluate(() => window.__MINES_DEBUG__?.defeatBoss());
  await expect.poll(() => readHook<boolean>(page, 'runCompleted')).toBe(true);
  await expect.poll(() => readHook<boolean>(page, 'bossExitOpen'), { timeout: 10_000 }).toBe(true);

  await pressKey(page, 'E');
  await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 8000 }).toBe('Results');
}

function challengeStatus(challenges: ChallengeHook[] | undefined, id: string): string | undefined {
  return challenges?.find((challenge) => challenge.id === id)?.status;
}

function challengeReason(
  challenges: ChallengeHook[] | undefined,
  id: string,
): string | null | undefined {
  return challenges?.find((challenge) => challenge.id === id)?.reason;
}

test('difficulty setup selects Crazy, shows the HUD counter, and summarizes badges', async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await openRunSetup(page);

  await expect.poll(() => readHook<string>(page, 'selectedDifficulty')).toBe('normal');
  await expect.poll(() => readHook<string>(page, 'difficultyWarning')).toBe('');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'selectedDifficulty')).toBe('hard');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'selectedDifficulty')).toBe('impossible');
  await expect
    .poll(() => readHook<string>(page, 'difficultyWarning'))
    .toBe('Four hearts. Two enemy hits kill.');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'selectedDifficulty')).toBe('crazy');
  await expect
    .poll(() => readHook<string>(page, 'difficultyWarning'))
    .toBe('Pacifist and Legend are unavailable on Crazy.');

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Level');
  await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('crazy');
  await expect.poll(() => readHook<number>(page, 'playerMaxHp')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'crazyEnemiesRemaining')).toBeGreaterThan(0);

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');
  await expect.poll(() => readHook<string>(page, 'challengeSummary')).toContain('PACIFIST N/A');
  await expect.poll(() => readHook<string>(page, 'challengeSummary')).toContain('PRIMITIVE OK');
  await expect.poll(() => readHook<string>(page, 'challengeSummary')).toContain('LEGEND N/A');

  expect(errors).toEqual([]);
});

test('the difficulty query preselects the setup card and warning', async ({ page }) => {
  const errors = collectPageErrors(page);
  await openRunSetup(page, '/?difficulty=impossible');

  await expect.poll(() => readHook<string>(page, 'selectedDifficulty')).toBe('impossible');
  await expect
    .poll(() => readHook<string>(page, 'difficultyWarning'))
    .toBe('Four hearts. Two enemy hits kill.');

  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Level');
  await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('impossible');
  await expect.poll(() => readHook<number>(page, 'playerMaxHp')).toBe(4);

  expect(errors).toEqual([]);
});

test('Results explains failed badges after taking damage in the boss fight', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);

  await page.evaluate(() => window.__MINES_DEBUG__?.damagePlayer(2));
  await expect.poll(() => readHook<number>(page, 'runBossDamageTaken')).toBe(2);
  await finishBossAtResults(page);

  const challenges = await readHook<ChallengeHook[]>(page, 'challengeResults');
  expect(challengeStatus(challenges, 'pacifist')).toBe('complete');
  expect(challengeStatus(challenges, 'primitive')).toBe('complete');
  expect(challengeStatus(challenges, 'untouchable')).toBe('failed');
  expect(challengeReason(challenges, 'untouchable')).toBe('Took 2 damage.');
  expect(challengeStatus(challenges, 'legend')).toBe('failed');
  expect(challengeReason(challenges, 'legend')).toBe('Missing Untouchable.');
  await expect
    .poll(() => readHook<string>(page, 'message'))
    .toBe('2/4 challenge badges completed.');
  await expect
    .poll(() => readHook<string[]>(page, 'achievementsUnlocked'))
    .toContain('worm_slayer');
  await expect
    .poll(() => readHook<string[]>(page, 'achievementsUnlocked'))
    .not.toContain('boss_flawless');
  await expect.poll(() => readHook<string[]>(page, 'skinsUnlocked')).not.toContain('gilded');

  expect(errors).toEqual([]);
});

for (const difficulty of ['normal', 'hard', 'impossible', 'crazy'] as const) {
  test(`a completed ${difficulty} run applies the challenge matrix`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await startBoss(page, `/?boss=1&difficulty=${difficulty}`);
    await finishBossAtResults(page);

    const challenges = await readHook<ChallengeHook[]>(page, 'challengeResults');

    if (difficulty === 'crazy') {
      expect(challengeStatus(challenges, 'pacifist')).toBe('unavailable');
      expect(challengeReason(challenges, 'pacifist')).toBe(
        'Unavailable on Crazy: every enemy must die.',
      );
      expect(challengeStatus(challenges, 'primitive')).toBe('complete');
      expect(challengeStatus(challenges, 'untouchable')).toBe('complete');
      expect(challengeStatus(challenges, 'legend')).toBe('unavailable');
      expect(challengeReason(challenges, 'legend')).toBe('Pacifist is unavailable on Crazy.');
    } else {
      expect(challengeStatus(challenges, 'pacifist')).toBe('complete');
      expect(challengeStatus(challenges, 'primitive')).toBe('complete');
      expect(challengeStatus(challenges, 'untouchable')).toBe('complete');
      expect(challengeStatus(challenges, 'legend')).toBe('complete');
      expect(challenges?.every((challenge) => challenge.reason === null)).toBe(true);
    }

    const achievements = await readHook<string[]>(page, 'achievementsUnlocked');
    if (difficulty === 'hard') {
      expect(achievements).toContain('hard_clear');
      await expect.poll(() => readHook<string[]>(page, 'skinsUnlocked')).toContain('iron');
    }
    if (difficulty === 'impossible') {
      expect(achievements).toContain('impossible_clear');
      await expect.poll(() => readHook<string[]>(page, 'skinsUnlocked')).toContain('obsidian');
    }
    if (difficulty === 'crazy') {
      expect(achievements).toContain('crazy_clear');
      expect(achievements).toContain('primitive');
      expect(achievements).not.toContain('pacifist');
      expect(achievements).not.toContain('legend');
      await expect.poll(() => readHook<string[]>(page, 'skinsUnlocked')).toContain('crimson');
    }

    expect(errors).toEqual([]);
  });
}

test('achievement toasts fire on first level completion', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startRun(page);

  await page.keyboard.press('F4');

  await expect
    .poll(() => readHook<string[]>(page, 'achievementToast'), { timeout: 8000 })
    .toContain('First Descent');
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('goblin-tunnels');

  expect(errors).toEqual([]);
});

test('achievements and equipped skins persist across reloads', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);
  await finishBossAtResults(page);

  await expect
    .poll(async () => (await readHook<string[]>(page, 'achievementsUnlocked'))?.length)
    .toBeGreaterThan(0);
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'titleSelection')).toBe('Achievements');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Achievements');
  await expect.poll(() => readHook<number>(page, 'achievementCount')).toBe(6);

  await pressKey(page, 'Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Title');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'titleSelection')).toBe('Skins');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Skins');
  await expect.poll(() => readHook<string>(page, 'skinName')).toBe('Delver');
  await expect.poll(() => readHook<string>(page, 'equippedSkin')).toBe('delver');

  await pressKey(page, 'ArrowDown');
  await expect.poll(() => readHook<string>(page, 'skinName')).toBe('Pale Wanderer');
  await expect.poll(() => readHook<boolean>(page, 'skinUnlocked')).toBe(true);
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'equippedSkin')).toBe('pale-wanderer');

  await bootToTitle(page);
  await pressKey(page, 'ArrowDown');
  await pressKey(page, 'ArrowDown');
  await pressKey(page, 'Enter');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Skins');
  await expect.poll(() => readHook<string>(page, 'equippedSkin')).toBe('pale-wanderer');

  expect(errors).toEqual([]);
});

test('a corrupt save is backed up and the title explains the recovery', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.addInitScript(() => {
    localStorage.setItem('minesNgoblins.save.v1', '{broken');
  });
  await bootToTitle(page);

  await expect.poll(() => readHook<string>(page, 'saveNotice')).toContain('Save data was damaged');
  await expect.poll(() => readHook<string>(page, 'message')).toContain('Save data was damaged');

  const backupCount = await page.evaluate(
    () =>
      Object.keys(localStorage).filter((key) => key.startsWith('minesNgoblins.save.backup.'))
        .length,
  );
  expect(backupCount).toBeGreaterThan(0);

  const recoveredVersion = await page.evaluate(() => {
    const raw = localStorage.getItem('minesNgoblins.save.v1');
    return raw ? (JSON.parse(raw) as { version?: number }).version : null;
  });
  expect(recoveredVersion).toBe(1);

  expect(errors).toEqual([]);
});

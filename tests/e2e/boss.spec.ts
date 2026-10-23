import { expect, test } from '@playwright/test';
import { bootToTitle, collectPageErrors, readHook } from './helpers';

async function startBoss(
  page: Parameters<typeof bootToTitle>[0],
  path = '/?boss=1',
): Promise<void> {
  await bootToTitle(page, path);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__MINES_TEST__?.scene === 'Boss');
}

test('debug boss shortcut boots the Normal arena with the designed HP', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);

  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Boss');
  await expect.poll(() => readHook<string>(page, 'levelId')).toBe('great-worm');
  await expect.poll(() => readHook<number>(page, 'bossMaxHp')).toBe(48);
  await expect.poll(() => readHook<number>(page, 'bossPhase')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'runBossAttempts')).toBe(1);
  await expect.poll(() => readHook<boolean>(page, 'runActive')).toBe(true);
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);

  expect(errors).toEqual([]);
});

test('boss HP follows the difficulty multiplier', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page, '/?boss=1&difficulty=crazy');

  await expect.poll(() => readHook<string>(page, 'difficulty')).toBe('crazy');
  await expect.poll(() => readHook<number>(page, 'bossMaxHp')).toBe(120);
  await expect.poll(() => readHook<number>(page, 'bossHp')).toBe(120);
  await expect.poll(() => readHook<number>(page, 'hp')).toBe(1);

  expect(errors).toEqual([]);
});

test('head hits damage the boss while body hits deflect', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);

  const bodyHit = await page.evaluate(() => window.__MINES_DEBUG__?.hitBoss('body', 1));
  expect(bodyHit).toBe(false);
  await expect.poll(() => readHook<number>(page, 'bossBodyHits')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'bossHp')).toBe(48);

  const headHit = await page.evaluate(() => window.__MINES_DEBUG__?.hitBoss('head', 1));
  expect(headHit).toBe(true);
  await expect.poll(() => readHook<number>(page, 'bossHeadHits')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'bossHp')).toBe(47);

  expect(errors).toEqual([]);
});

test('phase skips surface supplies and advance the attack pool', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);
  await expect.poll(() => readHook<string | null>(page, 'bossAttack')).not.toBeNull();

  await page.evaluate(() => window.__MINES_DEBUG__?.skipBossPhase());
  await expect.poll(() => readHook<number>(page, 'bossPhase')).toBe(2);
  await expect.poll(() => readHook<number>(page, 'bossHp')).toBe(28);
  await expect.poll(() => readHook<number>(page, 'bossSupplies')).toBe(2);

  await expect
    .poll(() => readHook<string>(page, 'bossState'), { timeout: 8000 })
    .not.toBe('transition');
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);

  await page.evaluate(() => window.__MINES_DEBUG__?.skipBossPhase());
  await expect.poll(() => readHook<number>(page, 'bossPhase')).toBe(3);
  await expect.poll(() => readHook<number>(page, 'bossHp')).toBe(12);
  await expect.poll(() => readHook<number>(page, 'bossSupplies')).toBe(4);

  expect(errors).toEqual([]);
});

test('phase supplies can be collected from their pedestals', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);

  await page.evaluate(() => window.__MINES_DEBUG__?.skipBossPhase());
  await expect.poll(() => readHook<number>(page, 'bossSupplies')).toBe(2);
  await expect
    .poll(() => readHook<string>(page, 'bossState'), { timeout: 8000 })
    .not.toBe('transition');

  await page.evaluate(() => window.__MINES_DEBUG__?.damagePlayer(2));
  await expect.poll(() => readHook<number>(page, 'hp')).toBe(3);

  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window.__MINES_TEST__?.playerX ?? 0) >= 120);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(80);
  await page.keyboard.press('E');

  await expect.poll(() => readHook<number>(page, 'bossSupplies')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'hp')).toBeGreaterThan(3);

  expect(errors).toEqual([]);
});

test('defeating the boss completes the run and reaches Results', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);

  await page.evaluate(() => window.__MINES_DEBUG__?.defeatBoss());
  await expect.poll(() => readHook<boolean>(page, 'runCompleted')).toBe(true);
  await expect.poll(() => readHook<boolean>(page, 'runBossDefeated')).toBe(true);
  await expect.poll(() => readHook<string | null>(page, 'runOutcome')).toBe('victory');
  await expect.poll(() => readHook<number>(page, 'runDurationMs')).toBeGreaterThan(0);
  await expect.poll(() => readHook<boolean>(page, 'bossExitOpen'), { timeout: 9000 }).toBe(true);

  await page.keyboard.press('E');
  await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 8000 }).toBe('Results');
  await expect.poll(() => readHook<boolean>(page, 'runCompleted')).toBe(true);
  await expect.poll(() => readHook<string>(page, 'message')).toContain('Great Worm');

  await page.keyboard.press('Enter');
  await expect.poll(() => readHook<string>(page, 'scene'), { timeout: 5000 }).toBe('Title');

  expect(errors).toEqual([]);
});

test('boss death retries the fight with clean hazards and the original carry', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);

  await page.evaluate(() => window.__MINES_DEBUG__?.defeatPlayer());
  await expect.poll(() => readHook<number>(page, 'runDeaths')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'runBossAttempts'), { timeout: 8000 }).toBe(2);

  await expect.poll(() => readHook<number>(page, 'hp')).toBe(5);
  await expect.poll(() => readHook<number>(page, 'bossHp')).toBe(48);
  await expect.poll(() => readHook<number>(page, 'bossPhase')).toBe(1);
  await expect.poll(() => readHook<number>(page, 'bossSupplies')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'bossWormlings')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'bossProjectiles')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'bossShockwaves')).toBe(0);
  await expect.poll(() => readHook<number>(page, 'bossFallingRocks')).toBe(0);

  expect(errors).toEqual([]);
});

test('boss pause menu resumes and can restart the fight', async ({ page }) => {
  const errors = collectPageErrors(page);
  await startBoss(page);
  await expect.poll(() => readHook<boolean>(page, 'bossVulnerable')).toBe(true);

  await page.keyboard.press('Escape');
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Pause');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Resume');

  await page.keyboard.press('ArrowDown');
  await expect.poll(() => readHook<string>(page, 'pauseSelection')).toBe('Restart Fight');
  await page.keyboard.press('Enter');

  await expect.poll(() => readHook<number>(page, 'runBossAttempts'), { timeout: 8000 }).toBe(2);
  await expect.poll(() => readHook<number>(page, 'bossHp')).toBe(48);
  await expect.poll(() => readHook<string>(page, 'scene')).toBe('Boss');

  expect(errors).toEqual([]);
});

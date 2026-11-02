import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

/**
 * Repeatable M7 visual checklist capture.
 *
 * Usage:
 *   node tools/qa/screenshots.mjs --url http://127.0.0.1:5173/
 *
 * Writes one PNG per screen per viewport into `artifacts/qa/<viewport>/`.
 * Development builds only: the flow uses `__MINES_TEST__` to wait for scenes
 * and `__MINES_DEBUG__` to finish the boss, so it never runs against
 * production and never needs a real playthrough.
 */

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const url = argument('url', 'http://127.0.0.1:5173/');
const viewports = ['1366x768', '1920x1080', '2560x1440'];
const outDir = argument('out', 'artifacts/qa');

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const written = [];

for (const viewport of viewports) {
  const [width, height] = viewport.split('x').map(Number);
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const dir = join(outDir, viewport);
  await mkdir(dir, { recursive: true });

  const waitForScene = (scene) =>
    page.waitForFunction((expected) => window.__MINES_TEST__?.scene === expected, scene, {
      timeout: 15_000,
    });
  const waitForHook = (predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 15_000 });
  // A restarted title scene publishes `scene: 'Title'` before its input and
  // menu are ready, so give the scene a couple of frames before pressing keys.
  // The menu selection is not reset on return (it keeps the last item), so it
  // is not a reliable readiness signal.
  const waitForTitle = async () => {
    await waitForScene('Title');
    await settleFrame();
    await page.waitForTimeout(200);
  };
  const selectTitle = async (label) => {
    for (let step = 0; step < 8; step += 1) {
      const current = await page.evaluate(() => window.__MINES_TEST__?.titleSelection);
      if (current === label) {
        return;
      }
      await press('ArrowDown');
    }
    throw new Error(`Could not select title item ${label}`);
  };
  const shot = async (name) => {
    await page.waitForTimeout(450);
    await page.screenshot({ path: join(dir, `${name}.png`) });
    written.push(`${viewport}/${name}.png`);
  };
  const settleFrame = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
  // Phaser 4.2 replays queued key events when keydown and keyup land in the
  // same frame, so every press is split across frames.
  const press = async (key) => {
    await page.keyboard.down(key);
    await settleFrame();
    await page.keyboard.up(key);
    await settleFrame();
    await page.waitForTimeout(80);
  };

  await page.goto(url, { waitUntil: 'load' });
  await waitForHook(() => window.__MINES_TEST__?.ready === true);
  await waitForTitle();
  await shot('01-title');

  await press('Enter');
  await waitForScene('RunSetup');
  // Wrap up from Normal to Crazy so the warning band and summary are captured.
  await press('ArrowUp');
  await waitForHook(() => window.__MINES_TEST__?.selectedDifficulty === 'crazy');
  await shot('02-run-setup-crazy');

  await press('Enter');
  await waitForScene('Level');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await shot('03-level-hud');

  await press('Escape');
  await waitForScene('Pause');
  await shot('04-pause');

  for (let index = 0; index < 3; index += 1) {
    await press('ArrowDown');
  }
  await press('Enter');
  await waitForHook(() => window.__MINES_TEST__?.pauseSelection === 'Confirm Quit');
  await shot('05-quit-confirm');
  await press('Enter');
  await waitForTitle();
  await shot('06-title-after-quit');

  // The quit → new-run path: start again from the same page.
  await press('Enter');
  await waitForScene('RunSetup');
  await press('Escape');
  await waitForTitle();

  await selectTitle('Options');
  await press('Enter');
  await waitForScene('Settings');
  await shot('07-options');
  await press('Escape');
  await waitForTitle();

  await selectTitle('Start Run');
  await press('Enter');
  await waitForScene('RunSetup');
  await press('Enter');
  await waitForScene('Level');

  const levelIds = ['shaft-entrance', 'goblin-tunnels', 'crystal-caverns', 'deep-vein'];
  for (let index = 0; index < levelIds.length; index += 1) {
    await press('F4');
    if (index < levelIds.length - 1) {
      await waitForHook(
        (expected) => window.__MINES_TEST__?.levelId === expected,
        levelIds[index + 1],
      );
      await waitForHook(
        (expected) => window.__MINES_TEST__?.runLevelsCompleted === expected,
        index + 1,
      );
      await settleFrame();
      await page.waitForTimeout(150);
    }
  }

  await waitForScene('Boss');
  await page.evaluate(() => window.__MINES_DEBUG__?.defeatBoss());
  await waitForHook(() => window.__MINES_TEST__?.bossExitOpen === true);
  await press('E');
  await waitForScene('Results');
  await shot('08-results');

  await context.close();
}

await browser.close();
console.log(written.join('\n'));

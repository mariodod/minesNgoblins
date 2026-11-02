import { chromium } from 'playwright';

/**
 * Repeatable M7 performance sample.
 *
 * Usage:
 *   node tools/qa/profile.mjs --url http://127.0.0.1:4173/minesNgoblins/ --viewport 1920x1080
 *   node tools/qa/profile.mjs --url http://127.0.0.1:5173/?boss=1 --viewport 2560x1440 --target boss
 *
 * The production build has no test hooks, so the title/run flow is driven with
 * timed key presses. The development build waits for the scene hook instead.
 */

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const url = argument('url', 'http://127.0.0.1:4173/minesNgoblins/');
const viewport = argument('viewport', '1920x1080');
const target = argument('target', 'level');
const headed = process.argv.includes('--headed');
const [width, height] = viewport.split('x').map(Number);
const settleMs = 1200;

const browser = await chromium.launch({
  headless: !headed,
  args: ['--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const navigationStart = Date.now();
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('canvas', { state: 'visible' });
const canvasReadyMs = Date.now() - navigationStart;

const wait = (ms) => page.waitForTimeout(ms);
const waitForScene = async (scene) => {
  await page.waitForFunction(
    (expected) => window.__MINES_TEST__?.scene === expected,
    scene,
    { timeout: 15_000 },
  );
};

await wait(settleMs);

if (target === 'boss') {
  await page.keyboard.press('Enter');
  if (await page.evaluate(() => Boolean(window.__MINES_TEST__))) {
    await waitForScene('Boss');
  } else {
    await wait(1200);
  }
} else {
  await page.keyboard.press('Enter');
  if (await page.evaluate(() => Boolean(window.__MINES_TEST__))) {
    await waitForScene('RunSetup');
  } else {
    await wait(300);
  }

  await page.keyboard.press('Enter');
  if (await page.evaluate(() => Boolean(window.__MINES_TEST__))) {
    await waitForScene('Level');
  } else {
    await wait(900);
  }
}

await wait(settleMs);
await page.keyboard.down('ArrowRight');

const sample = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const frames = [];
      const start = performance.now();
      let previous = start;

      const tick = (now) => {
        frames.push(now - previous);
        previous = now;

        if (now - start < 5000) {
          requestAnimationFrame(tick);
          return;
        }

        const sorted = [...frames].sort((a, b) => a - b);
        const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
        const memory = performance.memory;

        resolve({
          frames: frames.length,
          fps: Number(((frames.length / (now - start)) * 1000).toFixed(2)),
          p50: Number((percentile(0.5) ?? 0).toFixed(2)),
          p95: Number((percentile(0.95) ?? 0).toFixed(2)),
          heapMb: memory ? Number((memory.usedJSHeapSize / 1024 / 1024).toFixed(1)) : null,
        });
      };

      requestAnimationFrame(tick);
    }),
);

await page.keyboard.up('ArrowRight');

const navigation = await page.evaluate(() => {
  const entry = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByName('first-contentful-paint')[0];

  return {
    domContentLoadedMs: entry ? Math.round(entry.domContentLoadedEventEnd) : null,
    loadMs: entry ? Math.round(entry.loadEventEnd) : null,
    firstContentfulPaintMs: paint ? Math.round(paint.startTime) : null,
  };
});

console.log(
  JSON.stringify(
    {
      target,
      viewport: `${width}x${height}`,
      url,
      mode: url.includes(':5173') ? 'development' : 'production',
      renderer: headed ? 'hardware (headed)' : 'software (headless)',
      canvasReadyMs,
      navigation,
      sample,
    },
    null,
    2,
  ),
);

await browser.close();

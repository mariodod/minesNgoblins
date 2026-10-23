import type { Page } from '@playwright/test';

/**
 * Waits two animation frames so Phaser has processed the current input queue
 * before the test sends another event.
 */
export async function settleInput(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export async function bootToTitle(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(
    () => window.__MINES_TEST__?.ready === true && window.__MINES_TEST__?.scene === 'Title',
  );
  await settleInput(page);
}

/**
 * Sends a key with its keyup in a later frame. Phaser 4.2's keyboard plugin
 * replays queued events if a keydown and keyup arrive in the same frame, which
 * makes rapid menu navigation order-dependent in automation.
 */
export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.down(key);
  await settleInput(page);
  await page.keyboard.up(key);
  await settleInput(page);
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  return errors;
}

export async function startRun(page: Page, path = '/'): Promise<void> {
  await bootToTitle(page, path);
  await pressKey(page, 'Enter');
  await page.waitForFunction(() => window.__MINES_TEST__?.scene === 'Level');
  await settleInput(page);
}

export function readHook<T>(page: Page, key: string): Promise<T | undefined> {
  return page.evaluate(
    (hookKey) => (window.__MINES_TEST__ as unknown as Record<string, unknown>)[hookKey] as T,
    key,
  );
}

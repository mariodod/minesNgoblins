import type { Page } from '@playwright/test';

export async function bootToTitle(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__MINES_TEST__?.ready === true);
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

export async function startRun(page: Page): Promise<void> {
  await bootToTitle(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__MINES_TEST__?.scene === 'Level');
}

export function readHook<T>(page: Page, key: string): Promise<T | undefined> {
  return page.evaluate(
    (hookKey) => (window.__MINES_TEST__ as unknown as Record<string, unknown>)[hookKey] as T,
    key,
  );
}

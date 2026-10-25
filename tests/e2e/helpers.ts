import type { Page } from '@playwright/test';
import { isDifficultyId, type DifficultyId } from '../../src/data/difficulties';

const DIFFICULTY_ORDER: readonly DifficultyId[] = ['normal', 'hard', 'impossible', 'crazy'];

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

export async function openRunSetup(page: Page, path = '/'): Promise<void> {
  await bootToTitle(page, path);
  await pressKey(page, 'Enter');
  await page.waitForFunction(() => window.__MINES_TEST__?.scene === 'RunSetup');
  await settleInput(page);
}

export async function selectDifficulty(page: Page, id: DifficultyId): Promise<void> {
  const current = await page.evaluate(
    () => window.__MINES_TEST__?.selectedDifficulty as DifficultyId | undefined,
  );
  const currentIndex = current ? DIFFICULTY_ORDER.indexOf(current) : 0;
  const targetIndex = DIFFICULTY_ORDER.indexOf(id);
  const steps = (targetIndex - currentIndex + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length;

  for (let step = 0; step < steps; step += 1) {
    await pressKey(page, 'ArrowDown');
  }

  await page.waitForFunction(
    (difficulty) => window.__MINES_TEST__?.selectedDifficulty === difficulty,
    id,
  );
}

/**
 * Enters a run through the difficulty selector unless a development shortcut
 * starts the level directly from Title.
 */
export async function startRun(page: Page, path = '/', difficultyId?: DifficultyId): Promise<void> {
  await bootToTitle(page, path);

  const params = new URL(page.url()).searchParams;
  const debugBypass = params.get('spawn') === 'exit' || params.get('boss') === '1';
  const requested = difficultyId ?? params.get('difficulty');
  const target = requested && isDifficultyId(requested) ? requested : 'normal';

  await pressKey(page, 'Enter');

  if (!debugBypass) {
    await page.waitForFunction(() => window.__MINES_TEST__?.scene === 'RunSetup');
    await selectDifficulty(page, target);
    await pressKey(page, 'Enter');
  }

  await page.waitForFunction(() => window.__MINES_TEST__?.scene === 'Level');
  await settleInput(page);
}

export function readHook<T>(page: Page, key: string): Promise<T | undefined> {
  return page.evaluate(
    (hookKey) => (window.__MINES_TEST__ as unknown as Record<string, unknown>)[hookKey] as T,
    key,
  );
}

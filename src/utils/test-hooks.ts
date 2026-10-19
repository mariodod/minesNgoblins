import type { MinesTestHook } from '../types/test-hooks';

/**
 * Exposes a tiny, read-only state snapshot for Playwright smoke tests.
 * This never exists in production builds.
 */
export function setTestHook(patch: Partial<MinesTestHook>): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const current = window.__MINES_TEST__ ?? {
    ready: false,
    scene: 'Boot',
    version: __APP_VERSION__,
  };

  window.__MINES_TEST__ = { ...current, ...patch };
}

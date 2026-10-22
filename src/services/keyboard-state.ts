/**
 * Browser-level keyboard state used to restore held movement keys when a new
 * scene creates its InputService during a level transition or retry.
 */
const pressedCodes = new Set<string>();
let installed = false;

export function installKeyboardState(): void {
  if (installed || typeof window === 'undefined') {
    return;
  }

  installed = true;

  window.addEventListener('keydown', (event) => {
    pressedCodes.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    pressedCodes.delete(event.code);
  });

  window.addEventListener('blur', () => {
    pressedCodes.clear();
  });
}

export function isPhysicalKeyDown(...codes: string[]): boolean {
  return codes.some((code) => pressedCodes.has(code));
}

export type KeybindAction =
  'moveLeft' | 'moveRight' | 'jump' | 'throwStone' | 'useItem' | 'interact' | 'pause';

export interface KeybindSettings {
  moveLeft: string;
  moveRight: string;
  jump: string;
  throwStone: string;
  useItem: string;
  interact: string;
  pause: string;
}

export interface KeybindRow {
  id: KeybindAction;
  label: string;
}

/**
 * Bindings are stored as `KeyboardEvent.code` values so the physical key
 * position survives keyboard layouts. Older saves used short names such as
 * `SPACE`; `normalizeKeybind` upgrades those in place.
 */
export const DEFAULT_KEYBINDS: KeybindSettings = {
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  jump: 'Space',
  throwStone: 'KeyX',
  useItem: 'KeyC',
  interact: 'KeyE',
  pause: 'Escape',
};

export const KEYBIND_ROWS: readonly KeybindRow[] = [
  { id: 'moveLeft', label: 'Move Left' },
  { id: 'moveRight', label: 'Move Right' },
  { id: 'jump', label: 'Jump' },
  { id: 'throwStone', label: 'Throw Stone' },
  { id: 'useItem', label: 'Use Item' },
  { id: 'interact', label: 'Interact' },
  { id: 'pause', label: 'Pause' },
];

const LEGACY_NAMES: Record<string, string> = {
  A: 'KeyA',
  B: 'KeyB',
  C: 'KeyC',
  D: 'KeyD',
  E: 'KeyE',
  F: 'KeyF',
  G: 'KeyG',
  H: 'KeyH',
  I: 'KeyI',
  J: 'KeyJ',
  K: 'KeyK',
  L: 'KeyL',
  M: 'KeyM',
  N: 'KeyN',
  O: 'KeyO',
  P: 'KeyP',
  Q: 'KeyQ',
  R: 'KeyR',
  S: 'KeyS',
  T: 'KeyT',
  U: 'KeyU',
  V: 'KeyV',
  W: 'KeyW',
  X: 'KeyX',
  Y: 'KeyY',
  Z: 'KeyZ',
  '0': 'Digit0',
  '1': 'Digit1',
  '2': 'Digit2',
  '3': 'Digit3',
  '4': 'Digit4',
  '5': 'Digit5',
  '6': 'Digit6',
  '7': 'Digit7',
  '8': 'Digit8',
  '9': 'Digit9',
  SPACE: 'Space',
  ESC: 'Escape',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  SHIFT: 'ShiftLeft',
  CTRL: 'ControlLeft',
  CONTROL: 'ControlLeft',
  ALT: 'AltLeft',
};

const BINDABLE_CODE =
  /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Space|Escape|Enter|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash)$/;

const CODE_LABELS: Record<string, string> = {
  Space: 'SPACE',
  Escape: 'ESC',
  Enter: 'ENTER',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  ShiftLeft: 'L-SHIFT',
  ShiftRight: 'R-SHIFT',
  ControlLeft: 'L-CTRL',
  ControlRight: 'R-CTRL',
  AltLeft: 'L-ALT',
  AltRight: 'R-ALT',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
};

export function isBindableKeyCode(code: string): boolean {
  return BINDABLE_CODE.test(code);
}

export function normalizeKeybind(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const upgraded = LEGACY_NAMES[value] ?? LEGACY_NAMES[value.toUpperCase()] ?? value;
  return isBindableKeyCode(upgraded) ? upgraded : fallback;
}

export function keybindLabel(code: string): string {
  if (code.startsWith('Key')) {
    return code.slice(3);
  }

  if (code.startsWith('Digit')) {
    return code.slice(5);
  }

  if (code.startsWith('Numpad')) {
    return `NUM ${code.slice(6)}`;
  }

  return CODE_LABELS[code] ?? code.toUpperCase();
}

export function parseKeybinds(value: unknown): KeybindSettings {
  const record = isRecord(value) ? value : {};
  const parsed = {} as KeybindSettings;

  for (const row of KEYBIND_ROWS) {
    parsed[row.id] = normalizeKeybind(record[row.id], DEFAULT_KEYBINDS[row.id]);
  }

  // A hand-edited save can bind one key to two actions. Keep the first use and
  // restore later duplicates to their default so gameplay stays deterministic.
  const used = new Set<string>();

  for (const row of KEYBIND_ROWS) {
    let code = parsed[row.id];

    if (used.has(code)) {
      const fallback = DEFAULT_KEYBINDS[row.id];
      code = used.has(fallback) ? code : fallback;
    }

    parsed[row.id] = code;
    used.add(code);
  }

  return parsed;
}

export function findKeybindConflict(
  keybinds: KeybindSettings,
  action: KeybindAction,
  code: string,
): KeybindRow | undefined {
  return KEYBIND_ROWS.find((row) => row.id !== action && keybinds[row.id] === code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

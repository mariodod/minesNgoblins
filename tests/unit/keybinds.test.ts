import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEYBINDS,
  findKeybindConflict,
  isBindableKeyCode,
  keybindLabel,
  normalizeKeybind,
  parseKeybinds,
} from '../../src/services/keybinds';

describe('keybind helpers', () => {
  it('upgrades legacy names to physical key codes', () => {
    expect(normalizeKeybind('SPACE', 'KeyA')).toBe('Space');
    expect(normalizeKeybind('X', 'KeyA')).toBe('KeyX');
    expect(normalizeKeybind('ESC', 'KeyA')).toBe('Escape');
    expect(normalizeKeybind('RIGHT', 'KeyA')).toBe('ArrowRight');
    expect(normalizeKeybind('8', 'KeyA')).toBe('Digit8');
  });

  it('rejects unknown and reserved values', () => {
    expect(normalizeKeybind('F5', 'KeyA')).toBe('KeyA');
    expect(normalizeKeybind(42, 'KeyA')).toBe('KeyA');
    expect(isBindableKeyCode('F5')).toBe(false);
    expect(isBindableKeyCode('Tab')).toBe(false);
    expect(isBindableKeyCode('KeyV')).toBe(true);
  });

  it('labels codes for the interface', () => {
    expect(keybindLabel('KeyV')).toBe('V');
    expect(keybindLabel('Digit3')).toBe('3');
    expect(keybindLabel('Space')).toBe('SPACE');
    expect(keybindLabel('ArrowLeft')).toBe('LEFT');
    expect(keybindLabel('Escape')).toBe('ESC');
  });

  it('finds a conflicting action', () => {
    expect(findKeybindConflict(DEFAULT_KEYBINDS, 'jump', 'KeyA')?.id).toBe('moveLeft');
    expect(findKeybindConflict(DEFAULT_KEYBINDS, 'jump', 'KeyV')).toBeUndefined();
    expect(findKeybindConflict(DEFAULT_KEYBINDS, 'moveLeft', 'KeyA')).toBeUndefined();
  });

  it('keeps every parsed binding unique', () => {
    const parsed = parseKeybinds({ jump: 'KeyA', moveLeft: 'KeyA', pause: 'KeyA' });
    expect(new Set(Object.values(parsed)).size).toBe(7);
    expect(parsed.moveLeft).toBe('KeyA');
    expect(parsed.jump).toBe(DEFAULT_KEYBINDS.jump);
    expect(parsed.pause).toBe(DEFAULT_KEYBINDS.pause);
  });
});

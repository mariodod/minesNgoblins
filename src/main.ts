import './style.css';
import { createGame } from './game';
import { installKeyboardState } from './services/keyboard-state';

installKeyboardState();
const game = createGame();
const canvas = game.canvas;

canvas.setAttribute(
  'aria-label',
  'Mines and Goblins game canvas. Use arrow keys and Enter, or WASD and Space.',
);
canvas.setAttribute('role', 'application');
canvas.setAttribute('tabindex', '0');
canvas.focus();

document.querySelector('#boot-note')?.remove();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}

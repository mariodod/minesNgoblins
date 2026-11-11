import './style.css';
import { createGame } from './game';
import { installKeyboardState } from './services/keyboard-state';

installKeyboardState();
const game = createGame();
const canvas = game.canvas;

canvas.setAttribute(
  'aria-label',
  'Mines and Goblins game canvas. Move with A and D or the arrow keys, jump with Space, throw with X, and press Escape to pause.',
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

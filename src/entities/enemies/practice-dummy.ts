import type Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { Enemy } from './enemy';

/**
 * Harmless, immobile target kept in the test level for movement/combat drills.
 */
export class PracticeDummy extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, ENEMIES['practice-dummy'], hp);
  }
}

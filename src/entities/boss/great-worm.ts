import Phaser from 'phaser';
import { BOSS_DEFINITION, resolveBossPhase, type BossPart, type BossPhase } from '../../data/boss';
import { applyDamage } from '../../systems/damage';

export interface BossDamageResult {
  applied: boolean;
  killed: boolean;
  hp: number;
  phase: BossPhase;
  phaseChanged: boolean;
}

/**
 * The Great Worm's presentation and weak-point model. Attack choreography lives
 * in BossScene; this entity owns HP, phase state, the head hitbox, and the
 * segmented body that follows the head.
 */
export class GreatWorm {
  readonly maxHp: number;
  hp: number;
  phase: BossPhase = 1;
  facing: -1 | 1 = 1;
  isVulnerable = false;
  isDead = false;
  visible = false;

  readonly head: Phaser.Physics.Arcade.Sprite;
  readonly segments: Phaser.Physics.Arcade.Image[] = [];
  readonly group: Phaser.GameObjects.Group;

  private readonly weakSpot: Phaser.GameObjects.Arc;
  private readonly weakSpotGlow: Phaser.GameObjects.Arc;
  private readonly trail: Array<{ x: number; y: number }> = [];
  private anchor = { x: 0, y: 0 };
  private collapsing = false;
  private flashUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    group: Phaser.GameObjects.Group,
    hp: number,
  ) {
    this.group = group;
    this.maxHp = Math.max(1, hp);
    this.hp = this.maxHp;

    this.head = scene.physics.add.sprite(0, 0, 'worm-head');
    this.head.setDepth(15);
    this.head.setData('bossPart', 'head');
    this.configureBody(this.head);
    group.add(this.head);

    for (let index = 0; index < BOSS_DEFINITION.segmentCount; index += 1) {
      const segment = scene.physics.add.image(0, 0, 'worm-segment');
      segment.setDepth(14);
      segment.setData('bossPart', 'body');
      this.configureBody(segment);
      segment.setVisible(false);
      this.segments.push(segment);
      group.add(segment);
    }

    this.weakSpotGlow = scene.add.circle(0, 0, 8, 0xffc857, 0.22).setDepth(16).setVisible(false);
    this.weakSpot = scene.add
      .circle(0, 0, 4, 0xffd166, 0.95)
      .setStrokeStyle(1, 0xfff2b8, 1)
      .setDepth(17)
      .setVisible(false);

    scene.tweens.add({
      targets: [this.weakSpot, this.weakSpotGlow],
      scale: { from: 0.8, to: 1.25 },
      alpha: { from: 0.65, to: 1 },
      duration: 420,
      yoyo: true,
      repeat: -1,
    });

    this.setBodiesEnabled(false);
    this.head.setVisible(false);
    this.head.setActive(true);
  }

  get x(): number {
    return this.head.x;
  }

  get y(): number {
    return this.head.y;
  }

  get headBounds(): { x: number; y: number; width: number; height: number } {
    const body = this.head.body as Phaser.Physics.Arcade.Body;
    return { x: body.x, y: body.y, width: body.width, height: body.height };
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.head.setVisible(visible);
    this.setBodiesEnabled(visible);
    this.weakSpot.setVisible(visible && this.isVulnerable);
    this.weakSpotGlow.setVisible(visible && this.isVulnerable);

    for (const segment of this.segments) {
      segment.setVisible(visible);
    }
  }

  setVulnerable(vulnerable: boolean): void {
    this.isVulnerable = vulnerable && !this.isDead;
    const showWeakSpot = this.visible && this.isVulnerable;
    this.weakSpot.setVisible(showWeakSpot);
    this.weakSpotGlow.setVisible(showWeakSpot);
  }

  setFacing(direction: number): void {
    this.facing = direction >= 0 ? 1 : -1;
    this.head.setFlipX(this.facing < 0);
  }

  setPhase(phase: BossPhase): void {
    this.phase = phase;
  }

  surfaceAt(x: number, y: number, facing: number, anchorX: number, anchorY: number): void {
    this.head.setPosition(x, y);
    this.anchor = { x: anchorX, y: anchorY };
    this.trail.length = 0;
    this.trail.push({ x: x - (facing >= 0 ? 7 : -7), y: y + 8 });
    this.setFacing(facing);
    this.setVisible(true);
    this.syncBodies();
  }

  burrow(): void {
    this.setVisible(false);
    this.setVulnerable(false);
    this.trail.length = 0;
  }

  /**
   * Applies damage only when the hit lands on the head. Body hits always
   * return applied:false and are handled as deflections by the scene.
   */
  takeDamage(part: BossPart, amount: number, now: number): BossDamageResult {
    if (part !== 'head' || !this.isVulnerable || this.isDead) {
      return {
        applied: false,
        killed: false,
        hp: this.hp,
        phase: this.phase,
        phaseChanged: false,
      };
    }

    const previousPhase = this.phase;
    const result = applyDamage(this.hp, amount);

    if (!result.applied) {
      return {
        applied: false,
        killed: false,
        hp: this.hp,
        phase: this.phase,
        phaseChanged: false,
      };
    }

    this.hp = result.hp;
    this.phase = resolveBossPhase(this.hp, this.maxHp);
    this.flashHit(now);

    if (result.lethal) {
      this.isDead = true;
      this.setVulnerable(false);
    }

    return {
      applied: true,
      killed: result.lethal,
      hp: this.hp,
      phase: this.phase,
      phaseChanged: this.phase > previousPhase,
    };
  }

  update(time: number): void {
    if (this.flashUntil > 0 && time >= this.flashUntil) {
      this.flashUntil = 0;
      this.head.clearTint();
      this.segments.forEach((segment) => segment.clearTint());
    }

    if (!this.visible) {
      return;
    }

    if (!this.collapsing) {
      this.updateTrail();
      this.layoutBody(time);
    }

    this.weakSpot.setPosition(this.head.x + this.facing * 8, this.head.y - 3);
    this.weakSpotGlow.setPosition(this.weakSpot.x, this.weakSpot.y);
    this.syncBodies();
  }

  collapse(onComplete: () => void): void {
    this.collapsing = true;
    this.setVulnerable(false);
    this.setBodiesEnabled(false);
    this.weakSpot.setVisible(false);
    this.weakSpotGlow.setVisible(false);
    this.scene.tweens.killTweensOf([this.weakSpot, this.weakSpotGlow]);

    this.scene.tweens.add({
      targets: this.head,
      y: this.head.y + 34,
      angle: this.facing * 18,
      alpha: 0.25,
      duration: 1800,
      ease: 'Quad.In',
    });

    this.segments.forEach((segment, index) => {
      this.scene.tweens.add({
        targets: segment,
        y: segment.y + 14 + index * 3,
        angle: (index % 2 === 0 ? -1 : 1) * (8 + index * 3),
        alpha: 0.18,
        duration: 1500 + index * 70,
        ease: 'Quad.In',
      });
    });

    this.scene.time.delayedCall(1900, onComplete);
  }

  destroy(): void {
    this.head.destroy();
    this.segments.forEach((segment) => segment.destroy());
    this.weakSpot.destroy();
    this.weakSpotGlow.destroy();
  }

  private configureBody(object: Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image): void {
    const body = object.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false;
    body.enable = false;
    object.setCollideWorldBounds(false);
  }

  private setBodiesEnabled(enabled: boolean): void {
    (this.head.body as Phaser.Physics.Arcade.Body).enable = enabled;
    this.segments.forEach((segment) => {
      (segment.body as Phaser.Physics.Arcade.Body).enable = enabled;
    });
  }

  private syncBodies(): void {
    this.head.body?.updateFromGameObject();
    this.segments.forEach((segment) => segment.body?.updateFromGameObject());
  }

  private updateTrail(): void {
    const newest = this.trail[0];
    const headPoint = { x: this.head.x, y: this.head.y };

    if (!newest || Phaser.Math.Distance.Between(newest.x, newest.y, headPoint.x, headPoint.y) > 4) {
      this.trail.unshift(headPoint);

      if (this.trail.length > 56) {
        this.trail.pop();
      }
    }
  }

  private layoutBody(time: number): void {
    const points: Array<{ x: number; y: number }> = [
      { x: this.head.x, y: this.head.y },
      ...this.trail,
      this.anchor,
    ];

    for (let index = 0; index < this.segments.length; index += 1) {
      const distance = 18 + index * BOSS_DEFINITION.segmentSpacing;
      const sample = samplePolyline(points, distance);

      if (!sample) {
        this.segments[index]?.setVisible(false);
        continue;
      }

      const segment = this.segments[index];

      if (!segment) {
        continue;
      }

      const perpendicular = { x: Math.sin(sample.angle), y: -Math.cos(sample.angle) };
      const slither = Math.sin(time * 0.008 - index * 0.75) * 1.5;
      const x = sample.x + perpendicular.x * slither;
      const y = sample.y + perpendicular.y * slither;

      segment.setPosition(x, y);
      segment.setRotation(sample.angle);
      segment.setVisible(true);
      segment.setAlpha(Math.max(0.55, 1 - index * 0.045));
    }
  }

  private flashHit(now: number): void {
    this.head.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.segments.forEach((segment) => segment.setTint(0xffb3b3));
    this.flashUntil = now + 80;
  }
}

function samplePolyline(
  points: ReadonlyArray<{ x: number; y: number }>,
  targetDistance: number,
): { x: number; y: number; angle: number } | null {
  let travelled = 0;

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];

    if (!from || !to) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);

    if (distance <= 0.001) {
      continue;
    }

    if (travelled + distance >= targetDistance) {
      const ratio = (targetDistance - travelled) / distance;
      return {
        x: Phaser.Math.Linear(from.x, to.x, ratio),
        y: Phaser.Math.Linear(from.y, to.y, ratio),
        angle: Math.atan2(to.y - from.y, to.x - from.x),
      };
    }

    travelled += distance;
  }

  return null;
}

import Phaser from 'phaser';

export const PIXEL_FONT_KEY = 'pixel-5x7';

const FONT_HEIGHT = 7;
const FONT_SCALE_STEP = 8;
const MAX_FONT_SCALE = 4;

interface PixelTextStyle extends Phaser.Types.GameObjects.Text.TextStyle {
  padding?: { x?: number; y?: number };
}

function parseFontSize(size: string | number | undefined): number {
  if (typeof size === 'number') {
    return size;
  }

  const parsed = Number.parseInt(size ?? '8', 10);
  return Number.isFinite(parsed) ? parsed : 8;
}

/**
 * Quantize the old CSS sizes onto whole bitmap-font multiples. Fractional
 * scaling is what makes pixel text soft, so every size becomes 7, 14, 21 or 28.
 */
function quantizeFontSize(size: number): number {
  const scale = Math.max(1, Math.min(MAX_FONT_SCALE, Math.round(size / FONT_SCALE_STEP)));
  return FONT_HEIGHT * scale;
}

function parseCssColor(value: string | undefined): { color: number; alpha: number } {
  if (!value) {
    return { color: 0xffffff, alpha: 1 };
  }

  const trimmed = value.trim();

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);

    if (/^[0-9a-f]{3}$/i.test(hex)) {
      const r = Number.parseInt(hex.charAt(0) + hex.charAt(0), 16);
      const g = Number.parseInt(hex.charAt(1) + hex.charAt(1), 16);
      const b = Number.parseInt(hex.charAt(2) + hex.charAt(2), 16);
      return { color: (r << 16) | (g << 8) | b, alpha: 1 };
    }

    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return { color: Number.parseInt(hex, 16), alpha: 1 };
    }
  }

  const rgba = /^rgba?\(([^)]+)\)$/i.exec(trimmed);

  if (rgba) {
    const [r = 255, g = 255, b = 255, a = 1] = (rgba[1] ?? '')
      .split(',')
      .map((part) => Number.parseFloat(part.trim()));

    return {
      color: (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b),
      alpha: Math.max(0, Math.min(1, a)),
    };
  }

  return { color: 0xffffff, alpha: 1 };
}

/**
 * Drop-in replacement for the old canvas-backed Text objects. It keeps the
 * chainable Text-style API used across the scenes but renders a 5x7 bitmap
 * font, so glyph edges always land on whole pixels.
 */
export class PixelText extends Phaser.GameObjects.BitmapText {
  private background: Phaser.GameObjects.Rectangle | undefined;
  private backgroundAlpha = 1;
  private readonly paddingX: number;
  private readonly paddingY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string | string[],
    style: PixelTextStyle = {},
  ) {
    super(scene, x, y, PIXEL_FONT_KEY, text, quantizeFontSize(parseFontSize(style.fontSize)));
    scene.add.existing(this);

    this.paddingX = style.padding?.x ?? 0;
    this.paddingY = style.padding?.y ?? 0;

    if (typeof style.color === 'string') {
      this.setColor(style.color);
    }

    if (style.align === 'center') {
      this.setCenterAlign();
    } else if (style.align === 'right') {
      this.setRightAlign();
    }

    if (style.lineSpacing !== undefined) {
      this.setLineSpacing(style.lineSpacing);
    }

    const wrapWidth = typeof style.wordWrap === 'object' ? style.wordWrap?.width : undefined;

    if (wrapWidth) {
      this.setMaxWidth(wrapWidth, 32);
    }

    if (style.backgroundColor) {
      const { color, alpha } = parseCssColor(style.backgroundColor);
      this.backgroundAlpha = alpha;
      this.background = scene.add.rectangle(x, y, 1, 1, color, alpha);
      this.syncBackground();
      scene.events.on(Phaser.Scenes.Events.UPDATE, this.syncBackground, this);
    }
  }

  setColor(color: string): this {
    const parsed = parseCssColor(color);
    this.setTint(parsed.color);
    return this;
  }

  override setFontSize(size: number | string): this {
    super.setFontSize(quantizeFontSize(parseFontSize(size)));
    this.syncBackground();
    return this;
  }

  override setText(value: string | string[]): this {
    super.setText(value);
    this.syncBackground();
    return this;
  }

  override setOrigin(x = 0.5, y = x): this {
    super.setOrigin(x, y);
    this.syncBackground();
    return this;
  }

  override setPosition(x: number, y: number): this {
    super.setPosition(x, y);
    this.syncBackground();
    return this;
  }

  override setX(value: number): this {
    super.setX(value);
    this.syncBackground();
    return this;
  }

  override setY(value: number): this {
    super.setY(value);
    this.syncBackground();
    return this;
  }

  override setScale(x: number, y = x): this {
    super.setScale(x, y);
    this.syncBackground();
    return this;
  }

  override setDepth(value: number): this {
    super.setDepth(value);
    this.syncBackground();
    return this;
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    this.background?.setVisible(value);
    return this;
  }

  override setAlpha(value: number): this {
    super.setAlpha(value);
    this.syncBackground();
    return this;
  }

  override setScrollFactor(x: number, y = x): this {
    super.setScrollFactor(x, y);
    this.background?.setScrollFactor(x, y);
    return this;
  }

  override setInteractive(
    hitArea?: Phaser.Types.Input.InputConfiguration | Phaser.Geom.Rectangle | object,
    callback?: Phaser.Types.Input.HitAreaCallback,
    dropZone?: boolean,
  ): this {
    const rectangle = new Phaser.Geom.Rectangle(0, 0, this.width, this.height);

    if (hitArea === undefined) {
      super.setInteractive(rectangle, Phaser.Geom.Rectangle.Contains, dropZone);
      return this;
    }

    if (this.isInputConfiguration(hitArea)) {
      super.setInteractive(
        {
          ...hitArea,
          hitArea: rectangle,
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        } as unknown as Phaser.Types.Input.InputConfiguration,
        callback,
        dropZone,
      );
      return this;
    }

    super.setInteractive(hitArea as Phaser.Geom.Rectangle, callback, dropZone);
    return this;
  }

  setShadow(
    _x?: number,
    _y?: number,
    _color?: string,
    _blur?: number,
    _shadowStroke?: boolean,
    _shadowFill?: boolean,
  ): this {
    return this;
  }

  override destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.syncBackground, this);
    this.background?.destroy(fromScene);
    this.background = undefined;
    super.destroy(fromScene);
  }

  private isInputConfiguration(value: unknown): value is Phaser.Types.Input.InputConfiguration {
    return typeof value === 'object' && value !== null && !(value instanceof Phaser.Geom.Rectangle);
  }

  private syncBackground(): void {
    const background = this.background;

    if (!background) {
      return;
    }

    background.setDisplaySize(this.width + this.paddingX * 2, this.height + this.paddingY * 2);
    background.setPosition(
      this.x + (0.5 - this.originX) * this.width,
      this.y + (0.5 - this.originY) * this.height,
    );
    background.setDepth(this.depth - 0.001);
    background.setScrollFactor(this.scrollFactorX, this.scrollFactorY);
    background.setVisible(this.visible);
    background.setAlpha(this.alpha * this.backgroundAlpha);
  }
}

/**
 * Every scene uses `this.add.text`, so patching the factory once upgrades all
 * existing and future labels without touching a hundred call sites.
 */
export function installPixelTextFactory(): void {
  const prototype = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (
      x: number,
      y: number,
      text: string | string[],
      style?: Phaser.Types.GameObjects.Text.TextStyle,
    ) => Phaser.GameObjects.Text;
  };

  prototype.text = function text(this: Phaser.GameObjects.GameObjectFactory, x, y, value, style) {
    return new PixelText(this.scene, x, y, value, style) as unknown as Phaser.GameObjects.Text;
  };
}

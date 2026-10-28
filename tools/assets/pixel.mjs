/**
 * Tiny deterministic pixel canvas used by the asset generator. It deliberately
 * has no external dependencies so the committed art pack can be rebuilt by
 * anyone with Node installed.
 */
export class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  clone() {
    const copy = new Canvas(this.width, this.height);
    copy.data.set(this.data);
    return copy;
  }

  set(x, y, color, alpha = 255) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || alpha <= 0) {
      return;
    }

    const [r, g, b] = rgb(color);
    const index = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    this.data[index] = r;
    this.data[index + 1] = g;
    this.data[index + 2] = b;
    this.data[index + 3] = alpha;
  }

  blend(x, y, color, alpha = 255) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || alpha <= 0) {
      return;
    }

    const [r, g, b] = rgb(color);
    const index = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    const sourceAlpha = Math.min(1, alpha / 255);
    const targetAlpha = this.data[index + 3] / 255;
    const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

    if (outAlpha <= 0) {
      return;
    }

    this.data[index] =
      (r * sourceAlpha + this.data[index] * targetAlpha * (1 - sourceAlpha)) / outAlpha;
    this.data[index + 1] =
      (g * sourceAlpha + this.data[index + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha;
    this.data[index + 2] =
      (b * sourceAlpha + this.data[index + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha;
    this.data[index + 3] = outAlpha * 255;
  }

  rect(x, y, width, height, color, alpha = 255) {
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        this.set(x + column, y + row, color, alpha);
      }
    }
  }

  blendRect(x, y, width, height, color, alpha = 255) {
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        this.blend(x + column, y + row, color, alpha);
      }
    }
  }

  outlineRect(x, y, width, height, color) {
    this.rect(x, y, width, 1, color);
    this.rect(x, y + height - 1, width, 1, color);
    this.rect(x, y, 1, height, color);
    this.rect(x + width - 1, y, 1, height, color);
  }

  hline(x, y, width, color) {
    this.rect(x, y, width, 1, color);
  }

  vline(x, y, height, color) {
    this.rect(x, y, 1, height, color);
  }

  line(x0, y0, x1, y1, color) {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;

    while (true) {
      this.set(x, y, color);
      if (x === x1 && y === y1) {
        break;
      }
      const doubled = 2 * error;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }
  }

  /**
   * Filled ellipse with a hard pixel edge, which keeps the retro silhouette.
   */
  ellipse(cx, cy, radiusX, radiusY, color, alpha = 255) {
    for (let y = Math.floor(cy - radiusY); y <= Math.ceil(cy + radiusY); y += 1) {
      for (let x = Math.floor(cx - radiusX); x <= Math.ceil(cx + radiusX); x += 1) {
        const nx = (x + 0.5 - cx) / Math.max(0.5, radiusX);
        const ny = (y + 0.5 - cy) / Math.max(0.5, radiusY);
        if (nx * nx + ny * ny <= 1) {
          this.set(x, y, color, alpha);
        }
      }
    }
  }

  blendEllipse(cx, cy, radiusX, radiusY, color, alpha = 255) {
    for (let y = Math.floor(cy - radiusY); y <= Math.ceil(cy + radiusY); y += 1) {
      for (let x = Math.floor(cx - radiusX); x <= Math.ceil(cx + radiusX); x += 1) {
        const nx = (x + 0.5 - cx) / Math.max(0.5, radiusX);
        const ny = (y + 0.5 - cy) / Math.max(0.5, radiusY);
        if (nx * nx + ny * ny <= 1) {
          this.blend(x, y, color, alpha);
        }
      }
    }
  }

  triangle(x0, y0, x1, y1, x2, y2, color) {
    const minX = Math.floor(Math.min(x0, x1, x2));
    const maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);

    if (area === 0) {
      return;
    }

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const w0 = ((x1 - x0) * (y - y0) - (x - x0) * (y1 - y0)) / area;
        const w1 = ((x - x0) * (y2 - y0) - (x2 - x0) * (y - y0)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
          this.set(x, y, color);
        }
      }
    }
  }

  /**
   * Renders authored pixel maps. Characters are mapped through `palette`.
   * A period or space is transparent.
   */
  drawMap(map, palette, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < map.length; y += 1) {
      const row = map[y];
      for (let x = 0; x < row.length; x += 1) {
        const token = row[x];
        if (token === '.' || token === ' ') {
          continue;
        }
        const color = palette[token];
        if (color === undefined) {
          throw new Error(`No palette entry for "${token}" at ${x},${y}.`);
        }
        if (Array.isArray(color)) {
          this.set(offsetX + x, offsetY + y, color[0], color[1] ?? 255);
        } else {
          this.set(offsetX + x, offsetY + y, color);
        }
      }
    }
  }

  blit(source, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const index = (y * source.width + x) * 4;
        const alpha = source.data[index + 3];
        if (alpha > 0) {
          this.set(
            offsetX + x,
            offsetY + y,
            (source.data[index] << 16) | (source.data[index + 1] << 8) | source.data[index + 2],
            alpha,
          );
        }
      }
    }
  }

  toBuffer() {
    return Buffer.from(this.data.buffer, this.data.byteOffset, this.data.byteLength);
  }
}

export function sheet(frames, frameWidth, frameHeight) {
  const canvas = new Canvas(frameWidth * frames.length, frameHeight);
  frames.forEach((frame, index) => {
    canvas.blit(frame, index * frameWidth, 0);
  });
  return canvas;
}

export function rgb(color) {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

export function darken(color, amount = 0.35) {
  const [r, g, b] = rgb(color);
  return (
    (Math.max(0, Math.round(r * (1 - amount))) << 16) |
    (Math.max(0, Math.round(g * (1 - amount))) << 8) |
    Math.max(0, Math.round(b * (1 - amount)))
  );
}

export function lighten(color, amount = 0.35) {
  const [r, g, b] = rgb(color);
  return (
    (Math.min(255, Math.round(r + (255 - r) * amount)) << 16) |
    (Math.min(255, Math.round(g + (255 - g) * amount)) << 8) |
    Math.min(255, Math.round(b + (255 - b) * amount))
  );
}

export function mix(a, b, amount) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return (
    (Math.round(ar + (br - ar) * amount) << 16) |
    (Math.round(ag + (bg - ag) * amount) << 8) |
    Math.round(ab + (bb - ab) * amount)
  );
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Pads short rows with transparency so authored maps only need to describe
 * their visible pixels. Rows that are too long still fail loudly.
 */
export function normalizeMap(map, width, height, name) {
  if (map.length !== height) {
    throw new Error(`${name}: expected ${height} rows, received ${map.length}.`);
  }

  return map.map((row, y) => {
    if (row.length > width) {
      throw new Error(`${name}: row ${y} has ${row.length} columns, maximum is ${width}.`);
    }

    return row.padEnd(width, '.');
  });
}

export function validateMap(map, width, height, name) {
  if (map.length !== height) {
    throw new Error(`${name}: expected ${height} rows, received ${map.length}.`);
  }

  for (let y = 0; y < map.length; y += 1) {
    if (map[y].length !== width) {
      throw new Error(
        `${name}: row ${y} has ${map[y].length} columns, expected ${width} (${map[y]}).`,
      );
    }
  }
}

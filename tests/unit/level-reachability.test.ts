import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAYER_TUNING } from '../../src/config/tuning';
import { LEVEL_ORDER } from '../../src/data/level-registry';

const BODY_WIDTH = 10;
const LANDING_OVERLAP = 4;
const SAFETY_MARGIN = 6;
const STEP_SECONDS = 1 / 60;

interface MapRect {
  x: number;
  y: number;
  width: number;
  height?: number;
}

interface LevelMap {
  id: string;
  spawn: { x: number; y: number };
  solids: MapRect[];
  oneWayPlatforms: MapRect[];
  exit: MapRect;
}

interface Surface {
  id: string;
  x: number;
  y: number;
  width: number;
  kind: 'solid' | 'platform';
}

/**
 * Arcade Physics applies gravity before moving a body, so a 300 px/s jump
 * peaks just under 48 px at 60 Hz. The level generator and these maps use
 * 48 px steps, so the tuning is checked with the same discrete step the game
 * uses rather than the textbook v^2 / 2g figure.
 */
function measuredJumpRise(): number {
  let velocity = PLAYER_TUNING.jumpVelocity;
  let rise = 0;

  while (velocity > 0) {
    velocity -= PLAYER_TUNING.gravity * STEP_SECONDS;
    if (velocity > 0) {
      rise += velocity * STEP_SECONDS;
    }
  }

  return rise;
}

function jumpRange(rise: number, maxRise: number): number | null {
  if (rise > maxRise) {
    return null;
  }

  const discriminant = PLAYER_TUNING.jumpVelocity ** 2 - 2 * PLAYER_TUNING.gravity * rise;

  if (discriminant < 0) {
    return null;
  }

  const airtime = (PLAYER_TUNING.jumpVelocity + Math.sqrt(discriminant)) / PLAYER_TUNING.gravity;
  return PLAYER_TUNING.runSpeed * airtime;
}

/**
 * The player can hang roughly half a body over the takeoff edge and only needs
 * a few pixels of body overlap to land. This mirrors Arcade Physics' overlap
 * checks and deliberately stays inside the tuning rather than assuming a
 * perfect edge-to-edge jump.
 */
function requiredTravel(from: Surface, to: Surface): number {
  const overhang = BODY_WIDTH / 2 - 1;
  const startMin = from.x - overhang;
  const startMax = from.x + from.width + overhang;
  const targetCenter = to.x + to.width / 2;
  const startX = Math.min(startMax, Math.max(startMin, targetCenter));

  if (targetCenter >= startX) {
    const minimumLandingCenter = to.x - BODY_WIDTH / 2 + LANDING_OVERLAP;
    return Math.max(0, minimumLandingCenter - startX);
  }

  const maximumLandingCenter = to.x + to.width + BODY_WIDTH / 2 - LANDING_OVERLAP;
  return Math.max(0, startX - maximumLandingCenter);
}

function loadMap(levelId: string): LevelMap {
  const path = new URL(`../../public/maps/${levelId}.json`, import.meta.url);
  return JSON.parse(readFileSync(path, 'utf8')) as LevelMap;
}

function surfacesOf(map: LevelMap): Surface[] {
  return [
    ...map.solids.map((rect, index) => ({
      id: `solid-${index}@${rect.x},${rect.y}`,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      kind: 'solid' as const,
    })),
    ...map.oneWayPlatforms.map((rect, index) => ({
      id: `platform-${index}@${rect.x},${rect.y}`,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      kind: 'platform' as const,
    })),
  ];
}

/**
 * The spawn point is placed slightly above the first surface so the player
 * falls onto it. Pick the nearest supporting surface below the spawn body.
 */
function spawnSurface(map: LevelMap, surfaces: Surface[]): Surface {
  const bodyBottom = map.spawn.y + 12;
  const candidates = surfaces
    .filter(
      (surface) =>
        surface.y >= bodyBottom - 1 &&
        map.spawn.x >= surface.x &&
        map.spawn.x <= surface.x + surface.width,
    )
    .sort((a, b) => a.y - b.y);

  const first = candidates[0];
  if (!first) {
    throw new Error(`${map.id}: spawn point is not above a solid or platform`);
  }

  return first;
}

function reachableSurfaces(map: LevelMap, surfaces: Surface[]): Set<string> {
  const maxRise = measuredJumpRise() - 4;
  const start = spawnSurface(map, surfaces);
  const seen = new Set([start.id]);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const candidate of surfaces) {
      if (seen.has(candidate.id)) {
        continue;
      }

      const range = jumpRange(current.y - candidate.y, maxRise);
      if (range === null) {
        continue;
      }

      if (requiredTravel(current, candidate) + SAFETY_MARGIN <= range) {
        seen.add(candidate.id);
        queue.push(candidate);
      }
    }
  }

  return seen;
}

describe('level platform reachability', () => {
  it('keeps enough measured jump height for the authored 48 px steps', () => {
    expect(measuredJumpRise()).toBeGreaterThanOrEqual(48 + 4);
  });

  for (const levelId of LEVEL_ORDER) {
    describe(levelId, () => {
      const map = loadMap(levelId);
      const surfaces = surfacesOf(map);
      const reachable = reachableSurfaces(map, surfaces);

      it('reaches every solid and one-way platform from the spawn', () => {
        const unreachable = surfaces
          .filter((surface) => !reachable.has(surface.id))
          .map((surface) => surface.id);

        expect(unreachable).toEqual([]);
      });

      it('has a reachable surface under the exit', () => {
        const exitBottom = map.exit.y + (map.exit.height ?? 0);
        const supporting = surfaces.filter(
          (surface) =>
            Math.abs(surface.y - exitBottom) <= 2 &&
            surface.x < map.exit.x + map.exit.width &&
            surface.x + surface.width > map.exit.x,
        );

        expect(supporting.length).toBeGreaterThan(0);
        expect(supporting.some((surface) => reachable.has(surface.id))).toBe(true);
      });
    });
  }
});

export const DEFAULT_SKIN_ID = 'delver';

export type SkinId =
  | 'delver'
  | 'pale-wanderer'
  | 'boneclad'
  | 'gilded'
  | 'wormhide'
  | 'iron'
  | 'obsidian'
  | 'crimson'
  | 'legend';

/**
 * Placeholder palette art: every skin uses the same 16x24 miner silhouette and
 * only swaps colors. Final sprite art can replace these keys without changing
 * save data or unlock rules.
 */
export interface SkinPalette {
  helmet: number;
  helmetHighlight: number;
  clothes: number;
  clothesShade: number;
  arms: number;
  skin: number;
  skinShade: number;
  eyes: number;
  lamp: number;
  boots: number;
  bootShade: number;
}

export interface SkinDefinition {
  id: SkinId;
  name: string;
  description: string;
  unlockHint: string;
  unlockAchievementId: string | null;
  palette: SkinPalette;
}

export const SKIN_IDS = [
  'delver',
  'pale-wanderer',
  'boneclad',
  'gilded',
  'wormhide',
  'iron',
  'obsidian',
  'crimson',
  'legend',
] as const satisfies readonly SkinId[];

export const SKINS: Record<SkinId, SkinDefinition> = {
  delver: {
    id: 'delver',
    name: 'Delver',
    description: 'The standard mining kit. Trusted, dusty, and still standing.',
    unlockHint: 'Available from the start.',
    unlockAchievementId: null,
    palette: {
      helmet: 0xf2c14e,
      helmetHighlight: 0xfff3b0,
      clothes: 0x2f3640,
      clothesShade: 0x1b1f24,
      arms: 0x3d5560,
      skin: 0xf1c27d,
      skinShade: 0xc9975f,
      eyes: 0x11161b,
      lamp: 0xfff3b0,
      boots: 0x2f3640,
      bootShade: 0x1b1f24,
    },
  },
  'pale-wanderer': {
    id: 'pale-wanderer',
    name: 'Pale Wanderer',
    description: 'Ash-gray gear for a miner who leaves every enemy alive.',
    unlockHint: 'Earn the Pacifist badge.',
    unlockAchievementId: 'pacifist',
    palette: {
      helmet: 0xb8c0c8,
      helmetHighlight: 0xe8eef2,
      clothes: 0x4a5560,
      clothesShade: 0x2d343b,
      arms: 0x66727d,
      skin: 0xe8d7c3,
      skinShade: 0xc9b39b,
      eyes: 0x2a3038,
      lamp: 0xd7f2ff,
      boots: 0x4a5560,
      bootShade: 0x2d343b,
    },
  },
  boneclad: {
    id: 'boneclad',
    name: 'Boneclad',
    description: 'Bone-white plating worn by those who trust only the rock.',
    unlockHint: 'Earn the Primitive badge.',
    unlockAchievementId: 'primitive',
    palette: {
      helmet: 0xd8d2c0,
      helmetHighlight: 0xf2eee2,
      clothes: 0x4a4030,
      clothesShade: 0x2f281e,
      arms: 0x8a7d63,
      skin: 0xd8d2c0,
      skinShade: 0xaaa38f,
      eyes: 0x1a1a14,
      lamp: 0x6fe3c4,
      boots: 0x4a4030,
      bootShade: 0x2f281e,
    },
  },
  gilded: {
    id: 'gilded',
    name: 'Gilded',
    description: 'A gaudy set for a miner who never took a single hit.',
    unlockHint: 'Earn the Untouchable badge.',
    unlockAchievementId: 'untouchable',
    palette: {
      helmet: 0xd9a928,
      helmetHighlight: 0xffe08a,
      clothes: 0x6b4a12,
      clothesShade: 0x3e2a08,
      arms: 0xb8891c,
      skin: 0xf1c27d,
      skinShade: 0xc9975f,
      eyes: 0x1a1204,
      lamp: 0xfff3b0,
      boots: 0x6b4a12,
      bootShade: 0x3e2a08,
    },
  },
  wormhide: {
    id: 'wormhide',
    name: 'Wormhide',
    description: 'A grim trophy cut from the Great Worm itself.',
    unlockHint: 'Defeat the Great Worm.',
    unlockAchievementId: 'worm_slayer',
    palette: {
      helmet: 0x8a4656,
      helmetHighlight: 0xc96a7e,
      clothes: 0x3a1b27,
      clothesShade: 0x1a0b0f,
      arms: 0x5c2f3d,
      skin: 0xc9a27a,
      skinShade: 0x9a7455,
      eyes: 0x1a0b0f,
      lamp: 0xffcf5a,
      boots: 0x3a1b27,
      bootShade: 0x1a0b0f,
    },
  },
  iron: {
    id: 'iron',
    name: 'Ironclad',
    description: 'Heavy, practical plate for a Hard-mode survivor.',
    unlockHint: 'Clear a run on Hard.',
    unlockAchievementId: 'hard_clear',
    palette: {
      helmet: 0x8b949e,
      helmetHighlight: 0xc7d0d9,
      clothes: 0x4a515a,
      clothesShade: 0x2a2f36,
      arms: 0x6c7580,
      skin: 0xd6b08a,
      skinShade: 0xa78260,
      eyes: 0x11161b,
      lamp: 0xbfe9ff,
      boots: 0x4a515a,
      bootShade: 0x2a2f36,
    },
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Black glass armor for a nearly impossible victory.',
    unlockHint: 'Clear a run on Impossible.',
    unlockAchievementId: 'impossible_clear',
    palette: {
      helmet: 0x2a2238,
      helmetHighlight: 0x6b5a8a,
      clothes: 0x17121f,
      clothesShade: 0x08060c,
      arms: 0x3a2f4f,
      skin: 0x9a8aa8,
      skinShade: 0x6f617c,
      eyes: 0xffcf5a,
      lamp: 0xc9a7ff,
      boots: 0x17121f,
      bootShade: 0x08060c,
    },
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    description: 'The color of a one-heart run through a full clear.',
    unlockHint: 'Clear a run on Crazy.',
    unlockAchievementId: 'crazy_clear',
    palette: {
      helmet: 0xc8504a,
      helmetHighlight: 0xff9a8a,
      clothes: 0x5a1f23,
      clothesShade: 0x2a0d10,
      arms: 0x8f2f34,
      skin: 0xe6b38c,
      skinShade: 0xb58461,
      eyes: 0x1a0b0f,
      lamp: 0xffcf5a,
      boots: 0x5a1f23,
      bootShade: 0x2a0d10,
    },
  },
  legend: {
    id: 'legend',
    name: 'Legend',
    description: 'White-gold gear reserved for a perfect challenge run.',
    unlockHint: 'Earn the Legend badge.',
    unlockAchievementId: 'legend',
    palette: {
      helmet: 0xffd45e,
      helmetHighlight: 0xfff8d0,
      clothes: 0x2d5f66,
      clothesShade: 0x16383d,
      arms: 0x4a8f96,
      skin: 0xf1c27d,
      skinShade: 0xc9975f,
      eyes: 0x0b1f24,
      lamp: 0xe8ffff,
      boots: 0x2d5f66,
      bootShade: 0x16383d,
    },
  },
};

export const SKIN_LIST: readonly SkinDefinition[] = SKIN_IDS.map((id) => SKINS[id]);

export function isSkinId(value: string): value is SkinId {
  return Object.prototype.hasOwnProperty.call(SKINS, value);
}

export function resolveSkinId(value: string): SkinId {
  return isSkinId(value) ? value : DEFAULT_SKIN_ID;
}

export function skinTextureKey(id: SkinId): string {
  return `miner-skin-${id}`;
}

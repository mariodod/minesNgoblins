import manifest from './asset-manifest.json';

export interface AssetAnimation {
  key: string;
  frames: number[];
  frameRate: number;
  repeat: number;
}

export interface ImageAsset {
  key: string;
  url: string;
  width: number;
  height: number;
}

export interface SpritesheetAsset {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  animations: AssetAnimation[];
}

export interface BitmapFontAsset {
  key: string;
  textureUrl: string;
  dataUrl: string;
}

export interface AssetManifest {
  version: number;
  images: ImageAsset[];
  spritesheets: SpritesheetAsset[];
  bitmapFonts: BitmapFontAsset[];
}

/**
 * The generated pack is committed next to its generator. Loading and animation
 * registration both read this manifest, so adding art never requires touching
 * PreloadScene.
 */
export const ASSET_MANIFEST: AssetManifest = manifest;

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export function animationKey(textureKey: string, state: string): string {
  return `${textureKey}-${state}`;
}

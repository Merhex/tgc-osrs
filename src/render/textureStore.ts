import * as THREE from 'three';
import { CARDS, getCard } from '../data/cards';
import { renderCardBack, renderCardFace } from './cardFace';
import { renderCrimp, renderPackBack, renderPackFront } from './packArt';

import { canvasFor, textureScale } from './canvasCache';

const textureCache = new Map<string, THREE.CanvasTexture>();

function toTexture(key: string, canvas: HTMLCanvasElement): THREE.CanvasTexture {
  let tex = textureCache.get(key);
  if (!tex) {
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    textureCache.set(key, tex);
  }
  return tex;
}

export function cardFaceCanvas(cardId: string): Promise<HTMLCanvasElement> {
  return canvasFor(`face:${cardId}`, () => renderCardFace(getCard(cardId), { scale: textureScale() }));
}

export function cardBackCanvas(): Promise<HTMLCanvasElement> {
  return canvasFor('back', () => renderCardBack(textureScale()));
}

export async function cardFaceTexture(cardId: string): Promise<THREE.CanvasTexture> {
  return toTexture(`face:${cardId}`, await cardFaceCanvas(cardId));
}

export async function cardBackTexture(): Promise<THREE.CanvasTexture> {
  return toTexture('back', await cardBackCanvas());
}

export interface PackTextures {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  crimp: THREE.CanvasTexture;
}

export async function packTextures(): Promise<PackTextures> {
  const [f, b] = await Promise.all([canvasFor('pack:front', renderPackFront), canvasFor('pack:back', renderPackBack)]);
  const crimp = toTexture('pack:crimp', renderCrimp());
  crimp.wrapS = THREE.RepeatWrapping;
  return { front: toTexture('pack:front', f), back: toTexture('pack:back', b), crimp };
}

/** Preloads every texture an opening needs. */
export async function preloadOpening(cardIds: readonly string[]): Promise<void> {
  await Promise.all([packTextures(), cardBackTexture(), ...Array.from(new Set(cardIds)).map(cardFaceTexture)]);
}

/** Frees GPU copies of card face textures (canvases stay cached and re-upload on demand). */
export function releaseCardTextures(keep: readonly string[] = []): void {
  for (const [key, tex] of textureCache) {
    if (key.startsWith('face:') && !keep.includes(key.slice(5))) tex.dispose();
  }
}

export const ALL_CARD_IDS = CARDS.map((c) => c.id);

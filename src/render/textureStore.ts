import * as THREE from 'three';
import { CARDS, getCard } from '../data/cards';
import { renderCardBack, renderCardFace, renderCardLayers, type CardLayers } from './cardFace';
import type { CardFaceTextures } from '../three/cardMaterial';
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

const layerCache = new Map<string, Promise<CardLayers>>();

/** Separated print / background / mask textures for the physical card material. */
export async function cardFaceTextures(cardId: string): Promise<CardFaceTextures> {
  let p = layerCache.get(cardId);
  if (!p) {
    p = renderCardLayers(getCard(cardId), textureScale());
    p.catch(() => layerCache.delete(cardId));
    layerCache.set(cardId, p);
  }
  const layers = await p;
  const print = toTexture(`face:${cardId}:print`, layers.print);
  const background = toTexture(`face:${cardId}:bg`, layers.background);
  const mask = textureCache.get(`face:${cardId}:mask`) ?? toTexture(`face:${cardId}:mask`, layers.mask);
  mask.colorSpace = THREE.NoColorSpace;
  return { print, background, mask };
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

/**
 * Loads what the opening animation needs before it starts (pack and card back).
 * Remaining faces continue in the background and are awaited per card by the reveal.
 */
export async function preloadOpening(cardIds: readonly string[]): Promise<void> {
  const unique = Array.from(new Set(cardIds));
  await Promise.all([packTextures(), cardBackTexture()]);
  // Faces render during the opening animation, in reveal order.
  void unique.reduce((p, id) => p.then(() => cardFaceTextures(id).then(() => undefined)), Promise.resolve());
}

let prewarmStarted = false;
/** Renders all card layers one at a time during idle periods after start-up. */
export function prewarmCardTextures(): void {
  if (prewarmStarted) return;
  prewarmStarted = true;
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 200));
  const ids = [...ALL_CARD_IDS];
  const next = () => {
    const id = ids.shift();
    if (!id) return;
    idle(() => void cardFaceTextures(id).finally(next));
  };
  setTimeout(() => idle(() => void Promise.all([packTextures(), cardBackTexture()]).finally(next)), 4000);
}

/** Frees GPU copies of card face textures (canvases stay cached and re-upload on demand). */
export function releaseCardTextures(keep: readonly string[] = []): void {
  for (const [key, tex] of textureCache) {
    if (key.startsWith('face:') && !keep.includes(key.split(':')[1])) tex.dispose();
  }
}

export const ALL_CARD_IDS = CARDS.map((c) => c.id);

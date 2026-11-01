import type { Rarity } from '../data/cards';

/**
 * Live, cosmetic render tuning. Read every frame by materials and lights; edited only
 * by the development panel. Never persisted and never touches collection data.
 */
export const tuning = {
  /** Multiplies every card surface roughness. */
  roughness: 1,
  clearcoat: 0.55,
  envIntensity: 1.25,
  holo: 1,
  foilScale: 1,
  keyLightX: 1.6,
  keyLightY: 2.4,
  /** Overrides the rarity finish of every card (null = card's own rarity). */
  rarityOverride: null as Rarity | null,
};

export interface FinishPreset {
  /** Holographic strength on the artwork background. */
  bgHolo: number;
  /** Metallic share of the artwork background foil. */
  bgMetal: number;
  /** Relief of the foil pattern (drives normal variation). */
  relief: number;
  frameMetal: number;
  frameRough: number;
  frameHolo: number;
  /** Selective foil on the subject. */
  subjectFoil: number;
  /** Parallax depth of the background behind the subject (UV units). */
  depth: number;
  /** Second, finer foil layer (Legendary). */
  layered: number;
  /** Thin-film iridescence amount. */
  iridescence: number;
  spectralBoost: number;
}

export const FINISHES: Record<Rarity, FinishPreset> = {
  Rare: { bgHolo: 0.25, bgMetal: 0.1, relief: 0.12, frameMetal: 0.4, frameRough: 0.36, frameHolo: 0, subjectFoil: 0, depth: 0.006, layered: 0, iridescence: 0.15, spectralBoost: 0 },
  Epic: { bgHolo: 1.15, bgMetal: 0.32, relief: 0.6, frameMetal: 0.75, frameRough: 0.3, frameHolo: 0.12, subjectFoil: 0, depth: 0.016, layered: 0, iridescence: 0.5, spectralBoost: 0.08 },
  Legendary: { bgHolo: 1.5, bgMetal: 0.4, relief: 0.9, frameMetal: 0.92, frameRough: 0.22, frameHolo: 0.35, subjectFoil: 0.75, depth: 0.026, layered: 1, iridescence: 0.65, spectralBoost: 0.12 },
};

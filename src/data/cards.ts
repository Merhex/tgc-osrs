/**
 * Card definitions for "Legends of Gielinor — Volume I".
 *
 * Rarities are prototype settings for this fan card game only. They say
 * nothing about drop rates or value in Old School RuneScape.
 */

export type Rarity = 'Rare' | 'Epic' | 'Legendary';

export const RARITIES: readonly Rarity[] = ['Rare', 'Epic', 'Legendary'];

export type Category =
  | 'Raid Boss'
  | 'Raid Boss Duo'
  | 'Boss'
  | 'Achievement Equipment'
  | 'Equipment'
  | 'Ranged Weapon'
  | 'Melee Weapon'
  | 'Magic Weapon'
  | 'Skilling Equipment';

/** Visual effect shown while inspecting the card (implemented in the card shader). */
export type InspectEffect =
  | 'chamberGlow'
  | 'crimsonPulse'
  | 'alternatingLight'
  | 'lavaEmbers'
  | 'lavaPattern'
  | 'spectralRipple'
  | 'holoSheen'
  | 'crimsonSweep'
  | 'amberAura'
  | 'silverGoldShimmer';

export interface FrameStyle {
  /** Main frame colour. */
  base: string;
  /** Darker frame shade for bevels. */
  shade: string;
  /** Accent colour for gems, lines and the inspection effect. */
  accent: string;
  /** Secondary accent. */
  accent2: string;
  /** Texture motif drawn on the frame. */
  motif: 'stone' | 'iron' | 'sandstone' | 'volcanic' | 'obsidian' | 'silver' | 'goldFoil' | 'paleFoil';
}

/** Foil pattern printed behind the artwork (card finish design only). */
export type FinishPattern =
  | 'crystalFacets'
  | 'web'
  | 'sandstoneGeometry'
  | 'volcanic'
  | 'interference'
  | 'organicGrain'
  | 'darkMetal'
  | 'solarRadial'
  | 'prismatic';

export interface CardFinish {
  pattern: FinishPattern;
  /** Two reflection colours the foil shifts between with viewing angle. */
  holoA: string;
  holoB: string;
  /** How much full-spectrum iridescence mixes in (0 = only holoA/holoB). */
  spectral: number;
}

export interface CardDefinition {
  id: string;
  number: string;
  name: string;
  category: Category;
  source: string;
  rarity: Rarity;
  description: string;
  ability: { name: string; text: string };
  /** File name in /public/art. */
  art: string;
  frame: FrameStyle;
  effect: InspectEffect;
  finish: CardFinish;
}

export const SET_NAME = 'Legends of Gielinor — Volume I';
export const SET_CODE = 'LOG-I';

export const CARDS: readonly CardDefinition[] = [
  {
    id: 'great-olm',
    number: '001',
    name: 'Great Olm',
    category: 'Raid Boss',
    source: 'Chambers of Xeric',
    rarity: 'Epic',
    description: 'The final encounter of the Chambers of Xeric.',
    ability: { name: 'Head Phase', text: 'After your third attack, strike again.' },
    art: 'great-olm.svg',
    frame: { base: '#6f6a5f', shade: '#3b3832', accent: '#5fe08a', accent2: '#2f8f5a', motif: 'stone' },
    effect: 'chamberGlow',
    finish: { pattern: 'crystalFacets', holoA: '#5fe08a', holoB: '#9a5cff', spectral: 0.35 },
  },
  {
    id: 'verzik-vitur',
    number: '002',
    name: 'Verzik Vitur',
    category: 'Raid Boss',
    source: 'Theatre of Blood',
    rarity: 'Epic',
    description: 'The final boss of the Theatre of Blood.',
    ability: { name: 'Blood Offering', text: 'Restore health when an opposing unit falls.' },
    art: 'verzik-vitur.svg',
    frame: { base: '#3c3f45', shade: '#1b1c20', accent: '#d12b3a', accent2: '#7a1420', motif: 'iron' },
    effect: 'crimsonPulse',
    finish: { pattern: 'web', holoA: '#d12b3a', holoB: '#5c0d16', spectral: 0.15 },
  },
  {
    id: 'the-wardens',
    number: '003',
    name: 'The Wardens',
    category: 'Raid Boss Duo',
    source: 'Tombs of Amascut',
    rarity: 'Epic',
    description: 'Tumeken’s Warden and Elidinis’ Warden await within the Tombs of Amascut.',
    ability: { name: 'Divine Machinery', text: 'Alternate between an offensive and defensive stance.' },
    art: 'the-wardens.svg',
    frame: { base: '#c9a46a', shade: '#7d5f33', accent: '#3fd6c8', accent2: '#e8c35a', motif: 'sandstone' },
    effect: 'alternatingLight',
    finish: { pattern: 'sandstoneGeometry', holoA: '#f0c55c', holoB: '#3fd6c8', spectral: 0.3 },
  },
  {
    id: 'tzkal-zuk',
    number: '004',
    name: 'TzKal-Zuk',
    category: 'Boss',
    source: 'The Inferno',
    rarity: 'Epic',
    description: 'The final boss of the Inferno.',
    ability: { name: 'Shield Breaker', text: 'Ignore an enemy’s defensive barrier.' },
    art: 'tzkal-zuk.svg',
    frame: { base: '#24201f', shade: '#0d0b0b', accent: '#ff7a1a', accent2: '#c73c0c', motif: 'volcanic' },
    effect: 'lavaEmbers',
    finish: { pattern: 'volcanic', holoA: '#ff7a1a', holoB: '#ffcf4a', spectral: 0.2 },
  },
  {
    id: 'infernal-cape',
    number: '005',
    name: 'Infernal cape',
    category: 'Achievement Equipment',
    source: 'The Inferno',
    rarity: 'Rare',
    description: 'Awarded for defeating TzKal-Zuk in the Inferno.',
    ability: { name: 'Infernal Resolve', text: 'Strengthen an equipped melee unit.' },
    art: 'infernal-cape.svg',
    frame: { base: '#1d1a20', shade: '#09080a', accent: '#ff8a2a', accent2: '#ffb347', motif: 'obsidian' },
    effect: 'lavaPattern',
    finish: { pattern: 'volcanic', holoA: '#ff8a2a', holoB: '#c73c0c', spectral: 0.2 },
  },
  {
    id: 'elysian-spirit-shield',
    number: '006',
    name: 'Elysian spirit shield',
    category: 'Equipment',
    source: 'Corporeal Beast (Elysian sigil)',
    rarity: 'Epic',
    description: 'A spirit shield created using the Corporeal Beast’s Elysian sigil.',
    ability: { name: 'Spectral Protection', text: 'Reduce the next incoming hit.' },
    art: 'elysian-spirit-shield.svg',
    frame: { base: '#b9c2cc', shade: '#5f6873', accent: '#6fc8ff', accent2: '#c9ecff', motif: 'silver' },
    effect: 'spectralRipple',
    finish: { pattern: 'interference', holoA: '#6fc8ff', holoB: '#c9ecff', spectral: 0.55 },
  },
  {
    id: 'twisted-bow',
    number: '007',
    name: 'Twisted bow',
    category: 'Ranged Weapon',
    source: 'Chambers of Xeric',
    rarity: 'Legendary',
    description: 'A prestigious ranged weapon obtained from the Chambers of Xeric.',
    ability: { name: 'Magebane', text: 'Deal increased damage against enemies with high Magic.' },
    art: 'twisted-bow.svg',
    frame: { base: '#d8b04a', shade: '#7c5a1c', accent: '#4fe07a', accent2: '#9a5cff', motif: 'goldFoil' },
    effect: 'holoSheen',
    finish: { pattern: 'organicGrain', holoA: '#4fe07a', holoB: '#e8c35a', spectral: 0.35 },
  },
  {
    id: 'scythe-of-vitur',
    number: '008',
    name: 'Scythe of Vitur',
    category: 'Melee Weapon',
    source: 'Theatre of Blood',
    rarity: 'Legendary',
    description: 'A prestigious melee weapon obtained from the Theatre of Blood.',
    ability: { name: 'Reaping Arc', text: 'Strike up to three adjacent targets.' },
    art: 'scythe-of-vitur.svg',
    frame: { base: '#d1a643', shade: '#3a3436', accent: '#e0263a', accent2: '#5c0d16', motif: 'goldFoil' },
    effect: 'crimsonSweep',
    finish: { pattern: 'darkMetal', holoA: '#e0263a', holoB: '#9aa0ab', spectral: 0.15 },
  },
  {
    id: 'tumekens-shadow',
    number: '009',
    name: 'Tumeken’s shadow',
    category: 'Magic Weapon',
    source: 'Tombs of Amascut',
    rarity: 'Legendary',
    description: 'A prestigious magic weapon obtained from the Tombs of Amascut.',
    ability: { name: 'Amplification', text: 'Increase the effect of equipped magic bonuses.' },
    art: 'tumekens-shadow.svg',
    frame: { base: '#d6aa45', shade: '#3a2350', accent: '#ffb547', accent2: '#6a2fb0', motif: 'goldFoil' },
    effect: 'amberAura',
    finish: { pattern: 'solarRadial', holoA: '#ffb547', holoB: '#7a3fd0', spectral: 0.35 },
  },
  {
    id: 'third-age-pickaxe',
    number: '010',
    name: '3rd age pickaxe',
    category: 'Skilling Equipment',
    source: 'Treasure Trails',
    rarity: 'Legendary',
    description: 'An exceptionally rare Treasure Trails reward.',
    ability: { name: 'Ancient Fortune', text: 'Discover an additional resource.' },
    art: 'third-age-pickaxe.svg',
    frame: { base: '#dfe3e8', shade: '#8a8f96', accent: '#e9c66a', accent2: '#f4f6ff', motif: 'paleFoil' },
    effect: 'silverGoldShimmer',
    finish: { pattern: 'prismatic', holoA: '#e9c66a', holoB: '#e8ecf4', spectral: 0.4 },
  },
];

export const CARD_BY_ID: ReadonlyMap<string, CardDefinition> = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardDefinition {
  const card = CARD_BY_ID.get(id);
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}

export const CATEGORIES: readonly Category[] = Array.from(new Set(CARDS.map((c) => c.category)));

/** Subject-specific accent used by the Legendary reveal. */
export function legendaryAccent(card: CardDefinition): { primary: string; secondary: string } {
  return { primary: card.frame.accent, secondary: card.frame.accent2 };
}

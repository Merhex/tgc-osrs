import { CARDS, type CardDefinition, type Rarity } from '../data/cards';
import { PACK_SIZE, type PackConfig, type PackMode, PROTOTYPE_BOOSTER } from './packConfig';
import { newId, shuffle, type Rng } from './random';

export interface CardInstance {
  /** Unique per pulled copy. */
  instanceId: string;
  /** Card definition id. */
  cardId: string;
  /** 0-based slot index within the pack. */
  slot: number;
}

export class PackConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackConfigError';
  }
}

type Pool = readonly CardDefinition[];

function eligibleRarities(weights: Partial<Record<Rarity, number>>): Rarity[] {
  return (Object.keys(weights) as Rarity[]).filter((r) => (weights[r] ?? 0) > 0);
}

/**
 * Checks whether a configuration can produce a pack. For duplicate-free packs this
 * solves a bipartite matching between slots and unique definitions, so slot
 * constraints are respected exactly instead of being silently relaxed.
 * Returns null when feasible, otherwise a human-readable reason.
 */
export function validatePackConfig(config: PackConfig, pool: Pool = CARDS): string | null {
  if (config.slots.length !== PACK_SIZE) {
    return `Pack "${config.label}" defines ${config.slots.length} slots; exactly ${PACK_SIZE} are required.`;
  }
  for (const [i, slot] of config.slots.entries()) {
    const rarities = eligibleRarities(slot.weights);
    if (rarities.length === 0) return `Slot ${i + 1} has no rarity with a positive weight.`;
    if (!pool.some((c) => rarities.includes(c.rarity))) {
      return `Slot ${i + 1} requires ${rarities.join('/')} but the catalogue has no such cards.`;
    }
  }
  if (config.allowDuplicatesWithinPack) return null;

  const matched = maxMatching(config, pool);
  if (matched < config.slots.length) {
    const needs = summariseNeeds(config, pool);
    return (
      `Pack "${config.label}" cannot be duplicate-free: only ${matched} of ${config.slots.length} slots ` +
      `can receive distinct cards. ${needs}`
    );
  }
  return null;
}

function summariseNeeds(config: PackConfig, pool: Pool): string {
  const groups = new Map<string, number>();
  for (const slot of config.slots) {
    const key = eligibleRarities(slot.weights).sort().join('/');
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return Array.from(groups.entries())
    .map(([key, count]) => {
      const rs = key.split('/') as Rarity[];
      const available = pool.filter((c) => rs.includes(c.rarity)).length;
      return `${count} slot(s) need ${key} cards; ${available} unique definition(s) exist.`;
    })
    .join(' ');
}

/** Kuhn's augmenting-path maximum bipartite matching (slots ↔ definitions). */
function maxMatching(config: PackConfig, pool: Pool): number {
  const adj = config.slots.map((slot) => {
    const rs = eligibleRarities(slot.weights);
    return pool.map((c, idx) => (rs.includes(c.rarity) ? idx : -1)).filter((i) => i >= 0);
  });
  const owner = new Array<number>(pool.length).fill(-1);
  const tryAssign = (s: number, seen: boolean[]): boolean => {
    for (const c of adj[s]) {
      if (seen[c]) continue;
      seen[c] = true;
      if (owner[c] === -1 || tryAssign(owner[c], seen)) {
        owner[c] = s;
        return true;
      }
    }
    return false;
  };
  let count = 0;
  for (let s = 0; s < adj.length; s++) if (tryAssign(s, new Array(pool.length).fill(false))) count++;
  return count;
}

function pickWeighted<T>(entries: readonly [T, number][], rng: Rng): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}

/**
 * Generates a pack from a slot-based configuration.
 * Rarity is chosen by weight first, then a definition is chosen uniformly within it.
 */
export function generateFromConfig(config: PackConfig, rng: Rng, pool: Pool = CARDS): CardInstance[] {
  const problem = validatePackConfig(config, pool);
  if (problem) throw new PackConfigError(problem);

  if (config.allowDuplicatesWithinPack) {
    return config.slots.map((slot, i) => {
      const rarity = pickWeighted(
        eligibleRarities(slot.weights).map((r) => [r, slot.weights[r]!] as [Rarity, number]),
        rng,
      );
      const choices = pool.filter((c) => c.rarity === rarity);
      const card = choices[Math.floor(rng() * choices.length)];
      return { instanceId: newId('ci'), cardId: card.id, slot: i };
    });
  }
  return generateWithoutReplacement(config, rng, pool);
}

/**
 * Samples without replacement. Slots are filled most-constrained first; each
 * candidate is checked to keep the remaining slots feasible, so the result always
 * respects slot rules when validatePackConfig passes.
 */
function generateWithoutReplacement(config: PackConfig, rng: Rng, pool: Pool): CardInstance[] {
  const result: (CardInstance | null)[] = new Array(config.slots.length).fill(null);
  const used = new Set<string>();
  const order = config.slots
    .map((slot, i) => ({ i, n: pool.filter((c) => eligibleRarities(slot.weights).includes(c.rarity)).length }))
    .sort((a, b) => a.n - b.n)
    .map((x) => x.i);

  for (let k = 0; k < order.length; k++) {
    const slotIdx = order[k];
    const slot = config.slots[slotIdx];
    const remainingSlots = order.slice(k + 1).map((i) => config.slots[i]);
    const feasibleWith = (card: CardDefinition) => {
      const restPool = pool.filter((c) => !used.has(c.id) && c.id !== card.id);
      const sub: PackConfig = { ...config, slots: remainingSlots };
      return maxMatching(sub, restPool) === remainingSlots.length;
    };
    const rarityEntries = eligibleRarities(slot.weights)
      .filter((r) => pool.some((c) => c.rarity === r && !used.has(c.id) && feasibleWith(c)))
      .map((r) => [r, slot.weights[r]!] as [Rarity, number]);
    if (rarityEntries.length === 0) throw new PackConfigError('No feasible card for slot ' + (slotIdx + 1));
    const rarity = pickWeighted(rarityEntries, rng);
    const choices = pool.filter((c) => c.rarity === rarity && !used.has(c.id) && feasibleWith(c));
    const card = choices[Math.floor(rng() * choices.length)];
    used.add(card.id);
    result[slotIdx] = { instanceId: newId('ci'), cardId: card.id, slot: slotIdx };
  }
  return result as CardInstance[];
}

/**
 * Development showcase: all ten starter cards exactly once. Six non-legendary
 * cards shuffled into slots 1–6, three Legendaries shuffled into 7–9 and the
 * remaining Legendary in slot 10.
 */
export function generateShowcasePack(rng: Rng, pool: Pool = CARDS): CardInstance[] {
  const nonLegendary = shuffle(pool.filter((c) => c.rarity !== 'Legendary'), rng);
  const legendaries = shuffle(pool.filter((c) => c.rarity === 'Legendary'), rng);
  if (nonLegendary.length !== 6 || legendaries.length !== 4) {
    throw new PackConfigError('Showcase pack expects 6 non-legendary and 4 legendary definitions.');
  }
  return [...nonLegendary, ...legendaries].map((card, slot) => ({
    instanceId: newId('ci'),
    cardId: card.id,
    slot,
  }));
}

export function generatePack(mode: PackMode, rng: Rng): CardInstance[] {
  return mode === 'showcase' ? generateShowcasePack(rng) : generateFromConfig(PROTOTYPE_BOOSTER, rng);
}

/**
 * NEW flags: compare against the collection before the pack and track earlier
 * reveals in the same pack. Only the first copy of a previously unowned card is NEW.
 */
export function computeNewFlags(cards: readonly CardInstance[], ownedBefore: Readonly<Record<string, number>>): boolean[] {
  const seen = new Set<string>();
  return cards.map((c) => {
    const isNew = (ownedBefore[c.cardId] ?? 0) === 0 && !seen.has(c.cardId);
    seen.add(c.cardId);
    return isNew;
  });
}

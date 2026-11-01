import { describe, expect, it } from 'vitest';
import { CARDS, getCard } from '../src/data/cards';
import { PROTOTYPE_BOOSTER, type PackConfig } from '../src/domain/packConfig';
import {
  computeNewFlags,
  generateFromConfig,
  generatePack,
  generateShowcasePack,
  PackConfigError,
  validatePackConfig,
} from '../src/domain/packGenerator';
import { seededRng } from '../src/domain/random';

describe('card catalogue', () => {
  it('has exactly the ten starter cards with the specified rarities', () => {
    expect(CARDS).toHaveLength(10);
    expect(CARDS.map((c) => c.number)).toEqual(['001', '002', '003', '004', '005', '006', '007', '008', '009', '010']);
    expect(CARDS.filter((c) => c.rarity === 'Legendary').map((c) => c.name)).toEqual([
      'Twisted bow',
      'Scythe of Vitur',
      'Tumeken’s shadow',
      '3rd age pickaxe',
    ]);
    expect(getCard('infernal-cape').rarity).toBe('Rare');
    expect(getCard('tzkal-zuk').category).toBe('Boss');
  });
});

describe('prototype booster', () => {
  const packs = Array.from({ length: 2000 }, (_, i) => generatePack('prototype-booster', seededRng(i + 1)));

  it('always contains exactly ten card instances with unique instance ids', () => {
    for (const pack of packs) {
      expect(pack).toHaveLength(10);
      expect(new Set(pack.map((c) => c.instanceId)).size).toBe(10);
      expect(pack.map((c) => c.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('guarantees a Legendary in the final slot and only there', () => {
    for (const pack of packs) {
      expect(getCard(pack[9].cardId).rarity).toBe('Legendary');
      for (const c of pack.slice(0, 9)) expect(['Rare', 'Epic']).toContain(getCard(c.cardId).rarity);
    }
  });

  it('roughly follows 35% Rare / 65% Epic and uniform Legendary weights', () => {
    const early = packs.flatMap((p) => p.slice(0, 9));
    const rare = early.filter((c) => getCard(c.cardId).rarity === 'Rare').length / early.length;
    expect(rare).toBeGreaterThan(0.32);
    expect(rare).toBeLessThan(0.38);
    const legendaryCounts = new Map<string, number>();
    for (const p of packs) legendaryCounts.set(p[9].cardId, (legendaryCounts.get(p[9].cardId) ?? 0) + 1);
    expect(legendaryCounts.size).toBe(4);
    for (const n of legendaryCounts.values()) expect(n / packs.length).toBeGreaterThan(0.2);
  });

  it('chooses uniformly among Epic definitions after selecting the rarity', () => {
    const epics = packs.flatMap((p) => p.slice(0, 9)).filter((c) => getCard(c.cardId).rarity === 'Epic');
    const counts = new Map<string, number>();
    for (const c of epics) counts.set(c.cardId, (counts.get(c.cardId) ?? 0) + 1);
    expect(counts.size).toBe(5);
    for (const n of counts.values()) expect(n / epics.length).toBeCloseTo(0.2, 1);
  });
});

describe('showcase pack', () => {
  it('contains all ten unique cards with legendaries in slots 7–10', () => {
    for (let seed = 1; seed < 200; seed++) {
      const pack = generateShowcasePack(seededRng(seed));
      expect(pack).toHaveLength(10);
      expect(new Set(pack.map((c) => c.cardId)).size).toBe(10);
      pack.slice(0, 6).forEach((c) => expect(getCard(c.cardId).rarity).not.toBe('Legendary'));
      pack.slice(6).forEach((c) => expect(getCard(c.cardId).rarity).toBe('Legendary'));
    }
  });

  it('shuffles the order between packs', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) =>
        generateShowcasePack(seededRng(i))
          .map((c) => c.cardId)
          .join(),
      ),
    );
    expect(orders.size).toBeGreaterThan(10);
  });
});

describe('duplicate policy feasibility', () => {
  it('rejects a duplicate-free default booster with a clear error', () => {
    const config: PackConfig = { ...PROTOTYPE_BOOSTER, allowDuplicatesWithinPack: false };
    const problem = validatePackConfig(config);
    expect(problem).toMatch(/cannot be duplicate-free/);
    expect(problem).toMatch(/9 slot\(s\) need Epic\/Rare cards; 6 unique definition\(s\) exist/);
    expect(() => generateFromConfig(config, seededRng(1))).toThrow(PackConfigError);
  });

  it('samples without replacement when the configuration is feasible', () => {
    const config: PackConfig = {
      id: 'test',
      label: 'Feasible duplicate-free',
      allowDuplicatesWithinPack: false,
      slots: [
        ...Array.from({ length: 6 }, () => ({ weights: { Rare: 35, Epic: 65 } })),
        ...Array.from({ length: 4 }, () => ({ weights: { Legendary: 1 } })),
      ],
    };
    expect(validatePackConfig(config)).toBeNull();
    for (let seed = 1; seed < 100; seed++) {
      const pack = generateFromConfig(config, seededRng(seed));
      expect(new Set(pack.map((c) => c.cardId)).size).toBe(10);
      pack.slice(6).forEach((c) => expect(getCard(c.cardId).rarity).toBe('Legendary'));
    }
  });

  it('respects slot constraints when overlapping slots compete for cards', () => {
    const config: PackConfig = {
      id: 'tight',
      label: 'Tight',
      allowDuplicatesWithinPack: false,
      slots: [
        ...Array.from({ length: 5 }, () => ({ weights: { Epic: 1, Legendary: 1 } })),
        { weights: { Rare: 1 } },
        ...Array.from({ length: 4 }, () => ({ weights: { Legendary: 1, Epic: 1 } })),
      ],
    };
    expect(validatePackConfig(config)).toBeNull();
    for (let seed = 1; seed < 50; seed++) {
      const pack = generateFromConfig(config, seededRng(seed));
      expect(new Set(pack.map((c) => c.cardId)).size).toBe(10);
      expect(getCard(pack[5].cardId).rarity).toBe('Rare');
    }
  });

  it('rejects configurations with the wrong slot count', () => {
    expect(validatePackConfig({ ...PROTOTYPE_BOOSTER, slots: PROTOTYPE_BOOSTER.slots.slice(1) })).toMatch(/exactly 10/);
  });
});

describe('NEW flags', () => {
  const inst = (cardId: string, slot: number) => ({ instanceId: `i${slot}`, cardId, slot });
  it('marks only the first copy of a previously unowned card', () => {
    const pack = [inst('great-olm', 0), inst('great-olm', 1), inst('verzik-vitur', 2), inst('twisted-bow', 3)];
    expect(computeNewFlags(pack, { 'verzik-vitur': 2 })).toEqual([true, false, false, true]);
  });
});

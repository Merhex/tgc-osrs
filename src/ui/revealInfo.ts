import type { OpeningRecord } from '../persistence/repository';

/** Owned quantity right after the card at `index` was revealed (pre-pack snapshot + earlier copies). */
export function ownedAfterReveal(opening: OpeningRecord, index: number): number {
  const id = opening.cards[index].cardId;
  let n = opening.ownedBefore[id] ?? 0;
  for (let k = 0; k <= index; k++) if (opening.cards[k].cardId === id) n++;
  return n;
}

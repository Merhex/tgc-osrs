import type { Rarity } from '../data/cards';

const SYMBOL: Record<Rarity, string> = { Rare: '◆', Epic: '✦', Legendary: '★' };

/** Rarity always shown as text plus colour. */
export function RarityBadge({ rarity, size = 'md' }: { rarity: Rarity; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`rarity rarity--${rarity.toLowerCase()} rarity--${size}`}>
      <span aria-hidden="true">{SYMBOL[rarity]} </span>
      {rarity}
    </span>
  );
}

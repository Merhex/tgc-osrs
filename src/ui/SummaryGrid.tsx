import { useEffect, useRef } from 'react';
import { getCard } from '../data/cards';
import type { OpeningRecord } from '../persistence/repository';
import { useCardImage } from '../hooks/useCardImage';
import { RarityBadge } from './RarityBadge';
import { ownedAfterReveal } from './revealInfo';

function SummaryCard({ opening, index }: { opening: OpeningRecord; index: number }) {
  const inst = opening.cards[index];
  const card = getCard(inst.cardId);
  const url = useCardImage(inst.cardId);
  return (
    <li className={`summary-card summary-card--${card.rarity.toLowerCase()}`}>
      <div className="summary-card__img">{url ? <img src={url} alt="" /> : <div className="img-placeholder" />}</div>
      <div className="summary-card__info">
        <span className="summary-card__slot">#{index + 1}</span>
        <strong>{card.name}</strong>
        <RarityBadge rarity={card.rarity} size="sm" />
        {opening.newFlags[index] ? <span className="tag tag--new">NEW</span> : <span className="tag tag--dup">Duplicate</span>}
        <span className="summary-card__owned">Owned ×{ownedAfterReveal(opening, index)}</span>
      </div>
    </li>
  );
}

export function SummaryGrid({ opening, onOpenAnother, onViewCollection }: { opening: OpeningRecord; onOpenAnother: () => void; onViewCollection: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const newCount = opening.newFlags.filter(Boolean).length;
  return (
    <section className="summary panel" aria-labelledby="summary-title">
      <h2 id="summary-title" ref={heading} tabIndex={-1}>
        Pack summary
      </h2>
      <p className="summary__sub">
        {opening.mode === 'showcase' ? 'Development showcase pack · ' : ''}10 cards · {newCount} new
      </p>
      <ol className="summary__grid">
        {opening.cards.map((c, i) => (
          <SummaryCard key={c.instanceId} opening={opening} index={i} />
        ))}
      </ol>
      <div className="summary__actions">
        <button className="btn btn--primary" onClick={onOpenAnother}>
          Open Another Pack
        </button>
        <button className="btn" onClick={onViewCollection}>
          View Collection
        </button>
      </div>
    </section>
  );
}

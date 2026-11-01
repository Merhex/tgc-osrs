import type { CardDefinition } from '../data/cards';
import { RarityBadge } from './RarityBadge';

/** Accessible, readable card details (mirrors what is printed on the card). */
export function CardDetails({ card, owned, headingLevel = 2 }: { card: CardDefinition; owned?: number; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="card-details">
      <H className="card-details__name">{card.name}</H>
      <dl className="card-details__meta">
        <div>
          <dt>Set number</dt>
          <dd>{card.number} / 010</dd>
        </div>
        <div>
          <dt>Rarity</dt>
          <dd>
            <RarityBadge rarity={card.rarity} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{card.category}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{card.source}</dd>
        </div>
        {owned !== undefined && (
          <div>
            <dt>Owned</dt>
            <dd>×{owned}</dd>
          </div>
        )}
      </dl>
      <p className="card-details__desc">{card.description}</p>
      <div className="card-details__ability">
        <span className="card-details__ability-label">Prototype ability (concept only)</span>
        <strong>{card.ability.name}</strong> — {card.ability.text}
      </div>
    </div>
  );
}

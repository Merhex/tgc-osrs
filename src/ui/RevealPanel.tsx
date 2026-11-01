import { getCard } from '../data/cards';
import type { OpeningRecord } from '../persistence/repository';
import { RarityBadge } from './RarityBadge';
import { ownedAfterReveal } from './revealInfo';

interface Props {
  opening: OpeningRecord;
  index: number;
  busy: boolean;
  onNext: () => void;
}

export function RevealPanel({ opening, index, busy, onNext }: Props) {
  const instance = opening.cards[index];
  const card = getCard(instance.cardId);
  const isNew = opening.newFlags[index];
  const owned = ownedAfterReveal(opening, index);
  const last = index === opening.cards.length - 1;
  return (
    <section className={`reveal-panel panel ${busy ? 'reveal-panel--busy' : ''}`} aria-label="Revealed card">
      <p className="reveal-panel__count">
        Card {index + 1} of {opening.cards.length}
      </p>
      <div aria-live="polite" aria-atomic="true" className="reveal-panel__body">
        {busy ? (
          <p className="reveal-panel__waiting">Revealing…</p>
        ) : (
          <>
            {card.rarity === 'Legendary' && (
              <p className="legendary-banner" style={{ ['--accent' as string]: card.frame.accent, ['--accent2' as string]: card.frame.accent2 }}>
                ★ Legendary ★
              </p>
            )}
            <h2 className="reveal-panel__name">{card.name}</h2>
            <p className="reveal-panel__meta">
              <RarityBadge rarity={card.rarity} /> · {card.category} · {card.source}
            </p>
            <p className="reveal-panel__status">
              {isNew ? <span className="tag tag--new">NEW</span> : <span className="tag tag--dup">Duplicate</span>}{' '}
              <span>Owned ×{owned}</span>
            </p>
            <p className="reveal-panel__ability">
              <span className="sr-only">Prototype ability: </span>
              <strong>{card.ability.name}</strong> — {card.ability.text}
            </p>
          </>
        )}
      </div>
      <button className="btn btn--primary" onClick={onNext} disabled={busy} aria-keyshortcuts="Enter Space ArrowRight">
        {last ? 'See summary' : 'Next card'}
      </button>
      <p className="hint">Tap the card or press Enter to continue.</p>
    </section>
  );
}

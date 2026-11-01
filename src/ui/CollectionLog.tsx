import { useMemo, useRef, useState } from 'react';
import { CARDS, CATEGORIES, RARITIES, type CardDefinition, type Category, type Rarity } from '../data/cards';
import type { Stats } from '../persistence/repository';
import { useCardImage } from '../hooks/useCardImage';
import { InspectDialog } from './InspectDialog';
import { RarityBadge } from './RarityBadge';

interface Props {
  collection: Record<string, number>;
  stats: Stats;
  reducedMotion: boolean;
  canReset: boolean;
  onReset: () => Promise<void>;
}

function Entry({ card, owned, onInspect }: { card: CardDefinition; owned: number; onInspect: () => void }) {
  const url = useCardImage(card.id);
  const has = owned > 0;
  return (
    <li className={`log-entry ${has ? 'log-entry--owned' : 'log-entry--missing'}`}>
      <button
        className="log-entry__btn"
        onClick={onInspect}
        disabled={!has}
        aria-label={
          has
            ? `${card.number} ${card.name}, ${card.rarity}, owned ×${owned}. Inspect.`
            : `${card.number} ${card.name}, ${card.rarity}, not yet collected.`
        }
      >
        <span className="log-entry__img">{url ? <img src={url} alt="" /> : <span className="img-placeholder" />}</span>
        <span className="log-entry__num">{card.number}</span>
        <span className="log-entry__name">{card.name}</span>
        <RarityBadge rarity={card.rarity} size="sm" />
        <span className="log-entry__qty">{has ? `×${owned}` : 'Not collected'}</span>
      </button>
    </li>
  );
}

export function CollectionLog({ collection, stats, reducedMotion, canReset, onReset }: Props) {
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [inspect, setInspect] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);

  const unique = CARDS.filter((c) => (collection[c.id] ?? 0) > 0).length;
  const filtered = useMemo(
    () => CARDS.filter((c) => (rarity === 'all' || c.rarity === rarity) && (category === 'all' || c.category === category)),
    [rarity, category],
  );

  return (
    <section className="collection panel" aria-labelledby="log-title">
      <header className="collection__head">
        <h2 id="log-title">Collection Log</h2>
        <p className="collection__set">Legends of Gielinor — Volume I</p>
        <dl className="collection__stats">
          <div>
            <dt>Unique</dt>
            <dd className={unique === CARDS.length ? 'complete' : ''}>
              {unique} / {CARDS.length}
            </dd>
          </div>
          <div>
            <dt>Total copies</dt>
            <dd>{stats.totalCopies}</dd>
          </div>
          <div>
            <dt>Packs opened</dt>
            <dd>{stats.packsOpened}</dd>
          </div>
        </dl>
        <div
          className="progress"
          role="progressbar"
          aria-label="Unique cards collected"
          aria-valuemin={0}
          aria-valuemax={CARDS.length}
          aria-valuenow={unique}
        >
          <span style={{ width: `${(unique / CARDS.length) * 100}%` }} />
        </div>
      </header>

      <div className="collection__filters" role="group" aria-label="Filters">
        <label>
          Rarity
          <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | 'all')}>
            <option value="all">All rarities</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'all')}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="collection__count" aria-live="polite">
          Showing {filtered.length} of {CARDS.length}
        </span>
      </div>

      <ul className="collection__grid">
        {filtered.map((c) => (
          <Entry key={c.id} card={c} owned={collection[c.id] ?? 0} onInspect={() => setInspect(c.id)} />
        ))}
      </ul>
      {filtered.length === 0 && <p className="hint">No cards match these filters.</p>}

      <div className="collection__legend">
        {RARITIES.map((r) => (
          <RarityBadge key={r} rarity={r} size="sm" />
        ))}
        <span className="hint">Rarities are prototype settings for this fan game, not OSRS drop rates.</span>
      </div>

      <details className="dev-tools">
        <summary>Development tools</summary>
        <p>Reset clears all collected cards, opening history and statistics on this device. Settings are kept.</p>
        <button className="btn btn--danger" disabled={!canReset} onClick={() => confirmRef.current?.showModal()}>
          Reset collection…
        </button>
        {!canReset && <p className="hint">Finish the current pack before resetting.</p>}
        {resetError && (
          <p role="alert" className="error-box">
            {resetError}
          </p>
        )}
      </details>

      <dialog ref={confirmRef} className="panel confirm" aria-labelledby="confirm-title">
        <h3 id="confirm-title">Reset collection?</h3>
        <p>This permanently removes every collected card and the pack history from this device.</p>
        <form method="dialog" className="controls__row">
          <button className="btn" value="cancel" autoFocus>
            Cancel
          </button>
          <button
            className="btn btn--danger"
            value="reset"
            onClick={() => {
              setResetError(null);
              onReset().catch((err) => setResetError(err instanceof Error ? err.message : String(err)));
            }}
          >
            Reset
          </button>
        </form>
      </dialog>

      {inspect && (
        <InspectDialog cardId={inspect} owned={collection[inspect] ?? 0} reducedMotion={reducedMotion} onClose={() => setInspect(null)} />
      )}
    </section>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { getCard } from '../data/cards';
import { useCardImage } from '../hooks/useCardImage';
import { hasWebGL } from '../hooks/webgl';
import { CardDetails } from './CardDetails';

const InspectStage = lazy(() => import('../three/InspectStage'));

export function InspectDialog({ cardId, owned, reducedMotion, onClose }: { cardId: string; owned: number; reducedMotion: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [showBack, setShowBack] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const card = getCard(cardId);
  const face = useCardImage(cardId);
  const back = useCardImage('back');
  const webgl = hasWebGL();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // No close() on cleanup: removing the element closes it, and an explicit close would fire onClose.
  }, []);

  return (
    <dialog ref={ref} className="inspect panel" aria-labelledby="inspect-title" onClose={onClose} onCancel={onClose}>
      <div className="inspect__layout">
        <div className="inspect__view">
          {webgl ? (
            <Suspense fallback={<div className="inspect-stage">Loading…</div>}>
              <InspectStage cardId={cardId} showBack={showBack} resetToken={resetToken} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <div className="inspect-stage inspect-stage--2d">{(showBack ? back : face) && <img src={(showBack ? back : face)!} alt={showBack ? 'Card back' : `${card.name} card front`} />}</div>
          )}
          <div className="controls__row">
            <button className="btn" onClick={() => setShowBack((b) => !b)} aria-pressed={showBack}>
              {showBack ? 'Show front' : 'Show back'}
            </button>
            {webgl && (
              <button className="btn" onClick={() => setResetToken((n) => n + 1)}>
                Reset view
              </button>
            )}
          </div>
        </div>
        <div className="inspect__details" id="inspect-title">
          <CardDetails card={card} owned={owned} />
        </div>
      </div>
      <button className="btn inspect__close" onClick={() => ref.current?.close()} aria-label="Close card inspection">
        ✕
      </button>
    </dialog>
  );
}

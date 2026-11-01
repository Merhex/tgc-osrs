import { useEffect, useState } from 'react';
import { getCard } from '../data/cards';
import { useCardImage } from '../hooks/useCardImage';
import type { Phase } from '../opening/machine';
import type { OpeningRecord } from '../persistence/repository';
import { packFrontUrl } from '../render/imageStore';

interface Props {
  phase: Phase;
  opening: OpeningRecord | null;
  revealIndex: number;
  reducedMotion: boolean;
  skipToken: number;
  onOpened: () => void;
  onCardShown: () => void;
  onAdvance: () => void;
}

/** 2D presentation used when WebGL is unavailable. Same state machine, simpler visuals. */
export default function Fallback2D({ phase, opening, revealIndex, reducedMotion, skipToken, onOpened, onCardShown, onAdvance }: Props) {
  const [pack, setPack] = useState<string | null>(null);
  useEffect(() => {
    packFrontUrl()
      .then(setPack)
      .catch(() => setPack(null));
  }, []);

  useEffect(() => {
    if (phase !== 'opening') return;
    const t = setTimeout(onOpened, reducedMotion ? 300 : 1600);
    return () => clearTimeout(t);
  }, [phase, reducedMotion, onOpened]);
  useEffect(() => {
    if (skipToken > 0 && phase === 'opening') onOpened();
  }, [skipToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fallback-stage">
      <p className="fallback-stage__note" role="note">
        3D view unavailable (WebGL is disabled or unsupported). Showing the simplified 2D version.
      </p>
      {(phase === 'sealed' || phase === 'preparing' || phase === 'opening') && (
        <div className={`fallback-pack ${phase === 'opening' ? 'fallback-pack--opening' : ''}`}>
          {pack ? <img src={pack} alt="Sealed Legends & Loot booster pack" /> : <div className="img-placeholder" />}
          <div className="fallback-pack__strip" aria-hidden="true" />
        </div>
      )}
      {phase === 'revealing' && opening && (
        <FallbackCard
          key={revealIndex}
          cardId={opening.cards[revealIndex].cardId}
          onShown={onCardShown}
          onClick={onAdvance}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

function FallbackCard({
  cardId,
  onShown,
  onClick,
  reducedMotion,
}: {
  cardId: string;
  onShown: () => void;
  onClick: () => void;
  reducedMotion: boolean;
}) {
  const face = useCardImage(cardId);
  const back = useCardImage('back');
  const card = getCard(cardId);
  useEffect(() => {
    if (!face) return;
    const t = setTimeout(onShown, reducedMotion ? 50 : card.rarity === 'Legendary' ? 1400 : 650);
    return () => clearTimeout(t);
  }, [face]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button
      className={`fallback-card ${face ? 'fallback-card--flip' : ''} ${card.rarity === 'Legendary' ? 'fallback-card--legendary' : ''}`}
      onClick={onClick}
      aria-label={`${card.name}. Activate to continue.`}
    >
      <span className="fallback-card__inner">
        <span className="fallback-card__back">{back && <img src={back} alt="" />}</span>
        <span className="fallback-card__face">{face && <img src={face} alt="" />}</span>
      </span>
    </button>
  );
}

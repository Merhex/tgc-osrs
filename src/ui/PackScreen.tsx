import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { play, type SoundName } from '../audio/sound';
import { getCard } from '../data/cards';
import type { Controller } from '../opening/useOpeningController';
import { hasWebGL } from '../hooks/webgl';
import { RevealPanel } from './RevealPanel';
import { SummaryGrid } from './SummaryGrid';
import Fallback2D from './Fallback2D';

const Stage = lazy(() => import('../three/Stage'));

interface Props {
  ctl: Controller;
  reducedMotion: boolean;
  onViewCollection: () => void;
}

export function PackScreen({ ctl, reducedMotion, onViewCollection }: Props) {
  const { state } = ctl;
  const [skipToken, setSkipToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [rotateToken, setRotateToken] = useState({ dx: 0, dy: 0, n: 0 });
  const webgl = hasWebGL();

  const onSound = useCallback((s: string) => play(s as SoundName), []);
  const { advance, cardShown, openingFinished } = ctl;
  const busyRef = state.cardBusy;

  // Keyboard: Enter / Space / → advance while revealing (unless a button has focus, which handles it).
  useEffect(() => {
    if (state.phase !== 'revealing') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('button, input, select, textarea, a, [role="dialog"]')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, advance]);

  const rotate = (dx: number, dy = 0) => setRotateToken((t) => ({ dx, dy, n: t.n + 1 }));
  const current = state.opening && state.phase === 'revealing' ? getCard(state.opening.cards[state.revealIndex].cardId) : null;

  const stageLabel =
    state.phase === 'sealed'
      ? 'Sealed Legends & Loot booster pack. Drag or use arrow keys to rotate.'
      : state.phase === 'revealing' && current
        ? `Card ${state.revealIndex + 1} of 10${busyRef ? '' : `: ${current.name}`}`
        : 'Booster pack';

  const stageProps = {
    phase: state.phase,
    opening: state.opening,
    revealIndex: state.revealIndex,
    reducedMotion,
    skipToken,
    onOpened: openingFinished,
    onCardShown: cardShown,
    onAdvance: advance,
  };

  if (state.phase === 'summary' && state.opening) {
    return (
      <SummaryGrid
        opening={state.opening}
        onOpenAnother={() => void ctl.finish()}
        onViewCollection={() => void ctl.finish().then(onViewCollection)}
      />
    );
  }

  return (
    <div className={`pack-screen pack-screen--${state.phase}`}>
      <div className="pack-screen__stage">
        {webgl ? (
          <Suspense fallback={<div className="stage stage--loading">Loading 3D scene…</div>}>
            <Stage {...stageProps} resetToken={resetToken} rotateToken={rotateToken} onSound={onSound} label={stageLabel} />
          </Suspense>
        ) : (
          <Fallback2D {...stageProps} />
        )}
        {state.mode === 'showcase' && state.phase !== 'revealing' && <div className="dev-ribbon">Development showcase pack</div>}
      </div>

      <div className="pack-screen__controls">
        {state.phase === 'sealed' && (
          <section className="panel controls" aria-label="Pack controls">
            <fieldset className="mode-select">
              <legend>Pack type</legend>
              <label>
                <input
                  type="radio"
                  name="mode"
                  checked={state.mode === 'prototype-booster'}
                  onChange={() => ctl.setMode('prototype-booster')}
                />
                Prototype Booster <small>(9 Rare/Epic + guaranteed Legendary)</small>
              </label>
              <label>
                <input type="radio" name="mode" checked={state.mode === 'showcase'} onChange={() => ctl.setMode('showcase')} />
                Development Showcase <small>(all 10 cards once — for review)</small>
              </label>
            </fieldset>
            {webgl && (
              <div className="controls__row" role="group" aria-label="Rotate pack">
                <button className="btn btn--icon" onClick={() => rotate(-0.6)} aria-label="Rotate pack left">
                  ⟲
                </button>
                <button className="btn" onClick={() => setResetToken((n) => n + 1)}>
                  Reset View
                </button>
                <button className="btn btn--icon" onClick={() => rotate(0.6)} aria-label="Rotate pack right">
                  ⟳
                </button>
              </div>
            )}
            <button className="btn btn--primary btn--large" onClick={ctl.openPack}>
              Open Pack
            </button>
            {webgl && <p className="hint">Drag or swipe the pack to inspect it. Arrow keys rotate when it has focus.</p>}
          </section>
        )}

        {state.phase === 'preparing' && (
          <section className="panel controls" aria-live="assertive">
            {state.commitError ? (
              <div role="alert" className="error-box">
                <strong>Could not save your pack.</strong>
                <p>{state.commitError}</p>
                <p>Nothing has been revealed yet. Retrying uses the same pack contents, so cards cannot be lost or duplicated.</p>
                <div className="controls__row">
                  <button className="btn btn--primary" onClick={ctl.retryCommit}>
                    Retry
                  </button>
                  <button className="btn" onClick={ctl.abandonPrepare}>
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <p className="status">Preparing pack…</p>
            )}
          </section>
        )}

        {state.phase === 'opening' && (
          <section className="panel controls" aria-label="Opening">
            <p className="status" aria-live="polite">
              Opening pack…
            </p>
            <button className="btn" onClick={() => setSkipToken((n) => n + 1)}>
              Skip Animation
            </button>
          </section>
        )}

        {state.phase === 'revealing' && state.opening && (
          <>
            {state.resumed && <p className="resume-note">Resumed your unfinished pack.</p>}
            <RevealPanel opening={state.opening} index={state.revealIndex} busy={state.cardBusy} onNext={advance} />
          </>
        )}
      </div>
    </div>
  );
}

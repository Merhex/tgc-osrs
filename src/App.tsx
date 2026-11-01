import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { devToolsEnabled, labRequested } from './dev/devFlags';
import { setMuted, unlockAudio, play } from './audio/sound';
import { useOpeningController } from './opening/useOpeningController';
import { useReducedMotion } from './hooks/useReducedMotion';
import { PackScreen } from './ui/PackScreen';
import { CollectionLog } from './ui/CollectionLog';

type View = 'packs' | 'collection';

const DevLab = lazy(() => import('./dev/DevLab'));

export default function Root() {
  if (labRequested())
    return (
      <Suspense fallback={<p className="status">Loading dev lab…</p>}>
        <DevLab />
      </Suspense>
    );
  return <App />;
}

function App() {
  const ctl = useOpeningController();
  const [view, setView] = useState<View>('packs');
  const reducedMotion = useReducedMotion(ctl.settings.reducedMotion);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => setMuted(ctl.settings.muted), [ctl.settings.muted]);

  // Audio is unlocked only by a real user gesture.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const go = (v: View) => {
    if (v === view) return;
    // Leaving mid-animation finishes the cosmetic opening; cards are already saved.
    if (v !== 'packs' && ctl.state.phase === 'opening') ctl.openingFinished();
    setView(v);
    play('click');
    requestAnimationFrame(() => mainRef.current?.focus());
  };

  const { phase } = ctl.state;
  const inProgress = phase === 'preparing' || phase === 'opening' || phase === 'revealing' || phase === 'summary';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <h1 className="brand__title">Gielinor: Legends &amp; Loot</h1>
            <p className="brand__sub">Legends of Gielinor — Volume I</p>
          </div>
        </div>
        <nav aria-label="Main" className="tabs">
          <button
            className={`tab ${view === 'packs' ? 'tab--active' : ''}`}
            aria-current={view === 'packs' ? 'page' : undefined}
            onClick={() => go('packs')}
          >
            Open Packs{inProgress && view !== 'packs' ? ' •' : ''}
          </button>
          <button
            className={`tab ${view === 'collection' ? 'tab--active' : ''}`}
            aria-current={view === 'collection' ? 'page' : undefined}
            onClick={() => go('collection')}
          >
            Collection Log
          </button>
        </nav>
        <div className="settings" role="group" aria-label="Settings">
          <button
            className="btn btn--small"
            aria-pressed={!ctl.settings.muted}
            onClick={() => ctl.updateSettings({ muted: !ctl.settings.muted })}
          >
            {ctl.settings.muted ? '🔇 Sound off' : '🔊 Sound on'}
          </button>
          <label className="select-small">
            <span>Motion</span>
            <select
              value={ctl.settings.reducedMotion}
              onChange={(e) => ctl.updateSettings({ reducedMotion: e.target.value as 'system' | 'on' | 'off' })}
            >
              <option value="system">System</option>
              <option value="on">Reduced</option>
              <option value="off">Full</option>
            </select>
          </label>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        {ctl.loadError ? (
          <section className="panel error-box" role="alert">
            <h2>Storage unavailable</h2>
            <p>{ctl.loadError}</p>
            <p>Your collection is stored in this browser (IndexedDB). Private browsing or blocked storage can prevent saving.</p>
            <button className="btn btn--primary" onClick={ctl.reload}>
              Retry
            </button>
          </section>
        ) : phase === 'loading' ? (
          <p className="status panel">Loading collection…</p>
        ) : view === 'packs' ? (
          <PackScreen ctl={ctl} reducedMotion={reducedMotion} onViewCollection={() => go('collection')} />
        ) : (
          <CollectionLog
            collection={ctl.collection}
            stats={ctl.stats}
            reducedMotion={reducedMotion}
            canReset={phase === 'sealed'}
            onReset={ctl.resetCollection}
          />
        )}
        {ctl.progressError && (
          <p className="toast" role="status">
            {ctl.progressError}
          </p>
        )}
      </main>

      <footer className="footer">
        <span>Unofficial fan project; not affiliated with Jagex.</span>
        <span>Card rarities and odds are prototype settings for this fan game.</span>
        {devToolsEnabled() && (
          <a href={`?${import.meta.env.DEV ? '' : 'dev&'}lab`} className="footer__dev">
            Dev lab
          </a>
        )}
      </footer>
    </div>
  );
}

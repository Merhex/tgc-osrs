import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CARDS, RARITIES, type Rarity } from '../data/cards';
import { tuning } from '../three/tuning';

const InspectStage = lazy(() => import('../three/InspectStage'));
const LabPackStage = lazy(() => import('./LabPackStage'));

type NumKey = 'roughness' | 'clearcoat' | 'envIntensity' | 'holo' | 'foilScale' | 'keyLightX' | 'keyLightY';
const SLIDERS: { key: NumKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'roughness', label: 'Roughness (×)', min: 0.3, max: 2, step: 0.05 },
  { key: 'clearcoat', label: 'Clearcoat', min: 0, max: 1, step: 0.05 },
  { key: 'envIntensity', label: 'Environment intensity', min: 0, max: 3, step: 0.05 },
  { key: 'holo', label: 'Holographic intensity', min: 0, max: 2.5, step: 0.05 },
  { key: 'foilScale', label: 'Foil pattern scale', min: 0.4, max: 3, step: 0.05 },
  { key: 'keyLightX', label: 'Key light X', min: -4, max: 4, step: 0.1 },
  { key: 'keyLightY', label: 'Key light Y', min: -1, max: 5, step: 0.1 },
];

/**
 * Development-only material and animation lab. Every control is cosmetic: replays
 * use an in-memory pack and never create collection transactions.
 */
export default function DevLab() {
  const params = new URLSearchParams(location.search);
  const [mode, setMode] = useState<'card' | 'pack'>(params.get('mode') === 'pack' ? 'pack' : 'card');
  const [cardId, setCardId] = useState(params.get('card') ?? CARDS[6].id);
  const [rarity, setRarity] = useState<Rarity | 'auto'>((params.get('rarity') as Rarity) ?? 'auto');
  const [values, setValues] = useState(() => ({ ...tuning }));
  const [fixed, setFixed] = useState(params.has('yaw'));
  const [yaw, setYaw] = useState(Number(params.get('yaw') ?? 0));
  const [pitch, setPitch] = useState(Number(params.get('pitch') ?? 0));
  const [showBack, setShowBack] = useState(false);
  const [reset, setReset] = useState(0);
  const [run, setRun] = useState(0);
  const [camera, setCamera] = useState<'front' | 'close' | 'side'>((params.get('cam') as 'close') ?? 'front');
  const [speed, setSpeed] = useState(Number(params.get('speed') ?? 1));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    tuning.rarityOverride = rarity === 'auto' ? null : rarity;
  }, [rarity]);
  useEffect(() => () => void (tuning.rarityOverride = null), []);

  const set = (key: NumKey, v: number) => {
    tuning[key] = v;
    setValues((s) => ({ ...s, [key]: v }));
  };

  // Track timeline progress for the scrubber.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (tl.current) setProgress(tl.current.progress());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onTimeline = (t: gsap.core.Timeline | null) => {
    tl.current = t;
    if (!t) return;
    t.timeScale(speed);
    const at = params.get('at');
    if (at !== null) t.pause(Number(at));
    else if (paused) t.pause();
  };

  return (
    <div className="lab">
      <div className="lab__view">
        <Suspense fallback={<p className="status">Loading…</p>}>
          {mode === 'card' ? (
            <InspectStage cardId={cardId} showBack={showBack} resetToken={reset} reducedMotion={false} fixedTilt={fixed ? { yaw, pitch } : null} />
          ) : (
            <LabPackStage run={run} onTimeline={onTimeline} camera={camera} />
          )}
        </Suspense>
      </div>
      <aside className="lab__panel panel" aria-label="Development material and animation panel">
        <h2>Dev lab</h2>
        <p className="hint">Development only. Changes are cosmetic and never saved.</p>
        <div className="controls__row">
          <button className="btn btn--small" aria-pressed={mode === 'card'} onClick={() => setMode('card')}>
            Card materials
          </button>
          <button className="btn btn--small" aria-pressed={mode === 'pack'} onClick={() => setMode('pack')}>
            Pack opening
          </button>
        </div>

        {mode === 'card' && (
          <>
            <label className="lab__field">
              Card
              <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                {CARDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} {c.name} ({c.rarity})
                  </option>
                ))}
              </select>
            </label>
            <label className="lab__field">
              Rarity finish preview
              <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | 'auto')}>
                <option value="auto">Card's own rarity</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="lab__check">
              <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} /> Fixed angle
            </label>
            {fixed && (
              <>
                <label className="lab__field">
                  Yaw {yaw.toFixed(2)}
                  <input type="range" min={-0.9} max={0.9} step={0.01} value={yaw} onChange={(e) => setYaw(Number(e.target.value))} />
                </label>
                <label className="lab__field">
                  Pitch {pitch.toFixed(2)}
                  <input type="range" min={-0.7} max={0.7} step={0.01} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} />
                </label>
              </>
            )}
            <div className="controls__row">
              <button className="btn btn--small" onClick={() => setShowBack((b) => !b)}>
                {showBack ? 'Front' : 'Back'}
              </button>
              <button className="btn btn--small" onClick={() => setReset((n) => n + 1)}>
                Reset view
              </button>
            </div>
          </>
        )}

        {mode === 'pack' && (
          <>
            <div className="controls__row">
              <button
                className="btn btn--small btn--primary"
                onClick={() => {
                  setPaused(false);
                  setRun((n) => n + 1);
                }}
              >
                Replay opening
              </button>
              <button
                className="btn btn--small"
                onClick={() => {
                  const t = tl.current;
                  if (!t) return;
                  if (t.paused()) t.play();
                  else t.pause();
                  setPaused(t.paused());
                }}
              >
                {paused ? 'Play' : 'Pause'}
              </button>
            </div>
            <label className="lab__field">
              Opening progress {(progress * 100).toFixed(0)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={progress}
                onChange={(e) => {
                  const t = tl.current;
                  if (!t) return;
                  t.pause();
                  setPaused(true);
                  t.progress(Number(e.target.value));
                }}
              />
            </label>
            <label className="lab__field">
              Playback speed
              <select
                value={speed}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSpeed(v);
                  tl.current?.timeScale(v);
                }}
              >
                <option value={1}>1× (normal)</option>
                <option value={0.5}>0.5×</option>
                <option value={0.25}>0.25× slow motion</option>
                <option value={0.1}>0.1×</option>
              </select>
            </label>
            <label className="lab__field">
              Camera
              <select value={camera} onChange={(e) => setCamera(e.target.value as 'front')}>
                <option value="front">Front (player view)</option>
                <option value="close">Close-up on seal</option>
                <option value="side">Three-quarter</option>
              </select>
            </label>
          </>
        )}

        <h3>Material & lighting</h3>
        {SLIDERS.map((s) => (
          <label key={s.key} className="lab__field">
            {s.label} {values[s.key].toFixed(2)}
            <input type="range" min={s.min} max={s.max} step={s.step} value={values[s.key]} onChange={(e) => set(s.key, Number(e.target.value))} />
          </label>
        ))}
        <a className="btn btn--small" href={location.pathname + (import.meta.env.DEV ? '' : '?dev')}>
          Back to app
        </a>
      </aside>
    </div>
  );
}

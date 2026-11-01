import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { generatePack } from '../domain/packGenerator';
import { newId, cryptoRng } from '../domain/random';
import {
  DEFAULT_SETTINGS,
  pendingDraftStore,
  Repository,
  type OpeningDraft,
  type Settings,
  type Stats,
} from '../persistence/repository';
import { hasWebGL } from '../hooks/webgl';
import { durableRevealIndex, initialOpeningState, openingReducer } from './machine';

export interface Controller {
  state: ReturnType<typeof openingReducer>;
  collection: Record<string, number>;
  stats: Stats;
  settings: Settings;
  loadError: string | null;
  progressError: string | null;
  openPack: () => void;
  retryCommit: () => void;
  abandonPrepare: () => void;
  openingFinished: () => void;
  cardShown: () => void;
  advance: () => void;
  finish: () => Promise<void>;
  setMode: (mode: 'prototype-booster' | 'showcase') => void;
  updateSettings: (s: Partial<Settings>) => void;
  resetCollection: () => Promise<void>;
  reload: () => void;
}

const repo = new Repository();

/** Loads textures in parallel with the commit (the 3D module is loaded lazily). */
function preload(cardIds: string[]): Promise<void> {
  if (!hasWebGL()) return Promise.resolve();
  return import('../render/textureStore').then((m) => m.preloadOpening(cardIds)).catch(() => undefined);
}

function message(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function useOpeningController(): Controller {
  const [state, dispatch] = useReducer(openingReducer, initialOpeningState);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Stats>({ packsOpened: 0, totalCopies: 0 });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [loadToken, setLoadToken] = useState(0);
  const committing = useRef(false);

  const refreshSnapshot = useCallback(async () => {
    const snap = await repo.load();
    setCollection(snap.collection);
    setStats(snap.stats);
    return snap;
  }, []);

  // Initial load, including recovery of a pack that was generated but not yet committed.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pending = pendingDraftStore.load();
        if (pending) {
          await repo.commitOpening(pending); // idempotent: never awards twice
          pendingDraftStore.clear();
        }
        const snap = await refreshSnapshot();
        if (!alive) return;
        setSettings(snap.settings);
        setLoadError(null);
        dispatch({ type: 'LOADED', opening: snap.activeOpening });
      } catch (err) {
        if (alive) setLoadError(message(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshSnapshot, loadToken]);

  const commit = useCallback(
    async (draft: OpeningDraft) => {
      if (committing.current) return;
      committing.current = true;
      try {
        // Contents are fixed before anything is shown; textures load in parallel.
        const [record] = await Promise.all([repo.commitOpening(draft), preload(draft.cards.map((c) => c.cardId))]);
        pendingDraftStore.clear();
        await refreshSnapshot().catch(() => undefined);
        dispatch({ type: 'COMMIT_SUCCEEDED', opening: record });
      } catch (err) {
        dispatch({ type: 'COMMIT_FAILED', error: message(err) });
      } finally {
        committing.current = false;
      }
    },
    [refreshSnapshot],
  );

  const openPack = useCallback(() => {
    if (state.phase !== 'sealed') return;
    // Reuse an uncommitted draft if one exists so a failed attempt cannot be rerolled.
    const draft: OpeningDraft = pendingDraftStore.load() ?? {
      id: newId('op'),
      mode: state.mode,
      createdAt: Date.now(),
      cards: generatePack(state.mode, cryptoRng()),
    };
    pendingDraftStore.save(draft);
    dispatch({ type: 'OPEN_REQUESTED', draft });
    void commit(draft);
  }, [state.phase, state.mode, commit]);

  const retryCommit = useCallback(() => {
    if (state.phase !== 'preparing' || !state.draft) return;
    dispatch({ type: 'RETRY_COMMIT' });
    void commit(state.draft);
  }, [state.phase, state.draft, commit]);

  // Persist reveal progress (cosmetic animation state is never persisted).
  const savedIndex = useRef<string>('');
  useEffect(() => {
    const op = state.opening;
    if (!op || (state.phase !== 'revealing' && state.phase !== 'summary')) return;
    const idx = durableRevealIndex(state);
    const key = `${op.id}:${idx}`;
    if (savedIndex.current === key) return;
    savedIndex.current = key;
    repo
      .saveRevealProgress(op.id, idx)
      .then(() => setProgressError(null))
      .catch((err) => setProgressError(`${message(err)} Your cards are safe; only the reveal position was not saved.`));
  }, [state]);

  const finish = useCallback(async () => {
    const op = state.opening;
    if (state.phase !== 'summary' || !op) return;
    try {
      await repo.completeOpening(op.id);
      setProgressError(null);
    } catch (err) {
      setProgressError(`${message(err)} The pack is in your collection; it may reappear as a summary after reload.`);
    }
    dispatch({ type: 'FINISH' });
    await refreshSnapshot().catch(() => undefined);
  }, [state.phase, state.opening, refreshSnapshot]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      repo.saveSettings(next).catch(() => undefined);
      return next;
    });
  }, []);

  const resetCollection = useCallback(async () => {
    await repo.resetCollection();
    pendingDraftStore.clear();
    await refreshSnapshot();
  }, [refreshSnapshot]);

  return {
    state,
    collection,
    stats,
    settings,
    loadError,
    progressError,
    openPack,
    retryCommit,
    abandonPrepare: () => dispatch({ type: 'ABANDON_PREPARE' }),
    openingFinished: () => dispatch({ type: 'OPENING_FINISHED' }),
    cardShown: () => dispatch({ type: 'CARD_SHOWN' }),
    advance: () => dispatch({ type: 'ADVANCE' }),
    finish,
    setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
    updateSettings,
    resetCollection,
    reload: () => {
      setLoadError(null);
      setLoadToken((n) => n + 1);
    },
  };
}

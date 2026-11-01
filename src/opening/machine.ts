import { PACK_SIZE, type PackMode } from '../domain/packConfig';
import type { OpeningDraft, OpeningRecord } from '../persistence/repository';

/**
 * Explicit opening flow:
 *   loading → sealed → preparing → opening → revealing → summary → sealed
 * Durable state (the committed OpeningRecord) is kept separate from cosmetic
 * state (whether a card animation is running).
 */
export type Phase = 'loading' | 'sealed' | 'preparing' | 'opening' | 'revealing' | 'summary';

export interface OpeningState {
  phase: Phase;
  mode: PackMode;
  draft: OpeningDraft | null;
  opening: OpeningRecord | null;
  /** Index of the face-up card while revealing. */
  revealIndex: number;
  /** True while a card flip/move animation runs; input is ignored meanwhile. */
  cardBusy: boolean;
  /** True when the opening was restored after a refresh. */
  resumed: boolean;
  commitError: string | null;
}

export type OpeningEvent =
  | { type: 'LOADED'; opening: OpeningRecord | null }
  | { type: 'SET_MODE'; mode: PackMode }
  | { type: 'OPEN_REQUESTED'; draft: OpeningDraft }
  | { type: 'COMMIT_SUCCEEDED'; opening: OpeningRecord }
  | { type: 'COMMIT_FAILED'; error: string }
  | { type: 'RETRY_COMMIT' }
  | { type: 'ABANDON_PREPARE' }
  | { type: 'OPENING_FINISHED' }
  | { type: 'CARD_SHOWN' }
  | { type: 'ADVANCE' }
  | { type: 'FINISH' };

export const initialOpeningState: OpeningState = {
  phase: 'loading',
  mode: 'prototype-booster',
  draft: null,
  opening: null,
  revealIndex: 0,
  cardBusy: false,
  resumed: false,
  commitError: null,
};

export function openingReducer(state: OpeningState, event: OpeningEvent): OpeningState {
  switch (event.type) {
    case 'LOADED': {
      if (state.phase !== 'loading') return state;
      const rec = event.opening;
      if (!rec || rec.status === 'complete') return { ...state, phase: 'sealed' };
      const done = rec.revealIndex >= PACK_SIZE;
      return {
        ...state,
        phase: done ? 'summary' : 'revealing',
        opening: rec,
        mode: rec.mode,
        revealIndex: Math.min(rec.revealIndex, PACK_SIZE - 1),
        cardBusy: !done, // the resumed card still has to be shown
        resumed: true,
      };
    }
    case 'SET_MODE':
      return state.phase === 'sealed' ? { ...state, mode: event.mode } : state;
    case 'OPEN_REQUESTED':
      if (state.phase !== 'sealed') return state;
      return { ...state, phase: 'preparing', draft: event.draft, commitError: null, resumed: false };
    case 'COMMIT_SUCCEEDED':
      if (state.phase !== 'preparing' || !state.draft || event.opening.id !== state.draft.id) return state;
      return { ...state, phase: 'opening', opening: event.opening, draft: null, revealIndex: 0, cardBusy: true };
    case 'COMMIT_FAILED':
      return state.phase === 'preparing' ? { ...state, commitError: event.error } : state;
    case 'RETRY_COMMIT':
      return state.phase === 'preparing' ? { ...state, commitError: null } : state;
    case 'ABANDON_PREPARE':
      // The draft stays saved as pending and is reused on the next attempt (no rerolls).
      return state.phase === 'preparing' && state.commitError ? { ...state, phase: 'sealed', draft: null } : state;
    case 'OPENING_FINISHED':
      return state.phase === 'opening' ? { ...state, phase: 'revealing', cardBusy: true } : state;
    case 'CARD_SHOWN':
      return state.phase === 'revealing' ? { ...state, cardBusy: false } : state;
    case 'ADVANCE': {
      if (state.phase !== 'revealing' || state.cardBusy || !state.opening) return state;
      const next = state.revealIndex + 1;
      if (next >= PACK_SIZE) return { ...state, phase: 'summary', cardBusy: false };
      return { ...state, revealIndex: next, cardBusy: true };
    }
    case 'FINISH':
      if (state.phase !== 'summary') return state;
      return { ...state, phase: 'sealed', opening: null, revealIndex: 0, cardBusy: false, resumed: false };
    default:
      return state;
  }
}

/** Durable reveal index to persist for a given state (count of cards already moved past). */
export function durableRevealIndex(state: OpeningState): number {
  if (state.phase === 'summary') return PACK_SIZE;
  return state.revealIndex;
}

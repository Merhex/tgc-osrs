import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { generatePack } from '../src/domain/packGenerator';
import { newId, seededRng } from '../src/domain/random';
import { Repository, type OpeningDraft } from '../src/persistence/repository';
import { initialOpeningState, openingReducer } from '../src/opening/machine';

let factory: IDBFactory;
const dbName = 'test-db';
const makeRepo = () => new Repository(dbName, factory);
const draft = (seed: number, mode: OpeningDraft['mode'] = 'prototype-booster'): OpeningDraft => ({
  id: newId('op'),
  mode,
  createdAt: Date.now(),
  cards: generatePack(mode, seededRng(seed)),
});

beforeEach(() => {
  factory = new IDBFactory();
});

describe('exactly-once collection awards', () => {
  it('awards ten copies per committed opening', async () => {
    const repo = makeRepo();
    await repo.commitOpening(draft(1));
    const snap = await repo.load();
    expect(Object.values(snap.collection).reduce((a, b) => a + b, 0)).toBe(10);
    expect(snap.stats).toEqual({ packsOpened: 1, totalCopies: 10 });
    expect(await repo.countInstances()).toBe(10);
  });

  it('does not double-award when the same opening is committed twice (retry)', async () => {
    const repo = makeRepo();
    const d = draft(2);
    const first = await repo.commitOpening(d);
    const second = await repo.commitOpening(d);
    expect(second).toEqual(first);
    const snap = await repo.load();
    expect(snap.stats.packsOpened).toBe(1);
    expect(Object.values(snap.collection).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('does not double-award under concurrent commits of the same draft', async () => {
    const repo = makeRepo();
    const other = makeRepo();
    const d = draft(3);
    await Promise.allSettled([repo.commitOpening(d), other.commitOpening(d), repo.commitOpening(d)]);
    const snap = await makeRepo().load();
    expect(snap.stats.totalCopies).toBe(10);
    expect(await repo.countInstances()).toBe(10);
  });

  it('records the pre-pack snapshot and NEW flags', async () => {
    const repo = makeRepo();
    const a = await repo.commitOpening({ ...draft(4, 'showcase') });
    expect(a.newFlags.every(Boolean)).toBe(true);
    expect(Object.values(a.ownedBefore).every((q) => q === 0)).toBe(true);
    await repo.completeOpening(a.id);
    const b = await repo.commitOpening(draft(5, 'showcase'));
    expect(b.newFlags.some(Boolean)).toBe(false);
    expect(Object.values(b.ownedBefore).every((q) => q === 1)).toBe(true);
  });

  it('rejects malformed packs without writing anything', async () => {
    const repo = makeRepo();
    const d = draft(6);
    await expect(repo.commitOpening({ ...d, cards: d.cards.slice(0, 9) })).rejects.toThrow();
    expect((await repo.load()).stats.packsOpened).toBe(0);
  });
});

describe('refresh and resume', () => {
  it('restores an unfinished opening with the same cards and progress after reopening the database', async () => {
    const repo = makeRepo();
    const d = draft(7);
    const rec = await repo.commitOpening(d);
    await repo.saveRevealProgress(rec.id, 4);
    await repo.close();

    // Simulates a page refresh: a fresh connection.
    const reloaded = await makeRepo().load();
    expect(reloaded.activeOpening?.id).toBe(rec.id);
    expect(reloaded.activeOpening?.cards.map((c) => c.instanceId)).toEqual(d.cards.map((c) => c.instanceId));
    expect(reloaded.activeOpening?.revealIndex).toBe(4);
    expect(reloaded.stats.totalCopies).toBe(10);

    const state = openingReducer(initialOpeningState, { type: 'LOADED', opening: reloaded.activeOpening });
    expect(state.phase).toBe('revealing');
    expect(state.revealIndex).toBe(4);
    expect(state.resumed).toBe(true);
  });

  it('never moves reveal progress backwards', async () => {
    const repo = makeRepo();
    const rec = await repo.commitOpening(draft(8));
    await repo.saveRevealProgress(rec.id, 6);
    const back = await repo.saveRevealProgress(rec.id, 2);
    expect(back.revealIndex).toBe(6);
  });

  it('resumes into the summary when all cards were revealed, and clears after completion', async () => {
    const repo = makeRepo();
    const rec = await repo.commitOpening(draft(9));
    await repo.saveRevealProgress(rec.id, 10);
    let snap = await makeRepo().load();
    expect(snap.activeOpening?.status).toBe('summary');
    expect(openingReducer(initialOpeningState, { type: 'LOADED', opening: snap.activeOpening }).phase).toBe('summary');
    await repo.completeOpening(rec.id);
    snap = await makeRepo().load();
    expect(snap.activeOpening).toBeNull();
    expect(snap.stats.totalCopies).toBe(10);
  });

  it('reset clears collection but keeps settings', async () => {
    const repo = makeRepo();
    await repo.saveSettings({ muted: true, reducedMotion: 'on' });
    await repo.commitOpening(draft(10));
    await repo.resetCollection();
    const snap = await repo.load();
    expect(snap.collection).toEqual({});
    expect(snap.activeOpening).toBeNull();
    expect(snap.settings.muted).toBe(true);
  });
});

describe('opening state machine', () => {
  const sealed = openingReducer(initialOpeningState, { type: 'LOADED', opening: null });

  it('ignores rapid advance input while a card animation is running', async () => {
    const repo = makeRepo();
    const d = draft(11);
    let s = openingReducer(sealed, { type: 'OPEN_REQUESTED', draft: d });
    s = openingReducer(s, { type: 'OPEN_REQUESTED', draft: draft(12) }); // double click
    expect(s.draft?.id).toBe(d.id);
    s = openingReducer(s, { type: 'COMMIT_SUCCEEDED', opening: await repo.commitOpening(d) });
    expect(s.phase).toBe('opening');
    s = openingReducer(s, { type: 'ADVANCE' });
    expect(s.revealIndex).toBe(0);
    s = openingReducer(s, { type: 'OPENING_FINISHED' });
    s = openingReducer(s, { type: 'OPENING_FINISHED' });
    expect(s.phase).toBe('revealing');
    for (let i = 0; i < 5; i++) s = openingReducer(s, { type: 'ADVANCE' });
    expect(s.revealIndex).toBe(0); // still busy flipping the first card
    s = openingReducer(s, { type: 'CARD_SHOWN' });
    s = openingReducer(s, { type: 'ADVANCE' });
    s = openingReducer(s, { type: 'ADVANCE' });
    expect(s.revealIndex).toBe(1);
  });

  it('walks through all ten cards to the summary', async () => {
    const repo = makeRepo();
    const d = draft(13);
    let s = openingReducer(sealed, { type: 'OPEN_REQUESTED', draft: d });
    s = openingReducer(s, { type: 'COMMIT_SUCCEEDED', opening: await repo.commitOpening(d) });
    s = openingReducer(s, { type: 'OPENING_FINISHED' });
    for (let i = 0; i < 10; i++) {
      s = openingReducer(s, { type: 'CARD_SHOWN' });
      s = openingReducer(s, { type: 'ADVANCE' });
    }
    expect(s.phase).toBe('summary');
    s = openingReducer(s, { type: 'FINISH' });
    expect(s.phase).toBe('sealed');
  });

  it('keeps the draft through a failed commit so a retry cannot reroll', () => {
    const d = draft(14);
    let s = openingReducer(sealed, { type: 'OPEN_REQUESTED', draft: d });
    s = openingReducer(s, { type: 'COMMIT_FAILED', error: 'Quota exceeded' });
    expect(s.phase).toBe('preparing');
    expect(s.commitError).toBe('Quota exceeded');
    s = openingReducer(s, { type: 'RETRY_COMMIT' });
    expect(s.draft?.id).toBe(d.id);
    expect(s.commitError).toBeNull();
  });
});

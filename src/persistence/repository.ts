import { CARDS } from '../data/cards';
import { computeNewFlags, type CardInstance } from '../domain/packGenerator';
import { PACK_SIZE, type PackMode } from '../domain/packConfig';
import { openDatabase, promisify, STORES, txDone } from './db';

export type OpeningStatus = 'revealing' | 'summary' | 'complete';

/** A durable pack-opening transaction. */
export interface OpeningRecord {
  id: string;
  mode: PackMode;
  createdAt: number;
  cards: CardInstance[];
  /** Owned quantities immediately before this pack was awarded. */
  ownedBefore: Record<string, number>;
  newFlags: boolean[];
  /** Index of the card currently face-up (0..9). 10 means all revealed. */
  revealIndex: number;
  status: OpeningStatus;
}

export interface OpeningDraft {
  id: string;
  mode: PackMode;
  createdAt: number;
  cards: CardInstance[];
}

export interface CollectionEntry {
  cardId: string;
  quantity: number;
  firstObtainedAt: number;
}

export interface Stats {
  packsOpened: number;
  totalCopies: number;
}

export interface Settings {
  muted: boolean;
  reducedMotion: 'system' | 'on' | 'off';
}

export const DEFAULT_SETTINGS: Settings = { muted: false, reducedMotion: 'system' };

export interface AppSnapshot {
  collection: Record<string, number>;
  stats: Stats;
  activeOpening: OpeningRecord | null;
  settings: Settings;
}

interface MetaRow<T> {
  key: string;
  value: T;
}

const META_STATS = 'stats';
const META_ACTIVE = 'activeOpeningId';
const META_SETTINGS = 'settings';

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

function wrap(action: string, err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  const detail = err instanceof Error ? err.message : String(err);
  return new StorageError(`Could not ${action}: ${detail}`, err);
}

export class Repository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly dbName?: string,
    private readonly factory?: IDBFactory,
  ) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase(this.dbName, this.factory ?? indexedDB).catch((err) => {
        this.dbPromise = null; // allow retry
        throw err;
      });
    }
    return this.dbPromise;
  }

  async close(): Promise<void> {
    if (this.dbPromise) (await this.dbPromise).close();
    this.dbPromise = null;
  }

  async load(): Promise<AppSnapshot> {
    try {
      const db = await this.db();
      const tx = db.transaction([STORES.collection, STORES.openings, STORES.meta], 'readonly');
      const [rows, statsRow, activeRow, settingsRow] = await Promise.all([
        promisify(tx.objectStore(STORES.collection).getAll() as IDBRequest<CollectionEntry[]>),
        promisify(tx.objectStore(STORES.meta).get(META_STATS) as IDBRequest<MetaRow<Stats> | undefined>),
        promisify(tx.objectStore(STORES.meta).get(META_ACTIVE) as IDBRequest<MetaRow<string | null> | undefined>),
        promisify(tx.objectStore(STORES.meta).get(META_SETTINGS) as IDBRequest<MetaRow<Settings> | undefined>),
      ]);
      let activeOpening: OpeningRecord | null = null;
      if (activeRow?.value) {
        const rec = await promisify(tx.objectStore(STORES.openings).get(activeRow.value) as IDBRequest<OpeningRecord | undefined>);
        if (rec && rec.status !== 'complete') activeOpening = rec;
      }
      await txDone(tx);
      const collection: Record<string, number> = {};
      for (const r of rows) collection[r.cardId] = r.quantity;
      return {
        collection,
        stats: statsRow?.value ?? { packsOpened: 0, totalCopies: 0 },
        activeOpening,
        settings: { ...DEFAULT_SETTINGS, ...(settingsRow?.value ?? {}) },
      };
    } catch (err) {
      throw wrap('load your collection', err);
    }
  }

  /**
   * Atomically records an opening and awards its ten cards.
   * Idempotent: committing the same draft id again returns the stored record
   * without awarding anything a second time.
   */
  async commitOpening(draft: OpeningDraft): Promise<OpeningRecord> {
    if (draft.cards.length !== PACK_SIZE) throw new StorageError(`A pack must contain ${PACK_SIZE} cards.`);
    try {
      const db = await this.db();
      const tx = db.transaction([STORES.collection, STORES.instances, STORES.openings, STORES.meta], 'readwrite');
      const done = txDone(tx);
      const openings = tx.objectStore(STORES.openings);
      const collection = tx.objectStore(STORES.collection);
      const meta = tx.objectStore(STORES.meta);
      const instances = tx.objectStore(STORES.instances);

      const existing = await promisify(openings.get(draft.id) as IDBRequest<OpeningRecord | undefined>);
      if (existing) {
        await done;
        return existing;
      }

      const rows = await promisify(collection.getAll() as IDBRequest<CollectionEntry[]>);
      const ownedBefore: Record<string, number> = {};
      for (const c of CARDS) ownedBefore[c.id] = 0;
      for (const r of rows) ownedBefore[r.cardId] = r.quantity;

      const record: OpeningRecord = {
        id: draft.id,
        mode: draft.mode,
        createdAt: draft.createdAt,
        cards: draft.cards,
        ownedBefore,
        newFlags: computeNewFlags(draft.cards, ownedBefore),
        revealIndex: 0,
        status: 'revealing',
      };

      const now = Date.now();
      const next = new Map<string, CollectionEntry>(rows.map((r) => [r.cardId, { ...r }]));
      for (const card of draft.cards) {
        const entry = next.get(card.cardId) ?? { cardId: card.cardId, quantity: 0, firstObtainedAt: now };
        entry.quantity += 1;
        next.set(card.cardId, entry);
        instances.add({ ...card, openingId: draft.id, obtainedAt: now });
      }
      for (const entry of next.values()) collection.put(entry);

      const statsRow = await promisify(meta.get(META_STATS) as IDBRequest<MetaRow<Stats> | undefined>);
      const stats = statsRow?.value ?? { packsOpened: 0, totalCopies: 0 };
      meta.put({
        key: META_STATS,
        value: { packsOpened: stats.packsOpened + 1, totalCopies: stats.totalCopies + draft.cards.length },
      });
      meta.put({ key: META_ACTIVE, value: draft.id });
      openings.add(record);
      await done;
      return record;
    } catch (err) {
      throw wrap('save the opened pack', err);
    }
  }

  /** Persists reveal progress. Progress never moves backwards. */
  async saveRevealProgress(openingId: string, revealIndex: number): Promise<OpeningRecord> {
    try {
      const db = await this.db();
      const tx = db.transaction([STORES.openings], 'readwrite');
      const done = txDone(tx);
      const store = tx.objectStore(STORES.openings);
      const rec = await promisify(store.get(openingId) as IDBRequest<OpeningRecord | undefined>);
      if (!rec) throw new StorageError('Opening not found.');
      const index = Math.min(PACK_SIZE, Math.max(rec.revealIndex, revealIndex));
      const updated: OpeningRecord = {
        ...rec,
        revealIndex: index,
        status: rec.status === 'complete' ? 'complete' : index >= PACK_SIZE ? 'summary' : 'revealing',
      };
      store.put(updated);
      await done;
      return updated;
    } catch (err) {
      throw wrap('save reveal progress', err);
    }
  }

  /** Marks an opening complete and clears it as the active opening. */
  async completeOpening(openingId: string): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction([STORES.openings, STORES.meta], 'readwrite');
      const done = txDone(tx);
      const store = tx.objectStore(STORES.openings);
      const rec = await promisify(store.get(openingId) as IDBRequest<OpeningRecord | undefined>);
      if (rec) store.put({ ...rec, revealIndex: PACK_SIZE, status: 'complete' });
      const active = await promisify(tx.objectStore(STORES.meta).get(META_ACTIVE) as IDBRequest<MetaRow<string> | undefined>);
      if (active?.value === openingId) tx.objectStore(STORES.meta).put({ key: META_ACTIVE, value: null });
      await done;
    } catch (err) {
      throw wrap('finish the opening', err);
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction([STORES.meta], 'readwrite');
      tx.objectStore(STORES.meta).put({ key: META_SETTINGS, value: settings });
      await txDone(tx);
    } catch (err) {
      throw wrap('save settings', err);
    }
  }

  async countInstances(): Promise<number> {
    const db = await this.db();
    const tx = db.transaction([STORES.instances], 'readonly');
    return promisify(tx.objectStore(STORES.instances).count());
  }

  /** Development reset: clears collection, openings and stats. Settings are kept. */
  async resetCollection(): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction([STORES.collection, STORES.instances, STORES.openings, STORES.meta], 'readwrite');
      tx.objectStore(STORES.collection).clear();
      tx.objectStore(STORES.instances).clear();
      tx.objectStore(STORES.openings).clear();
      tx.objectStore(STORES.meta).delete(META_STATS);
      tx.objectStore(STORES.meta).delete(META_ACTIVE);
      await txDone(tx);
    } catch (err) {
      throw wrap('reset the collection', err);
    }
  }
}

/**
 * Pending drafts are mirrored to localStorage before committing so that a
 * refresh during the commit cannot reroll the pack: the same draft is retried.
 */
const PENDING_KEY = 'gll.pendingDraft';

export const pendingDraftStore = {
  save(draft: OpeningDraft) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(draft));
    } catch {
      /* best effort */
    }
  },
  load(): OpeningDraft | null {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      return raw ? (JSON.parse(raw) as OpeningDraft) : null;
    } catch {
      return null;
    }
  },
  clear() {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {
      /* best effort */
    }
  },
};

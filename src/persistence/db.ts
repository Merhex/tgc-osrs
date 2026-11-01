/** Minimal promise wrapper around IndexedDB. */

export const DB_NAME = 'gielinor-legends-and-loot';
export const DB_VERSION = 1;

export const STORES = {
  collection: 'collection',
  instances: 'instances',
  openings: 'openings',
  meta: 'meta',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export function openDatabase(name = DB_NAME, factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = factory.open(name, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.collection)) db.createObjectStore(STORES.collection, { keyPath: 'cardId' });
      if (!db.objectStoreNames.contains(STORES.instances)) {
        const s = db.createObjectStore(STORES.instances, { keyPath: 'instanceId' });
        s.createIndex('byOpening', 'openingId');
      }
      if (!db.objectStoreNames.contains(STORES.openings)) db.createObjectStore(STORES.openings, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another open tab'));
  });
}

export function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Resolves when the transaction commits; rejects if it aborts or errors. */
export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
  });
}

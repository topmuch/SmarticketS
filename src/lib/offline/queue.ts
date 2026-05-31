// ─── IndexedDB Offline Sync Queue for SmarticketS ───────────────────────
// Stores validation requests when offline, syncs them when back online.

const DB_NAME = 'smartickets-offline';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

export interface SyncQueueItem {
  id?: number;
  payload: {
    url: string;
    method: string;
    body: Record<string, unknown>;
    headers?: Record<string, string>;
  };
  timestamp: number;
  synced: boolean;
  retryCount: number;
  lastRetry?: number;
  error?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a validation request to the offline sync queue.
 */
export async function addToSyncQueue(payload: SyncQueueItem['payload']): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const item: Omit<SyncQueueItem, 'id'> = {
      payload,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    };

    const request = store.add(item);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get all unsynced items from the queue.
 */
export async function getUnsyncedItems(): Promise<SyncQueueItem[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');

    const request = index.getAll(false);
    request.onsuccess = () => {
      const items = (request.result as SyncQueueItem[]).sort(
        (a, b) => a.timestamp - b.timestamp,
      );
      resolve(items);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Mark a queue item as synced.
 */
export async function markAsSynced(id: number): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result as SyncQueueItem;
      if (item) {
        item.synced = true;
        store.put(item);
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * Update a queue item with retry info and error.
 */
export async function updateRetryInfo(
  id: number,
  error: string,
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result as SyncQueueItem;
      if (item) {
        item.retryCount += 1;
        item.lastRetry = Date.now();
        item.error = error;
        store.put(item);
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * Get queue stats: total pending, total synced, total failed.
 */
export async function getQueueStats(): Promise<{
  pending: number;
  synced: number;
  failed: number;
}> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result as SyncQueueItem[];
      resolve({
        pending: items.filter((i) => !i.synced && i.retryCount < 5).length,
        synced: items.filter((i) => i.synced).length,
        failed: items.filter((i) => !i.synced && i.retryCount >= 5).length,
      });
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear all synced items from the queue (cleanup).
 */
export async function clearSyncedItems(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');

    const request = index.openCursor(true);
    let count = 0;
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        count++;
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve(count);
    };
  });
}

/**
 * Check if IndexedDB is available.
 */
export async function isOfflineStorageAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false;
    const db = await openDB();
    db.close();
    return true;
  } catch {
    return false;
  }
}

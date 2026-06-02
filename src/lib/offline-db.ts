// @ts-nocheck
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ============================================
// PHASE 5: INDEXEDDB HELPER — Offline Storage
// ============================================

export interface SyncQueueItem {
  id?: number;
  type: 'ticket' | 'parcel' | 'deliver' | 'scan' | 'confirm';
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  lastAttempt?: number;
  errorMessage?: string;
}

interface LocalCacheItem {
  key: string;
  data: unknown;
  updatedAt: number;
}

interface SmartTicketDB extends DBSchema {
  sync_queue: {
    key: number;
    value: SyncQueueItem;
    indexes: { 'by-status': string; 'by-type': string; 'by-timestamp': number };
  };
  local_cache: {
    key: string;
    value: LocalCacheItem;
    indexes: { 'by-updatedAt': number };
  };
}

let dbInstance: IDBPDatabase<SmartTicketDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<SmartTicketDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SmartTicketDB>('smarttickets-offline-db', 1, {
    upgrade(db) {
      // Sync queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        queueStore.createIndex('by-status', 'status', { unique: false });
        queueStore.createIndex('by-type', 'type', { unique: false });
        queueStore.createIndex('by-timestamp', 'timestamp', { unique: false });
      }

      // Local cache store
      if (!db.objectStoreNames.contains('local_cache')) {
        const cacheStore = db.createObjectStore('local_cache', { keyPath: 'key' });
        cacheStore.createIndex('by-updatedAt', 'updatedAt', { unique: false });
      }
    },
  });

  return dbInstance;
}

// ============================================
// SYNC QUEUE OPERATIONS
// ============================================

export async function addToQueue(
  type: SyncQueueItem['type'],
  payload: Record<string, unknown>
): Promise<number> {
  const db = await initDB();
  const id = await db.add('sync_queue', {
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  });
  return id as number;
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  const db = await initDB();
  return db.getAllFromIndex('sync_queue', 'by-status', 'pending');
}

export async function getAllQueueItems(): Promise<SyncQueueItem[]> {
  const db = await initDB();
  return db.getAll('sync_queue');
}

export async function getQueueCountByStatus(status: SyncQueueItem['status']): Promise<number> {
  const db = await initDB();
  return db.countFromIndex('sync_queue', 'by-status', status);
}

export async function updateQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await initDB();
  await db.put('sync_queue', item);
}

export async function removeSyncedItems(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const db = await initDB();
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;

  const all = await db.getAll('sync_queue');
  const tx = db.transaction('sync_queue', 'readwrite');

  for (const item of all) {
    if (item.status === 'synced' && item.timestamp < cutoff) {
      await tx.store.delete(item.id!);
      removed++;
    }
  }

  await tx.done;
  return removed;
}

export async function clearFailedItems(): Promise<number> {
  const db = await initDB();
  const failed = await db.getAllFromIndex('sync_queue', 'by-status', 'failed');
  const tx = db.transaction('sync_queue', 'readwrite');

  for (const item of failed) {
    await tx.store.delete(item.id!);
  }

  await tx.done;
  return failed.length;
}

export async function retryFailedItems(): Promise<number> {
  const db = await initDB();
  const failed = await db.getAllFromIndex('sync_queue', 'by-status', 'failed');
  let retried = 0;

  for (const item of failed) {
    await db.put('sync_queue', {
      ...item,
      status: 'pending',
      retryCount: 0,
      errorMessage: undefined,
    });
    retried++;
  }

  return retried;
}

// ============================================
// LOCAL CACHE OPERATIONS
// ============================================

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

export async function cacheData(key: string, data: unknown): Promise<void> {
  const db = await initDB();
  await db.put('local_cache', {
    key,
    data,
    updatedAt: Date.now(),
  });
}

export async function getCachedData<T = unknown>(key: string): Promise<T | null> {
  const db = await initDB();
  const record = await db.get('local_cache', key);

  if (!record) return null;

  // Check TTL
  if (Date.now() - record.updatedAt > CACHE_TTL) {
    await db.delete('local_cache', key);
    return null;
  }

  return record.data as T;
}

export async function invalidateCache(key?: string): Promise<void> {
  const db = await initDB();
  if (key) {
    await db.delete('local_cache', key);
  } else {
    await db.clear('local_cache');
  }
}

// ============================================
// DOUBLE SCAN PREVENTION
// ============================================

const scannedSet = new Set<string>();
const SCAN_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export function isDuplicateScan(code: string): boolean {
  if (scannedSet.has(code)) return true;
  scannedSet.add(code);

  // Auto-cleanup after window
  setTimeout(() => {
    scannedSet.delete(code);
  }, SCAN_WINDOW_MS);

  return false;
}

// ============================================
// FALLBACK: localStorage backup for critical data
// ============================================

export function backupToLocalStorage(items: SyncQueueItem[]): void {
  try {
    localStorage.setItem('smarttickets_sync_backup', JSON.stringify(items));
  } catch {
    console.warn('[OFFLINE] localStorage backup failed — storage full');
  }
}

export function restoreFromLocalStorage(): SyncQueueItem[] {
  try {
    const data = localStorage.getItem('smarttickets_sync_backup');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

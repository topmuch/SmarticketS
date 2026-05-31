// ─── Auto Sync Engine with Exponential Backoff ─────────────────────────────
// Processes offline queue items when connectivity is restored.

import {
  getUnsyncedItems,
  markAsSynced,
  updateRetryInfo,
  getQueueStats,
  type SyncQueueItem,
} from './queue';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000; // 2s initial delay
const SYNC_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

type SyncEventType = 'sync_start' | 'sync_progress' | 'sync_complete' | 'sync_error';

interface SyncEvent {
  type: SyncEventType;
  pending?: number;
  processed?: number;
  failed?: number;
  item?: SyncQueueItem;
  error?: string;
}

type SyncListener = (event: SyncEvent) => void;

class SyncEngine {
  private listeners: SyncListener[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.emit({ type: 'sync_start', pending: 0 });
    this.processQueue();
  };

  private handleOffline = () => {
    this.isOnline = false;
  };

  /**
   * Calculate delay with exponential backoff.
   * 2s → 4s → 8s → 16s → 32s
   */
  private getBackoffDelay(retryCount: number): number {
    return BASE_DELAY_MS * Math.pow(2, retryCount);
  }

  /**
   * Process a single queue item.
   */
  private async processItem(item: SyncQueueItem): Promise<boolean> {
    const { payload } = item;
    const { url, method, body, headers } = payload;

    try {
      const fetchOptions: RequestInit = {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      };

      const response = await fetch(url, fetchOptions);

      if (response.ok) {
        await markAsSynced(item.id!);
        return true;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        await updateRetryInfo(item.id!, `HTTP ${response.status}: ${errorText}`);
        return false;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      await updateRetryInfo(item.id!, msg);
      return false;
    }
  }

  /**
   * Process all unsynced items in the queue.
   */
  async processQueue(): Promise<{
    processed: number;
    failed: number;
    remaining: number;
  }> {
    if (this.isRunning) return { processed: 0, failed: 0, remaining: 0 };
    this.isRunning = true;

    let processed = 0;
    let failed = 0;

    try {
      const items = await getUnsyncedItems();

      if (items.length === 0) {
        this.isRunning = false;
        this.emit({ type: 'sync_complete', pending: 0, processed: 0, failed: 0 });
        return { processed: 0, failed: 0, remaining: 0 };
      }

      this.emit({ type: 'sync_start', pending: items.length });

      for (const item of items) {
        // Skip if max retries exceeded
        if (item.retryCount >= MAX_RETRIES) {
          failed++;
          continue;
        }

        // Apply backoff delay between retries
        if (item.retryCount > 0) {
          const delay = this.getBackoffDelay(item.retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Check connectivity before attempting
        if (!this.isOnline && !navigator.onLine) {
          this.isRunning = false;
          return { processed, failed, remaining: items.length - processed - failed };
        }

        const success = await this.processItem(item);

        if (success) {
          processed++;
        } else {
          failed++;
        }

        this.emit({
          type: 'sync_progress',
          pending: items.length - processed - failed,
          processed,
          failed,
        });
      }

      const stats = await getQueueStats();
      this.emit({
        type: 'sync_complete',
        pending: stats.pending,
        processed,
        failed,
      });

      return {
        processed,
        failed,
        remaining: stats.pending,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync error';
      this.emit({ type: 'sync_error', error: msg });
      return { processed, failed, remaining: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start periodic sync checking.
   */
  startAutoSync() {
    if (this.intervalId) return;

    // Initial check
    this.processQueue();

    // Periodic check
    this.intervalId = setInterval(() => {
      if (navigator.onLine) {
        this.processQueue();
      }
    }, SYNC_CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic sync checking.
   */
  stopAutoSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Subscribe to sync events.
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Emit a sync event to all listeners.
   */
  private emit(event: SyncEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    });
  }

  /**
   * Get current online status.
   */
  getStatus(): { isOnline: boolean; isRunning: boolean } {
    return {
      isOnline: this.isOnline && (typeof navigator === 'undefined' || navigator.onLine),
      isRunning: this.isRunning,
    };
  }
}

// Singleton instance
export const syncEngine = typeof window !== 'undefined' ? new SyncEngine() : null;

/**
 * Hook-friendly wrapper: start auto-sync on mount, stop on unmount.
 */
export function startSyncEngine() {
  if (syncEngine) {
    syncEngine.startAutoSync();
  }
}

export function stopSyncEngine() {
  if (syncEngine) {
    syncEngine.stopAutoSync();
  }
}

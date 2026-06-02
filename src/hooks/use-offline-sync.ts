// ============================================
// PHASE 5: useOfflineSync — React Hook
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { processQueue, getPendingCount, getFailedCount, type SyncResult } from '@/lib/sync-manager';

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  lastSyncTime: Date | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    failedCount: 0,
    isSyncing: false,
    lastSyncResult: null,
    lastSyncTime: null,
  });

  const syncInProgress = useRef(false);
  const mounted = useRef(true);

  // Refresh queue counts from IndexedDB
  const refreshCounts = useCallback(async () => {
    try {
      const [pending, failed] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
      ]);
      if (mounted.current) {
        setState((prev) => ({
          ...prev,
          pendingCount: pending,
          failedCount: failed,
        }));
      }
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Sync function
  const doSync = useCallback(async (): Promise<SyncResult> => {
    if (syncInProgress.current) {
      return { success: false, synced: 0, failed: 0, skipped: 0, errors: [] };
    }

    syncInProgress.current = true;
    if (mounted.current) {
      setState((prev) => ({ ...prev, isSyncing: true }));
    }

    try {
      const result = await processQueue();
      if (mounted.current) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncResult: result,
          lastSyncTime: new Date(),
        }));
      }
      // Refresh counts after sync
      await refreshCounts();
      return result;
    } catch (error) {
      console.error('[SYNC] Erreur fatale:', error);
      if (mounted.current) {
        setState((prev) => ({ ...prev, isSyncing: false }));
      }
      return { success: false, synced: 0, failed: 0, skipped: 0, errors: [] };
    } finally {
      syncInProgress.current = false;
    }
  }, [refreshCounts]);

  // Online event handler
  const handleOnline = useCallback(async () => {
    if (mounted.current) {
      setState((prev) => ({ ...prev, isOnline: true }));
    }
    console.log('[SYNC] ✅ Connexion rétablie — lancement de la synchronisation');
    await refreshCounts();
    await doSync();
  }, [refreshCounts, doSync]);

  // Offline event handler
  const handleOffline = useCallback(() => {
    if (mounted.current) {
      setState((prev) => ({ ...prev, isOnline: false }));
    }
    console.log('[SYNC] ❌ Connexion perdue — mode hors-ligne');
  }, []);

  // Focus event handler (retry sync when user returns to tab)
  const handleFocus = useCallback(async () => {
    if (navigator.onLine && !syncInProgress.current) {
      const [pending] = await Promise.all([getPendingCount()]);
      if (pending > 0) {
        console.log(`[SYNC] 🔄 ${pending} action(s) en attente — synchronisation au focus`);
        await refreshCounts();
        await doSync();
      }
    }
  }, [refreshCounts, doSync]);

  useEffect(() => {
    mounted.current = true;

    // Initial count refresh
    refreshCounts();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    // Periodic refresh of counts (every 15s)
    const countInterval = setInterval(refreshCounts, 15_000);

    // Auto-sync every 30s when online
    const syncInterval = setInterval(async () => {
      if (navigator.onLine && !syncInProgress.current) {
        const pending = await getPendingCount().catch(() => 0);
        if (pending > 0) {
          await doSync();
        }
      }
    }, 30_000);

    return () => {
      mounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      clearInterval(countInterval);
      clearInterval(syncInterval);
    };
  }, [refreshCounts, doSync, handleOnline, handleOffline, handleFocus]);

  return {
    ...state,
    forceSync: doSync,
    refreshCounts,
  };
}

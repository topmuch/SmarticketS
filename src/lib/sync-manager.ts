// ============================================
// PHASE 5: SYNC MANAGER — Offline Queue Engine
// ============================================

import {
  addToQueue,
  getPendingItems,
  getQueueCountByStatus,
  updateQueueItem,
  removeSyncedItems,
  clearFailedItems,
  retryFailedItems,
  backupToLocalStorage,
  restoreFromLocalStorage,
  type SyncQueueItem,
} from './offline-db';

const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000; // 2s base, exponential backoff

// Map sync type to API endpoint
const ENDPOINT_MAP: Record<string, string> = {
  ticket: '/api/tickets/activate',
  parcel: '/api/parcels/activate',
  deliver: '/api/parcels/deliver',
  confirm: '/api/parcels/confirm',
  scan: '/api/tickets/use',
};

// Map sync type to HTTP method
const METHOD_MAP: Record<string, string> = {
  ticket: 'POST',
  parcel: 'POST',
  deliver: 'POST',
  confirm: 'POST',
  scan: 'POST',
};

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  skipped: number;
  errors: Array<{ type: string; error: string }>;
}

/**
 * Add an action to the offline sync queue
 */
export async function queueAction(
  type: SyncQueueItem['type'],
  payload: Record<string, unknown>
): Promise<number> {
  return addToQueue(type, payload);
}

/**
 * Get count of pending items
 */
export async function getPendingCount(): Promise<number> {
  return getQueueCountByStatus('pending');
}

/**
 * Get count of failed items
 */
export async function getFailedCount(): Promise<number> {
  return getQueueCountByStatus('failed');
}

/**
 * Process the entire pending queue — attempts to sync all pending items
 */
export async function processQueue(): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, skipped: 0, errors: [] };

  // Get current token
  const token = typeof window !== 'undefined' ? localStorage.getItem('st_access_token') : null;
  if (!token) {
    console.warn('[SYNC] Token manquant — synchronisation en pause');
    result.skipped = await getPendingCount();
    result.success = false;
    return result;
  }

  // Check if token is expired (simple check)
  if (isTokenExpired(token)) {
    console.warn('[SYNC] Token expiré — tentative de refresh');
    try {
      const newToken = await refreshToken();
      if (!newToken) {
        result.skipped = await getPendingCount();
        result.success = false;
        result.errors.push({ type: 'auth', error: 'Token expiré et refresh échoué' });
        return result;
      }
    } catch {
      result.skipped = await getPendingCount();
      result.success = false;
      result.errors.push({ type: 'auth', error: 'Échec du refresh token' });
      return result;
    }
  }

  let pending: SyncQueueItem[];
  try {
    pending = await getPendingItems();
  } catch (dbError) {
    // Fallback: try to restore from localStorage
    console.warn('[SYNC] IndexedDB inaccessible, tentative de restauration localStorage');
    const backup = restoreFromLocalStorage();
    if (backup.length > 0) {
      result.skipped = backup.length;
      result.errors.push({ type: 'storage', error: 'IndexedDB inaccessible — données en backup localStorage' });
    }
    result.success = false;
    return result;
  }

  if (pending.length === 0) {
    return result;
  }

  // Backup current queue to localStorage before processing
  backupToLocalStorage(pending);

  for (const item of pending) {
    const endpoint = ENDPOINT_MAP[item.type];
    if (!endpoint) {
      console.warn(`[SYNC] Type inconnu: ${item.type} — ignoré`);
      result.skipped++;
      continue;
    }

    // Check retry delay (exponential backoff)
    if (item.lastAttempt && item.retryCount > 0) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, item.retryCount - 1);
      const nextAttempt = item.lastAttempt + delay;
      if (Date.now() < nextAttempt) {
        continue;
      }
    }

    // Mark as syncing
    await updateQueueItem({ ...item, status: 'syncing' });

    try {
      const currentToken = localStorage.getItem('st_access_token') || token;
      const response = await fetch(endpoint, {
        method: METHOD_MAP[item.type] || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(item.payload),
      });

      if (response.status === 409) {
        // 409 Conflict — idempotent: already processed on server
        await updateQueueItem({ ...item, status: 'synced' });
        result.synced++;
        continue;
      }

      if (response.status === 401) {
        // Token expired during sync
        const newToken = await refreshToken();
        if (newToken) {
          // Retry once with new token
          const retryResponse = await fetch(endpoint, {
            method: METHOD_MAP[item.type] || 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${newToken}`,
            },
            body: JSON.stringify(item.payload),
          });

          if (retryResponse.ok || retryResponse.status === 409) {
            await updateQueueItem({ ...item, status: 'synced' });
            result.synced++;
            continue;
          }
        }
        throw new Error('Session expirée pendant la synchronisation');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      await updateQueueItem({ ...item, status: 'synced' });
      result.synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[SYNC] ❌ Échec ${item.type}: ${message}`);

      if (item.retryCount >= MAX_RETRIES) {
        await updateQueueItem({
          ...item,
          status: 'failed',
          lastAttempt: Date.now(),
          errorMessage: message,
        });
        result.failed++;
        result.errors.push({ type: item.type, error: message });
      } else {
        await updateQueueItem({
          ...item,
          status: 'pending',
          retryCount: item.retryCount + 1,
          lastAttempt: Date.now(),
          errorMessage: message,
        });
        result.skipped++;
      }
    }
  }

  // Cleanup old synced items
  await removeSyncedItems();

  result.success = result.failed === 0;
  return result;
}

/**
 * Retry all failed items
 */
export async function retryAllFailed(): Promise<number> {
  return retryFailedItems();
}

/**
 * Clear all failed items from queue
 */
export async function clearAllFailed(): Promise<number> {
  return clearFailedItems();
}

// ============================================
// TOKEN HELPERS
// ============================================

function isTokenExpired(token: string): boolean {
  try {
    // JWT tokens are base64 encoded: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

async function refreshToken(): Promise<string | null> {
  const refreshTokenValue = localStorage.getItem('st_refresh_token');
  if (!refreshTokenValue) return null;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { accessToken: string; refreshToken?: string };
    localStorage.setItem('st_access_token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('st_refresh_token', data.refreshToken);
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

// ============================================
// AUDIO FEEDBACK (Offline-safe)
// ============================================

export function playBeep(frequency: number = 800, duration: number = 150): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);

    // Cleanup
    setTimeout(() => {
      ctx.close();
    }, duration + 100);
  } catch {
    // Audio not available
  }
}

export function playSuccessSound(): void {
  playBeep(880, 100);
  setTimeout(() => playBeep(1100, 150), 120);
}

export function playErrorSound(): void {
  playBeep(300, 200);
}

export function vibrate(pattern: number | number[] = 100): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration not available
  }
}

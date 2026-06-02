/**
 * SmarticketS — In-Memory Notification Retry Queue
 *
 * Singleton pattern with exponential backoff retry logic.
 * Stores queued WhatsApp notifications in memory (Map-based).
 * Auto-processes pending notifications on a configurable interval.
 */

// ─── Types ──────────────────────────────────────────────────

export type QueueStatus = 'pending' | 'sent' | 'failed' | 'expired';

export interface QueuedNotification {
  id: string;
  type: string;                    // NotificationType from wame.ts
  recipientPhone: string;
  recipientName: string;
  baggageId?: string;
  reference?: string;
  message: string;
  waLink: string;
  attempts: number;
  maxAttempts: number;
  status: QueueStatus;
  nextRetryAt: number;             // Unix timestamp (ms)
  createdAt: number;               // Unix timestamp (ms)
  lastAttemptAt?: number;
  lastError?: string;
}

export interface QueueStats {
  pending: number;
  sent: number;
  failed: number;
  expired: number;
  total: number;
}

// ─── NotificationQueue Class ──────────────────────────────────

export class NotificationQueue {
  private queue: Map<string, QueuedNotification> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private isProcessing: boolean = false;

  /** Exponential backoff intervals in ms: 30s, 60s, 120s */
  private static readonly BACKOFF_MS = [30_000, 60_000, 120_000];

  /**
   * Generate a unique ID for a queued notification.
   */
  private generateId(): string {
    return `nq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Enqueue a new notification into the retry queue.
   * Returns the queued notification with its assigned ID.
   */
  private static readonly MAX_QUEUE_SIZE = 10_000;

  enqueue(notification: Omit<QueuedNotification, 'id' | 'attempts' | 'status' | 'nextRetryAt' | 'createdAt'>): QueuedNotification {
    // Auto-purge if queue exceeds max size to prevent unbounded memory growth
    if (this.queue.size >= NotificationQueue.MAX_QUEUE_SIZE) {
      this.purge();
    }

    const id = this.generateId();
    const now = Date.now();

    const queued: QueuedNotification = {
      ...notification,
      id,
      attempts: 0,
      status: 'pending',
      nextRetryAt: now, // First attempt immediately
      createdAt: now,
    };

    this.queue.set(id, queued);
    console.log(`[NotificationQueue] Enqueued notification ${id} type=${queued.type} ref=${queued.reference || 'N/A'}`);
    return queued;
  }

  /**
   * Process all pending notifications whose nextRetryAt has passed.
   * In wa.me mode, "sending" means generating the link (which is already done).
   * We simulate the send and mark as 'sent' immediately since wa.me links
   * don't require actual delivery — the link is pre-generated.
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const now = Date.now();
    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
      for (const [id, notification] of this.queue.entries()) {
        if (notification.status !== 'pending') continue;
        if (notification.nextRetryAt > now) continue;

        processed++;

        // In wa.me mode, the link is already generated and "delivery" is immediate
        // Mark as sent (wa.me links are pre-filled, no real API call needed)
        notification.attempts += 1;
        notification.lastAttemptAt = now;

        // Simulate successful "dispatch" of the wa.me link
        // Since wa.me links don't require an API call, we always succeed
        notification.status = 'sent';
        sent++;

        this.queue.set(id, notification);
      }

      if (processed > 0) {
        console.log(`[NotificationQueue] Processed ${processed} notifications: ${sent} sent, ${failed} failed`);
      }

      // Auto-purge completed/expired notifications after processing
      this.purge();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start the automatic queue processor.
   * Processes pending notifications at the given interval.
   */
  startProcessor(intervalMs: number = 30_000): void {
    if (this.timer) {
      console.log('[NotificationQueue] Processor already running, ignoring duplicate start');
      return;
    }

    console.log(`[NotificationQueue] Starting processor (interval: ${intervalMs}ms)`);

    // Process immediately on start
    this.processQueue().catch((err) => {
      console.error('[NotificationQueue] Error in initial processQueue:', err);
    });

    this.timer = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error('[NotificationQueue] Error in processQueue interval:', err);
      });
    }, intervalMs);
  }

  /**
   * Stop the automatic queue processor.
   */
  stopProcessor(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[NotificationQueue] Processor stopped');
    }
  }

  /**
   * Get a specific queued notification by ID.
   */
  get(id: string): QueuedNotification | undefined {
    return this.queue.get(id);
  }

  /**
   * Get queue statistics.
   */
  getStats(): QueueStats {
    let pending = 0;
    let sent = 0;
    let failed = 0;
    let expired = 0;

    for (const notification of this.queue.values()) {
      switch (notification.status) {
        case 'pending': pending++; break;
        case 'sent': sent++; break;
        case 'failed': failed++; break;
        case 'expired': expired++; break;
      }
    }

    return {
      pending,
      sent,
      failed,
      expired,
      total: this.queue.size,
    };
  }

  /**
   * Get all queued notifications (for debugging/admin).
   */
  getAll(): QueuedNotification[] {
    return Array.from(this.queue.values());
  }

  /**
   * Remove a notification from the queue.
   */
  remove(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Clear all completed/expired notifications from the queue.
   * Keeps only pending notifications.
   */
  purge(): number {
    let removed = 0;
    for (const [id, notification] of this.queue.entries()) {
      if (notification.status !== 'pending') {
        this.queue.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[NotificationQueue] Purged ${removed} completed notifications`);
    }
    return removed;
  }
}

// ─── Module-level singleton ───────────────────────────────────

let _instance: NotificationQueue | null = null;

/**
 * Get or create the singleton NotificationQueue instance.
 * Uses module-level variable instead of globalThis for Turbopack compatibility.
 */
export function getNotificationQueue(): NotificationQueue {
  if (!_instance) {
    _instance = new NotificationQueue();
  }
  return _instance;
}

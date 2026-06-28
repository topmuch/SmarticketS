/**
 * Web Push Service — sends real push notifications to subscribed devices.
 *
 * C3 fix (audit): previously, BusGoPushSubscription records were saved to DB
 * but NEVER used to send actual push notifications. The web-push library was
 * not installed, VAPID keys were not configured, and the push subscription
 * was created without an applicationServerKey (so the server couldn't use it).
 *
 * This module:
 *   1. Configures web-push with VAPID keys from env
 *   2. Provides sendPushToSubscription() for a single subscription
 *   3. Provides sendPushToSubscriptions() for batch sending
 *   4. Handles TTL, urgency, and topic grouping
 *
 * Graceful degradation: if VAPID keys are not configured, the module logs a
 * warning and returns silently (no crash). This allows dev environments
 * without push to still work.
 */

import webpush, { type PushSubscription as WebPushSubscription } from 'web-push';
import type { BusGoPushSubscription } from '@prisma/client';

// ─── VAPID Configuration ───

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contact@smartickets.com';

  if (!publicKey || !privateKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[push-service] VAPID keys not configured — push notifications disabled');
    }
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error('[push-service] Failed to configure VAPID:', err);
    return false;
  }
}

// ─── Types ───

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// ─── Convert DB subscription to web-push format ───

function dbSubscriptionToWebPush(
  sub: Pick<BusGoPushSubscription, 'endpoint' | 'keys'>
): WebPushSubscription | null {
  try {
    const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
    if (!sub.endpoint || !keys?.p256dh || !keys?.auth) {
      return null;
    }
    return {
      endpoint: sub.endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    };
  } catch {
    return null;
  }
}

// ─── Send to a single subscription ───

export async function sendPushToSubscription(
  subscription: Pick<BusGoPushSubscription, 'id' | 'endpoint' | 'keys' | 'passengerTicketId'>,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!configureVapid()) {
    return { success: false, error: 'VAPID not configured' };
  }

  const webPushSub = dbSubscriptionToWebPush(subscription);
  if (!webPushSub) {
    return { success: false, error: 'Invalid subscription format' };
  }

  try {
    await webpush.sendNotification(webPushSub, JSON.stringify(payload), {
      TTL: 60 * 60 * 24, // 24 hours
      urgency: payload.requireInteraction ? 'high' : 'normal',
      topic: payload.tag,
    });
    return { success: true };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };

    // 404 = subscription expired, 410 = subscription gone → should be deleted
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.warn(`[push-service] Subscription ${subscription.id} expired (status ${error.statusCode}) — should be deleted`);
      // We don't delete here to avoid circular imports; the caller can handle it
    }

    return {
      success: false,
      error: error.message || `HTTP ${error.statusCode || 'unknown'}`,
    };
  }
}

// ─── Send to multiple subscriptions (batch) ───

export async function sendPushToSubscriptions(
  subscriptions: Array<Pick<BusGoPushSubscription, 'id' | 'endpoint' | 'keys' | 'passengerTicketId'>>,
  payload: PushPayload
): Promise<{ sent: number; failed: number; expiredIds: string[] }> {
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, expiredIds: [] };
  }

  if (!configureVapid()) {
    return { sent: 0, failed: subscriptions.length, expiredIds: [] };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        sent++;
      } else {
        failed++;
        // Check if the error indicates an expired subscription
        const sub = subscriptions[index];
        const err = result.value.error || '';
        if (err.includes('404') || err.includes('410') || err.includes('expired')) {
          expiredIds.push(sub.id);
        }
      }
    } else {
      failed++;
    }
  });

  // Clean up expired subscriptions (best-effort)
  if (expiredIds.length > 0) {
    try {
      const { db } = await import('@/lib/db');
      await db.busGoPushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      });
      console.log(`[push-service] Cleaned up ${expiredIds.length} expired subscription(s)`);
    } catch (cleanupErr) {
      console.warn('[push-service] Failed to clean up expired subscriptions:', cleanupErr);
    }
  }

  return { sent, failed, expiredIds };
}

// ─── Get VAPID public key (for frontend) ───

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

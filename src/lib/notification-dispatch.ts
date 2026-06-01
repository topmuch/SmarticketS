/**
 * SmarticketS — Notification Dispatch Engine
 *
 * Central dispatch hub for all notification types:
 *   - WhatsApp notifications (departure/arrival for sender/receiver)
 *   - Alert notifications (agency bell)
 *   - System notifications (DB-only)
 *
 * Uses NOTIFICATION_TEMPLATES from whatsapp-message.ts for wa.me link generation.
 * Persists ColisEvent records for tracking.
 * Enqueues into the in-memory retry queue.
 */

import { db } from '@/lib/db';
import { NOTIFICATION_TEMPLATES, type NotificationType, type NotificationVars, generateWaMeLink } from '@/lib/wame';
import { getNotificationQueue } from '@/lib/notification-queue';

const ALERT_SERVICE_URL = process.env.ALERT_SERVICE_URL || 'http://localhost:3003';

// ─── Dispatch Notification Parameters ─────────────────────────

interface DispatchParams {
  type: NotificationType;
  recipientPhone: string;
  recipientName: string;
  baggageId?: string;
  reference?: string;
  departureData?: {
    senderName: string;
    senderWhatsapp: string;
    receiverName: string;
    receiverWhatsapp: string;
    companyName: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    departureTime: string;
    pickupAddress?: string;
    pin?: string;
    driverPhone?: string;
    shareDriverPhone?: boolean;
  };
  arrivalData?: {
    senderName: string;
    senderWhatsapp: string;
    receiverName: string;
    receiverWhatsapp: string;
    companyName: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    departureTime: string;
    arrivedDate?: string;
    arrivedTime?: string;
    deliveryLocation?: string;
    pickupAddress?: string;
    feedbackUrl?: string;
    pin?: string;
    driverPhone?: string;
    shareDriverPhone?: boolean;
  };
}

// ─── Dispatch Notification (WhatsApp wa.me) ───────────────────

/**
 * Main entry point for dispatching a WhatsApp notification.
 *
 * 1. Builds the notification message from NOTIFICATION_TEMPLATES
 * 2. Generates the wa.me deep link
 * 3. Creates a ColisEvent in DB for tracking
 * 4. Enqueues the notification in the retry queue
 * 5. Returns the queue item
 */
export async function dispatchNotification(params: DispatchParams) {
  const {
    type,
    recipientPhone,
    recipientName,
    baggageId,
    reference,
    departureData,
    arrivalData,
  } = params;

  if (!reference) {
    throw new Error('reference is required for dispatchNotification');
  }

  if (!baggageId) {
    throw new Error('baggageId is required for dispatchNotification');
  }

  // Build the notification template variables
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smartickets.com';
  const trackingUrl = `${appUrl}/suivi/${reference}`;

  const vars: NotificationVars = {
    reference,
    sender_name: departureData?.senderName || arrivalData?.senderName || '',
    sender_whatsapp: departureData?.senderWhatsapp || arrivalData?.senderWhatsapp || '',
    receiver_name: departureData?.receiverName || arrivalData?.receiverName || '',
    receiver_whatsapp: departureData?.receiverWhatsapp || arrivalData?.receiverWhatsapp || '',
    company_name: departureData?.companyName || arrivalData?.companyName || '',
    departure_city: departureData?.departureCity || arrivalData?.departureCity || '',
    arrival_city: departureData?.arrivalCity || arrivalData?.arrivalCity || '',
    departure_date: departureData?.departureDate || arrivalData?.departureDate || '',
    departure_time: departureData?.departureTime || arrivalData?.departureTime || '',
    arrived_date: arrivalData?.arrivedDate,
    arrived_time: arrivalData?.arrivedTime,
    delivery_location: arrivalData?.deliveryLocation,
    pickup_address: departureData?.pickupAddress || arrivalData?.pickupAddress,
    tracking_url: trackingUrl,
    feedback_url: arrivalData?.feedbackUrl,
    pin: departureData?.pin || arrivalData?.pin,
    driver_phone: departureData?.driverPhone || arrivalData?.driverPhone,
    share_driver_phone: departureData?.shareDriverPhone || arrivalData?.shareDriverPhone,
  };

  // Get the template and generate the message
  const template = NOTIFICATION_TEMPLATES[type];
  const message = template(vars);

  // Generate wa.me link
  const waLink = generateWaMeLink(recipientPhone, message);

  // Determine the event type and title for ColisEvent
  const recipientType = type.endsWith('_sender') ? 'sender' : 'receiver';
  const eventType = type.startsWith('departure') ? 'activation' : 'delivery';
  const messageTitle = type.startsWith('departure')
    ? (recipientType === 'sender' ? 'Colis en Partance' : 'Colis en Transit')
    : (recipientType === 'sender' ? 'Colis Livré' : 'Colis Disponible');

  // Create ColisEvent in DB for tracking
  const colisEvent = await db.colisEvent.create({
    data: {
      baggageId,
      eventType,
      recipientType,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      messageTitle,
      messageContent: message,
      waLink,
      metadata: JSON.stringify({
        notificationType: type,
        reference,
        trackingUrl,
      }),
    },
  });

  // Enqueue in the retry queue
  const queue = getNotificationQueue();
  const queuedNotification = queue.enqueue({
    type,
    recipientPhone,
    recipientName,
    baggageId,
    reference,
    message,
    waLink,
    maxAttempts: 3,
  });

  console.log(
    `[NotificationDispatch] Dispatched ${type} to ${recipientPhone} ref=${reference} ` +
    `eventId=${colisEvent.id} queueId=${queuedNotification.id}`
  );

  return {
    colisEvent,
    queuedNotification,
    waLink,
    message: messageTitle,
  };
}

// ─── Dispatch Alert (Agency Bell) ─────────────────────────────

interface DispatchAlertParams {
  agencyId: string;
  userId?: string;
  type: string;
  message: string;
  baggageId?: string;
  data?: Record<string, unknown>;
}

/**
 * Dispatch an alert notification:
 * 1. Creates a Notification in DB (for the notification bell)
 * 2. If the alert-service is running, broadcasts via HTTP POST
 */
export async function dispatchAlert(alert: DispatchAlertParams) {
  const { agencyId, userId, type, message, baggageId, data } = alert;

  // Create Notification in DB
  const notification = await db.notification.create({
    data: {
      type,
      userId: userId || null,
      agencyId,
      baggageId: baggageId || null,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  });

  // Try to broadcast via alert-service (non-blocking)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(`${ALERT_SERVICE_URL}/api/internal/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'alert:notification',
        agencyId,
        payload: {
          notificationId: notification.id,
          type,
          message,
          baggageId,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch {
    // Alert service might not be running — that's OK
    console.log('[NotificationDispatch] Alert service unavailable, notification saved to DB only');
  }

  console.log(
    `[NotificationDispatch] Alert dispatched: type=${type} agency=${agencyId} notificationId=${notification.id}`
  );

  return notification;
}

// ─── Dispatch System Notification ──────────────────────────────

interface DispatchSystemParams {
  userId?: string;
  agencyId?: string;
  message: string;
  type?: string;
  data?: Record<string, unknown>;
}

/**
 * Create a system notification in DB (no WhatsApp dispatch).
 */
export async function dispatchSystem(
  userId: string,
  message: string,
  data?: Record<string, unknown>,
  type: string = 'system'
) {
  const notification = await db.notification.create({
    data: {
      type,
      userId,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  });

  console.log(
    `[NotificationDispatch] System notification created: userId=${userId} type=${type} id=${notification.id}`
  );

  return notification;
}

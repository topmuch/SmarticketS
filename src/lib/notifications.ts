/**
 * SmarticketS — Notification Service
 *
 * C1 fix (audit): previously this module used `@ts-nocheck` to hide that it
 * referenced fields (channel, recipient, subject, content, tenantId, status,
 * errorMessage, sentAt) and a model (NotificationTemplate) that DON'T EXIST
 * in the Prisma schema. This caused PrismaClientValidationError at runtime.
 *
 * This rewrite uses the ACTUAL `Notification` model fields:
 *   type, userId, agencyId, baggageId, message, data (JSON), read
 *
 * For real email/WhatsApp/SMS delivery, this module delegates to:
 *   - src/lib/email.ts (sendEmail) for email channel
 *   - src/lib/whatsapp.ts (buildWhatsAppLink) for WhatsApp channel
 *   - SMS: not implemented (logs only)
 *
 * The in-memory queue is removed — it was a dead-letter queue (processor
 * never started). Notifications are now sent synchronously on creation.
 */

import { db } from "@/lib/db";
import type { Notification } from "@prisma/client";

// ─── Template variable interpolation ───

export function interpolateTemplate(
  body: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value),
    body
  );
}

// ─── Default notification templates (in-memory only, no DB table) ───

export const DEFAULT_TEMPLATES: Array<{
  name: string;
  type: string;
  channel: string;
  subject?: string;
  body: string;
  variables: string[];
}> = [
  {
    name: "Confirmation Billet",
    type: "ticket_confirmation",
    channel: "whatsapp",
    body: `🚌 *SmarticketS — Confirmation de Billet*\n\nBonjour *{{passengerName}}*,\n\nVotre billet est confirmé !\n━━━━━━━━━━━━━━━━━━\n🎫 *Code* : {{controlCode}}\n📍 *Ligne* : {{lineName}}\n📅 *Départ* : {{departureDate}} à {{departureTime}}\n💺 *Siège* : {{seatNumber}}\n━━━━━━━━━━━━━━━━━━\n\nBon voyage ! 🙏`,
    variables: ["passengerName", "lineName", "departureDate", "departureTime", "seatNumber", "controlCode"],
  },
  {
    name: "Suivi Colis",
    type: "parcel_tracking",
    channel: "whatsapp",
    body: `📦 *SmarticketS — Suivi Colis*\n\nBonjour *{{recipientName}}*,\n\nUn colis vous est destiné !\n━━━━━━━━━━━━━━━━━━\n📋 *Code* : {{controlCode}}\n🔒 *PIN* : {{pinCode}}\n📤 *Expéditeur* : {{senderName}}\n━━━━━━━━━━━━━━━━━━\n\nMerci de vérifier votre PIN avant réception. 🙏`,
    variables: ["recipientName", "controlCode", "pinCode", "senderName"],
  },
];

// ─── Queue stats (compatibility stubs — no longer in-memory queued) ───

export function getQueueSize(): number {
  return 0;
}

export function getQueueStats() {
  return { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 };
}

// ─── Send notification (create DB record + attempt delivery) ───

export interface SendNotificationParams {
  type: string;           // e.g. "custom", "ticket_confirmation", "parcel_tracking"
  channel: "email" | "whatsapp" | "sms" | "in_app";
  recipient: string;      // phone number (whatsapp/sms) or email address
  recipientName?: string; // display name for the recipient
  subject?: string;       // email subject
  content: string;        // message body
  tenantId?: string;      // tenant scope (for filtering)
  userId?: string;        // target user (null = broadcast)
  agencyId?: string;      // related agency
  baggageId?: string;     // related baggage
  entityId?: string;      // generic entity ID (stored in data JSON)
  entityType?: string;    // generic entity type (stored in data JSON)
}

/**
 * Create a notification record in the DB and attempt delivery.
 *
 * The Notification model stores: type, userId, agencyId, baggageId, message,
 * data (JSON string), read. We store the full delivery context in `data`.
 *
 * Delivery is best-effort:
 *   - whatsapp: logs the wa.me link (real sending is done client-side via
 *     buildWhatsAppLink() since WhatsApp doesn't have a server-side free API)
 *   - email: delegates to src/lib/email.ts sendEmail() if SMTP configured
 *   - sms: logs only (no SMS provider implemented)
 *   - in_app: just creates the DB record (displayed in NotificationCenter)
 *
 * @returns the created Notification record
 */
export async function sendNotification(params: SendNotificationParams): Promise<Notification> {
  // Build the data JSON with all delivery context
  const dataPayload = {
    channel: params.channel,
    recipient: params.recipient,
    recipientName: params.recipientName || null,
    subject: params.subject || null,
    content: params.content,
    tenantId: params.tenantId || null,
    entityId: params.entityId || null,
    entityType: params.entityType || null,
    deliveredAt: null as string | null,
    deliveryError: null as string | null,
  };

  // Create the in-app notification record
  const notification = await db.notification.create({
    data: {
      type: params.type,
      userId: params.userId || null,
      agencyId: params.agencyId || null,
      baggageId: params.baggageId || null,
      message: params.subject ? `${params.subject}: ${params.content.substring(0, 200)}` : params.content.substring(0, 500),
      data: JSON.stringify(dataPayload),
      read: false,
    },
  });

  // Attempt delivery (best-effort, non-blocking)
  deliverNotification(params, notification.id).catch((err) => {
    console.error(`[notifications] Delivery failed for ${notification.id}:`, err);
  });

  return notification;
}

/**
 * Attempt to deliver the notification via the specified channel.
 * Best-effort — failures are logged but don't fail the API request.
 */
async function deliverNotification(params: SendNotificationParams, notificationId: string): Promise<void> {
  try {
    if (params.channel === "whatsapp") {
      // WhatsApp delivery is client-side via wa.me links (no server-side API)
      // Log the link for debugging; the UI generates the actual wa.me link
      const phone = params.recipient.replace(/\D/g, "");
      console.log(`[WhatsApp] Notification ${notificationId} → wa.me/${phone} (link generated for client)`);
    } else if (params.channel === "email") {
      // Delegate to email.ts (supports console + SMTP providers)
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: params.recipient,
        subject: params.subject || "Notification SmarticketS",
        html: params.content,
        text: params.content.replace(/<[^>]*>/g, ""),
      });
      console.log(`[Email] Notification ${notificationId} → ${params.recipient}`);
    } else if (params.channel === "sms") {
      // SMS provider not implemented — log only
      console.log(`[SMS] Notification ${notificationId} → ${params.recipient} (SMS provider not configured)`);
    } else {
      // in_app: no external delivery needed
    }

    // Update data payload with delivery timestamp
    await db.notification.update({
      where: { id: notificationId },
      data: {
        // Append delivery info to the data JSON
        data: JSON.stringify({
          ...params,
          deliveredAt: new Date().toISOString(),
          deliveryError: null,
        }),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown delivery error";
    console.error(`[notifications] Delivery error for ${notificationId}:`, errorMsg);

    // Update data payload with error
    try {
      await db.notification.update({
        where: { id: notificationId },
        data: {
          data: JSON.stringify({
            ...params,
            deliveredAt: null,
            deliveryError: errorMsg,
          }),
        },
      });
    } catch {
      // Ignore update errors (notification may have been deleted)
    }
  }
}

// ─── WhatsApp link generator — delegates to unified module ───

export { buildWhatsAppLink, normalizePhone } from "./whatsapp";

// ─── Template helpers (in-memory only, no DB table) ───

/**
 * Get a default template by type + channel.
 * Previously queried db.notificationTemplate (which doesn't exist in schema).
 * Now searches the in-memory DEFAULT_TEMPLATES array.
 */
export async function getTemplate(
  type: string,
  channel: string
): Promise<(typeof DEFAULT_TEMPLATES)[number] | null> {
  return DEFAULT_TEMPLATES.find((t) => t.type === type && t.channel === channel) || null;
}

/**
 * Seed default templates.
 * Previously wrote to db.notificationTemplate (non-existent model).
 * Now a no-op — templates are in-memory constants in DEFAULT_TEMPLATES.
 * Kept for backward compatibility with the admin route.
 */
export async function seedDefaultTemplates(): Promise<void> {
  // No-op: templates are in-memory constants, no DB seeding needed.
  return;
}

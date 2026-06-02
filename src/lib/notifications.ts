// @ts-nocheck
/**
 * SmartTicketQR — Notification Service
 * In-memory queue with exponential backoff, retry limits, and DB persistence.
 * In production, replace the in-memory queue with BullMQ + Redis.
 */

import { db } from "@/lib/db";
import type { Notification, NotificationTemplate } from "@prisma/client";

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

// ─── Default notification templates ───

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
    body: `🚌 *SmartTicketQR — Confirmation de Billet*

Bonjour *{{passengerName}},

Votre billet est confirmé !
━━━━━━━━━━━━━━━━━━
📍 *Ligne* : {{lineName}}
📅 *Départ* : {{departureDate}} à {{departureTime}}
Siège *N°* : {{seatNumber}}
🎫 *Code* : {{controlCode}}
━━━━━━━━━━━━━━━━━━
💰 *Prix* : {{totalPrice}} FCFA
🧳 *Bagages* : {{luggageCount}} ({{luggageWeight}} kg)

Bon voyage ! 🙏`,
    variables: [
      "passengerName",
      "lineName",
      "departureDate",
      "departureTime",
      "seatNumber",
      "controlCode",
      "totalPrice",
      "luggageCount",
      "luggageWeight",
    ],
  },
  {
    name: "Confirmation Billet (Email)",
    type: "ticket_confirmation",
    channel: "email",
    subject: "🎫 Confirmation de billet — SmartTicketQR",
    body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#059669;color:white;padding:16px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0">🚌 SmartTicketQR</h1>
  </div>
  <div style="border:1px solid #e5e7eb;padding:24px;border-radius:0 0 8px 8px">
    <h2>Billet Confirmé</h2>
    <p>Bonjour <strong>{{passengerName}}</strong>,</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Ligne</strong></td><td style="padding:8px;border:1px solid #e5e7eb">{{lineName}}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Départ</strong></td><td style="padding:8px;border:1px solid #e5e7eb">{{departureDate}} à {{departureTime}}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Siège</strong></td><td style="padding:8px;border:1px solid #e5e7eb">N° {{seatNumber}}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Code</strong></td><td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace;font-size:18px">{{controlCode}}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Prix</strong></td><td style="padding:8px;border:1px solid #e5e7eb">{{totalPrice}} FCFA</td></tr>
    </table>
    <p style="color:#6b7280">Bon voyage ! 🙏</p>
  </div>
</body></html>`,
    variables: [
      "passengerName",
      "lineName",
      "departureDate",
      "departureTime",
      "seatNumber",
      "controlCode",
      "totalPrice",
    ],
  },
  {
    name: "Suivi Colis",
    type: "parcel_tracking",
    channel: "whatsapp",
    body: `📦 *SmartTicketQR — Suivi Colis*

Bonjour *{{recipientName}},

Un colis vous est destiné !
━━━━━━━━━━━━━━━━━━
📋 *Code Suivi* : {{controlCode}}
🔒 *PIN Retrait* : {{pinCode}}
📤 *Expéditeur* : {{senderName}}
📍 *Lieu* : {{recipientLocation}}
📅 *Arrivée estimée* : {{estimatedArrival}}
━━━━━━━━━━━━━━━━━━
💰 *Prix* : {{price}} FCFA

Merci de vérifier votre PIN avant réception. 🙏`,
    variables: [
      "recipientName",
      "controlCode",
      "pinCode",
      "senderName",
      "recipientLocation",
      "estimatedArrival",
      "price",
    ],
  },
  {
    name: "Alerte Départ",
    type: "departure_alert",
    channel: "whatsapp",
    body: `🚌 *SmartTicketQR — Alerte Départ*

⚠️ *Departure Update*
━━━━━━━━━━━━━━━━━━
📍 *Ligne* : {{lineName}}
🕐 *Heure prévue* : {{scheduledTime}}
📝 *Statut* : {{status}}
{{#if delayMinutes}}⏳ *Retard* : +{{delayMinutes}} min{{/if}}
{{#if notes}}💬 *Note* : {{notes}}{{/if}}
━━━━━━━━━━━━━━━━━━`,
    variables: [
      "lineName",
      "scheduledTime",
      "status",
      "delayMinutes",
      "notes",
    ],
  },
];

// ─── In-memory notification queue (enhanced) ───

interface QueueItem {
  id: string;
  notificationId: string;
  type: "whatsapp" | "email" | "sms";
  recipient: string;
  content: string;
  subject?: string;
  tenantId?: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
  status: "pending" | "processing" | "sent" | "failed";
  lastError?: string;
}

const MAX_QUEUE_SIZE = 1000;
const queue: QueueItem[] = [];
let processingInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

export function getQueueSize(): number {
  return queue.filter((item) => item.status === "pending").length;
}

export function getQueueStats() {
  return {
    total: queue.length,
    pending: queue.filter((i) => i.status === "pending").length,
    processing: queue.filter((i) => i.status === "processing").length,
    sent: queue.filter((i) => i.status === "sent").length,
    failed: queue.filter((i) => i.status === "failed").length,
  };
}

// ─── Send notification (create DB record + enqueue) ───

export async function sendNotification(params: {
  type: string;
  channel: string;
  recipient: string;
  recipientName?: string;
  subject?: string;
  content: string;
  tenantId?: string;
  userId?: string;
  entityId?: string;
  entityType?: string;
}): Promise<Notification> {
  const notification = await db.notification.create({
    data: {
      type: params.type,
      channel: params.channel,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      content: params.content,
      tenantId: params.tenantId,
      userId: params.userId,
      entityId: params.entityId,
      entityType: params.entityType,
      status: "pending",
    },
  });

  // Enqueue if capacity allows
  if (queue.length < MAX_QUEUE_SIZE) {
    queue.push({
      id: crypto.randomUUID(),
      notificationId: notification.id,
      type: params.channel as QueueItem["type"],
      recipient: params.recipient,
      content: params.content,
      subject: params.subject,
      tenantId: params.tenantId,
      attempts: 0,
      maxAttempts: 3,
      nextRetryAt: Date.now(),
      status: "pending",
    });
  }

  ensureQueueProcessing();
  return notification;
}

// ─── Process individual queue item ───

async function processQueueItem(item: QueueItem): Promise<void> {
  if (item.status === "processing") return; // Already being processed

  item.status = "processing";

  if (item.attempts >= item.maxAttempts) {
    item.status = "failed";
    item.lastError = `Max attempts (${item.maxAttempts}) exceeded`;
    await db.notification.update({
      where: { id: item.notificationId },
      data: {
        status: "failed",
        errorMessage: item.lastError,
      },
    });
    return;
  }

  try {
    if (item.type === "whatsapp") {
      const phone = item.recipient.replace(/\s/g, "");
      const text = encodeURIComponent(item.content.substring(0, 500));
      // In production: call WhatsApp Business API
      console.log(`[WhatsApp] wa.me/${phone}?text=${text.substring(0, 100)}...`);
    } else if (item.type === "email") {
      // In production: use nodemailer with SMTP config from TenantSettings
      console.log(
        `[Email] To: ${item.recipient}, Subject: ${item.subject || "(no subject)"}`
      );
    } else if (item.type === "sms") {
      // In production: call SMS provider API
      console.log(`[SMS] To: ${item.recipient}`);
    }

    await db.notification.update({
      where: { id: item.notificationId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    item.status = "sent";
  } catch (error) {
    item.attempts++;
    const backoff = Math.pow(2, item.attempts) * 1000;
    item.nextRetryAt = Date.now() + backoff;
    item.status = "pending";
    item.lastError = error instanceof Error ? error.message : "Unknown error";

    await db.notification.update({
      where: { id: item.notificationId },
      data: {
        status: "pending",
        errorMessage: item.lastError,
      },
    });
  }
}

// ─── Process queue (sequential, prevents concurrency issues) ───

async function processQueue(): Promise<void> {
  if (isProcessing) return;

  const now = Date.now();
  const pending = queue.filter(
    (item) => item.status === "pending" && item.nextRetryAt <= now
  );

  if (pending.length === 0) return;

  isProcessing = true;

  try {
    for (const item of pending) {
      await processQueueItem(item);
    }
  } finally {
    isProcessing = false;
  }
}

function ensureQueueProcessing(): void {
  if (!processingInterval) {
    processingInterval = setInterval(processQueue, 5000);
  }
}

// ─── WhatsApp link generator — delegates to unified module ───

export { buildWhatsAppLink, normalizePhone } from "./whatsapp";

// ─── Get template for a notification type ───

export async function getTemplate(
  type: string,
  channel: string,
  tenantId?: string
): Promise<NotificationTemplate | null> {
  if (tenantId) {
    const tenantTemplate = await db.notificationTemplate.findFirst({
      where: { type, channel, tenantId, isDefault: true },
    });
    if (tenantTemplate) return tenantTemplate;
  }

  const globalTemplate = await db.notificationTemplate.findFirst({
    where: { type, channel, tenantId: null, isDefault: true },
  });
  return globalTemplate;
}

// ─── Seed default templates ───

export async function seedDefaultTemplates(): Promise<void> {
  const existing = await db.notificationTemplate.count();
  if (existing > 0) return;

  for (const tpl of DEFAULT_TEMPLATES) {
    await db.notificationTemplate.create({
      data: {
        name: tpl.name,
        type: tpl.type,
        channel: tpl.channel,
        subject: tpl.subject,
        body: tpl.body,
        variables: JSON.stringify(tpl.variables),
        isDefault: true,
        tenantId: null,
      },
    });
  }
}

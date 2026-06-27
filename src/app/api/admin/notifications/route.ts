import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import {
  sendNotification,
  seedDefaultTemplates,
} from "@/lib/notifications";

// Zod validation for GET query params
const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.string().optional(),
});

// Zod validation for POST body
const sendNotificationSchema = z.object({
  channel: z.enum(["email", "whatsapp", "sms", "in_app"]),
  recipient: z.string().min(1, "Recipient is required"),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  type: z.string().default("custom"),
  agencyId: z.string().optional(),
  baggageId: z.string().optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
});

/**
 * GET /api/admin/notifications — List notifications with filters
 *
 * C1 fix: previously filtered on `status` and `channel` which don't exist
 * on the Notification model. Now filters on `type` (which does exist).
 * The `channel` is stored inside the `data` JSON field.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");

    const { searchParams } = new URL(request.url);
    const parsed = notificationsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, type } = parsed.data;

    // Build where clause — SuperAdmin sees all, Admin sees their agency's
    const where: Record<string, unknown> = {};
    if (user.role !== "SUPER_ADMIN" && user.agencyId) {
      where.agencyId = user.agencyId;
    }
    if (type) where.type = type;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/notifications — Send a notification
 *
 * C1 fix: previously passed `tenantId`, `recipient`, `subject`, `content`
 * directly to db.notification.create() — none of these fields exist on the
 * Notification model. Now delegates to sendNotification() which correctly
 * maps these to the model's actual fields (type, message, data JSON).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");

    const body = await request.json();
    const parsed = sendNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Seed default templates (no-op now, kept for compat)
    await seedDefaultTemplates();

    // Agency isolation: Admin can only send for their own agency
    const agencyId = user.role === "SUPER_ADMIN"
      ? (data.agencyId || undefined)
      : (user.agencyId || data.agencyId || undefined);

    const notification = await sendNotification({
      type: data.type,
      channel: data.channel,
      recipient: data.recipient,
      recipientName: data.recipientName,
      subject: data.subject,
      content: data.content,
      agencyId,
      baggageId: data.baggageId,
      userId: user.userId,
      entityId: data.entityId,
      entityType: data.entityType,
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

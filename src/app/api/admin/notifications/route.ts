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
  status: z.string().optional(),
  channel: z.string().optional(),
});

// Zod validation for POST body
const sendNotificationSchema = z.object({
  channel: z.enum(["email", "whatsapp", "sms"]),
  recipient: z.string().min(1, "Recipient is required"),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  type: z.string().default("custom"),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
});

// GET /api/admin/notifications — List notifications with filters
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

    const { page, limit, status, channel } = parsed.data;

    // ─── Tenant isolation: ADMIN sees only their own tenant, SUPER_ADMIN sees all ───
    const where: Record<string, unknown> = {};
    if (user.role !== "SUPER_ADMIN") {
      where.tenantId = user.tenantId;
    } else {
      // SUPER_ADMIN can optionally filter by tenantId
      const tenantIdFilter = searchParams.get("tenantId");
      if (tenantIdFilter) where.tenantId = tenantIdFilter;
    }
    if (status) where.status = status;
    if (channel) where.channel = channel;

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

// POST /api/admin/notifications — Send a notification
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

    // ─── Tenant isolation: ADMIN can only send to their own tenant ───
    const tenantId = user.role === "SUPER_ADMIN" ? (body.tenantId as string || undefined) : (user.tenantId || undefined);

    // Seed default templates if needed
    await seedDefaultTemplates();

    const notification = await sendNotification({
      type: data.type,
      channel: data.channel,
      recipient: data.recipient,
      recipientName: data.recipientName,
      subject: data.subject,
      content: data.content,
      tenantId,
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

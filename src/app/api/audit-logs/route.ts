import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser, requireRole, unauthorizedResponse } from "@/lib/auth-guard";

// Zod validation for GET query params
const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

// GET /api/audit-logs - List audit logs with pagination and filters
// Access: ADMIN, SUPER_ADMIN only
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);

    // ─── B6: Restrict access to ADMIN and SUPER_ADMIN only ───
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = auditLogsQuerySchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, tenantId: tenantIdFilter, userId: userIdFilter, action: actionFilter, startDate, endDate } = parsed.data;
    const skip = (page - 1) * limit;

    // Build where clause with strict tenant isolation
    const where: Record<string, unknown> = {};

    // SUPER_ADMIN sees all (with optional tenantId filter), ADMIN sees only their tenant
    if (payload.role !== "SUPER_ADMIN") {
      where.tenantId = payload.tenantId;
    } else if (tenantIdFilter) {
      where.tenantId = tenantIdFilter;
    }

    if (userIdFilter) {
      where.userId = userIdFilter;
    }

    if (actionFilter) {
      where.action = actionFilter;
    }

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.count({ where }),
    ]);

    // Parse details JSON for each log
    const parsedLogs = logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return NextResponse.json({
      data: parsedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

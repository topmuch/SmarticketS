// @ts-nocheck
import { db } from "./db";
import type { Role } from "@prisma/client";

interface LogAuditParams {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  userId: string;
  tenantId?: string | null;
  request?: Request;
}

export async function logAudit({
  action,
  entity,
  entityId,
  details,
  userId,
  tenantId,
  request,
}: LogAuditParams): Promise<void> {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  if (request) {
    const forwarded = request.headers.get("x-forwarded-for");
    ipAddress = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;
    userAgent = request.headers.get("user-agent") || undefined;
  }

  await db.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      details: details ? JSON.stringify(details) : undefined,
      userId,
      tenantId,
      ipAddress,
      userAgent,
    },
  });
}

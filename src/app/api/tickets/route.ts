// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  requireTenantAccess,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";

const ticketsQuerySchema = z.object({
  search: z.string().default(""),
  status: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
  dateFrom: z.string().default(""),
  dateTo: z.string().default(""),
  tenantId: z.string().default(""),
});

// GET /api/tickets — List passenger tickets with search, filters, pagination
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);
    const rawQuery = Object.fromEntries(searchParams.entries());
    const parsed = ticketsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { search, status, dateFrom, dateTo, tenantId: filterTenantId, page: rawPage, limit: rawLimit } = parsed.data;
    const page = Math.max(1, rawPage);
    const limit = Math.min(100, Math.max(1, rawLimit));

    // Determine tenantId filter
    let tenantFilterId: string | undefined;

    if (payload.role === "SUPER_ADMIN" && filterTenantId) {
      // SUPER_ADMIN can filter by specific tenant
      tenantFilterId = filterTenantId;
    } else if (payload.tenantId) {
      // Other roles always see only their own tenant
      tenantFilterId = payload.tenantId;
    } else {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour voir les tickets."
      );
    }

    // Build where clause
    const where: Prisma.PassengerTicketWhereInput = {
      tenantId: tenantFilterId,
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { passengerName: { contains: search } },
              { controlCode: { contains: search } },
              { preprintedTicket: { ticketCode: { contains: search } } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      db.passengerTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          preprintedTicket: {
            select: { id: true, ticketCode: true, qrHash: true, type: true },
          },
          line: {
            select: { id: true, name: true, code: true },
          },
          departure: {
            select: { id: true, scheduledTime: true, status: true, platform: true },
          },
          activatedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      db.passengerTicket.count({ where }),
    ]);

    return NextResponse.json({
      data: tickets,
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
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement des tickets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

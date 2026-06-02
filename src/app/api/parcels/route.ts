// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";

const parcelsQuerySchema = z.object({
  search: z.string().default(""),
  status: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
  from: z.string().default(""),
  to: z.string().default(""),
  tenantId: z.string().default(""),
});

// GET /api/parcels — List parcels with search, filters, pagination
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN", "DRIVER", "CONTROLLER");

    const { searchParams } = new URL(request.url);
    const rawQuery = Object.fromEntries(searchParams.entries());
    const parsed = parcelsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { search, status, from, to, tenantId: filterTenantId, page: rawPage, limit: rawLimit } = parsed.data;
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
        "Vous devez appartenir à une société pour voir les colis."
      );
    }

    // Build where clause
    const where: Prisma.ParcelWhereInput = {
      tenantId: tenantFilterId,
      ...(status ? { status: status as "IN_TRANSIT" | "DELIVERED" | "CONFIRMED" | "CANCELLED" } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { controlCode: { contains: search } },
              { senderName: { contains: search } },
              { recipientName: { contains: search } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [parcels, total] = await Promise.all([
      db.parcel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          rate: {
            include: {
              fromStation: { select: { id: true, name: true, city: true } },
              toStation: { select: { id: true, name: true, city: true } },
            },
          },
          activatedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          deliveredBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          ticket: {
            select: { id: true, ticketCode: true, type: true },
          },
          departure: {
            select: { id: true, scheduledTime: true, status: true },
          },
        },
      }),
      db.parcel.count({ where }),
    ]);

    return NextResponse.json({
      data: parcels,
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
    const message = error instanceof Error ? error.message : "Échec du chargement des colis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

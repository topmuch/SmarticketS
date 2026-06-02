import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

const createDepartureSchema = z.object({
  lineId: z.string().min(1, "La ligne est requise"),
  stationId: z.string().min(1, "La gare est requise"),
  scheduledTime: z.string().min(1, "L'heure de départ est requise"),
  platform: z.string().optional(),
  totalSeats: z.number().int().min(1, "Le nombre de places doit être d'au moins 1").default(40),
  notes: z.string().optional(),
});

const departuresQuerySchema = z.object({
  search: z.string().default(""),
  stationId: z.string().default(""),
  lineId: z.string().default(""),
  status: z.string().default(""),
  date: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
  tenantId: z.string().default(""),
});

// GET /api/departures — List departures with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR", "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);
    const rawQuery = Object.fromEntries(searchParams.entries());
    const parsed = departuresQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { search, stationId, lineId, status, date: dateFilter, page: rawPage, limit: rawLimit } = parsed.data;
    const page = Math.max(1, rawPage);
    const limit = Math.min(100, Math.max(1, rawLimit));

    // Determine tenantId filter
    let tenantFilterId: string | undefined;

    if (payload.tenantId) {
      tenantFilterId = payload.tenantId;
    } else if (payload.role !== "SUPER_ADMIN") {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour voir les départs."
      );
    }

    // Build where clause
    const where: Prisma.DepartureWhereInput = {
      ...(tenantFilterId ? { tenantId: tenantFilterId } : {}),
      ...(stationId ? { stationId } : {}),
      ...(lineId ? { lineId } : {}),
      ...(status ? { status: status as "SCHEDULED" | "BOARDING" | "DELAYED" | "DEPARTED" | "CANCELLED" } : {}),
      ...(dateFilter
        ? {
            date: {
              gte: new Date(dateFilter),
              lt: new Date(new Date(dateFilter).getTime() + 24 * 60 * 60 * 1000),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { line: { name: { contains: search } } },
              { line: { code: { contains: search } } },
              { station: { name: { contains: search } } },
              { platform: { contains: search } },
              { notes: { contains: search } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [departures, total] = await Promise.all([
      db.departure.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledTime: "asc" },
        include: {
          line: {
            include: {
              fromStation: { select: { id: true, name: true, city: true } },
              toStation: { select: { id: true, name: true, city: true } },
            },
          },
          station: { select: { id: true, name: true, city: true } },
        },
      }),
      db.departure.count({ where }),
    ]);

    return NextResponse.json({
      data: departures,
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
    const message = error instanceof Error ? error.message : "Échec du chargement des départs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/departures — Create a new departure
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR", "SUPER_ADMIN");

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour créer des départs."
      );
    }

    const body = await request.json();
    const parsed = createDepartureSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { lineId, stationId, scheduledTime, platform, totalSeats, notes } = parsed.data;

    // Parse scheduledTime
    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Format de date invalide pour l'heure de départ" },
        { status: 400 }
      );
    }

    // Validate station belongs to same tenant
    const station = await db.station.findFirst({
      where: { id: stationId, tenantId: payload.tenantId },
    });

    if (!station) {
      return NextResponse.json(
        { error: "Gare introuvable ou non autorisée" },
        { status: 404 }
      );
    }

    // Validate line belongs to same tenant
    const line = await db.line.findFirst({
      where: { id: lineId, tenantId: payload.tenantId },
      include: {
        fromStation: { select: { name: true } },
        toStation: { select: { name: true } },
      },
    });

    if (!line) {
      return NextResponse.json(
        { error: "Ligne introuvable ou non autorisée" },
        { status: 404 }
      );
    }

    // Compute date from scheduledTime (start of day)
    const departureDate = new Date(scheduledDate);
    departureDate.setHours(0, 0, 0, 0);

    // Create departure
    const departure = await db.departure.create({
      data: {
        lineId,
        stationId,
        scheduledTime: scheduledDate,
        platform: platform || null,
        totalSeats,
        availableSeats: totalSeats,
        notes: notes || null,
        date: departureDate,
        tenantId: payload.tenantId,
      },
      include: {
        line: {
          include: {
            fromStation: { select: { id: true, name: true, city: true } },
            toStation: { select: { id: true, name: true, city: true } },
          },
        },
        station: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit
    await logAudit({
      action: "CREATE_DEPARTURE",
      entity: "Departure",
      entityId: departure.id,
      details: {
        lineName: line.name,
        lineCode: line.code,
        fromStation: line.fromStation.name,
        toStation: line.toStation.name,
        stationName: station.name,
        scheduledTime: scheduledDate.toISOString(),
        platform: platform || null,
        totalSeats,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(departure, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("access")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec de la création du départ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
import { logAudit } from "@/lib/audit";

const createRateSchema = z.object({
  fromStationId: z.string().min(1, "La gare de départ est requise"),
  toStationId: z.string().min(1, "La gare d'arrivée est requise"),
  price: z.number().int().min(100, "Le prix minimum est 100 FCFA"),
});

// GET /api/parcels/rates — List parcel rates for current tenant
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);
    const fromStationId = searchParams.get("fromStationId") || "";
    const toStationId = searchParams.get("toStationId") || "";

    // Determine tenantId filter
    let tenantFilterId: string | undefined;

    if (payload.tenantId) {
      tenantFilterId = payload.tenantId;
    } else if (payload.role !== "SUPER_ADMIN") {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour voir les tarifs."
      );
    }

    const where: Record<string, unknown> = {
      tenantId: tenantFilterId,
      ...(fromStationId ? { fromStationId } : {}),
      ...(toStationId ? { toStationId } : {}),
    };

    const rates = await db.parcelRate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        fromStation: { select: { id: true, name: true, city: true } },
        toStation: { select: { id: true, name: true, city: true } },
        _count: { select: { parcels: true } },
      },
    });

    return NextResponse.json({ data: rates });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement des tarifs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/parcels/rates — Create a new parcel rate
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour créer des tarifs."
      );
    }

    const body = await request.json();
    const parsed = createRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fromStationId, toStationId, price } = parsed.data;

    // Verify stations belong to tenant
    const [fromStation, toStation] = await Promise.all([
      db.station.findFirst({ where: { id: fromStationId, tenantId: payload.tenantId } }),
      db.station.findFirst({ where: { id: toStationId, tenantId: payload.tenantId } }),
    ]);

    if (!fromStation) {
      return NextResponse.json(
        { error: "Gare de départ introuvable" },
        { status: 404 }
      );
    }

    if (!toStation) {
      return NextResponse.json(
        { error: "Gare d'arrivée introuvable" },
        { status: 404 }
      );
    }

    // Check unique constraint
    const existing = await db.parcelRate.findFirst({
      where: {
        fromStationId,
        toStationId,
        tenantId: payload.tenantId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Un tarif existe déjà pour ce trajet" },
        { status: 409 }
      );
    }

    // Create rate
    const rate = await db.parcelRate.create({
      data: {
        fromStationId,
        toStationId,
        price,
        tenantId: payload.tenantId,
      },
      include: {
        fromStation: { select: { id: true, name: true, city: true } },
        toStation: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit
    await logAudit({
      action: "CREATE_PARCEL_RATE",
      entity: "ParcelRate",
      entityId: rate.id,
      details: {
        fromStation: fromStation.name,
        toStation: toStation.name,
        price,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(rate, { status: 201 });
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
    const message = error instanceof Error ? error.message : "Échec de la création du tarif";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

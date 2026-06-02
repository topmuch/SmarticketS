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

const createLineSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis").max(20),
  fromStationId: z.string().min(1, "La gare de départ est requise"),
  toStationId: z.string().min(1, "La gare d'arrivée est requise"),
  basePrice: z.number().int().min(0, "Le prix doit être positif"),
  isActive: z.boolean().default(true),
  distance: z.number().optional(),
  duration: z.number().int().optional(),
  tenantId: z.string().optional(),
});

// GET /api/lines — List lines for current tenant
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "";

    // Determine tenantId filter
    let tenantFilterId: string | undefined;

    if (payload.role === "SUPER_ADMIN" && payload.tenantId == null) {
      const filterTenantId = searchParams.get("tenantId");
      if (!filterTenantId) {
        return NextResponse.json(
          { error: "SUPER_ADMIN must provide a tenantId filter parameter" },
          { status: 400 }
        );
      }
      tenantFilterId = filterTenantId;
    } else if (payload.tenantId) {
      tenantFilterId = payload.tenantId;
    } else {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour voir les lignes."
      );
    }

    const lines = await db.line.findMany({
      where: {
        ...(tenantFilterId ? { tenantId: tenantFilterId } : {}),
        ...(stationId
          ? {
              OR: [
                { fromStationId: stationId },
                { toStationId: stationId },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        fromStation: { select: { id: true, name: true, city: true } },
        toStation: { select: { id: true, name: true, city: true } },
      },
    });

    return NextResponse.json({ data: lines });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message =
      error instanceof Error ? error.message : "Échec du chargement des lignes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/lines — Create line
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const body = await request.json();
    const parsed = createLineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      code,
      fromStationId,
      toStationId,
      basePrice,
      isActive,
      distance,
      duration,
      tenantId: bodyTenantId,
    } = parsed.data;

    // Determine tenantId
    let lineTenantId: string;
    if (payload.role === "SUPER_ADMIN" && bodyTenantId) {
      lineTenantId = bodyTenantId;
    } else if (payload.tenantId) {
      lineTenantId = payload.tenantId;
    } else {
      return forbiddenResponse("Vous devez appartenir à une société.");
    }

    // Validate stations belong to same tenant
    const [fromStation, toStation] = await Promise.all([
      db.station.findUnique({ where: { id: fromStationId } }),
      db.station.findUnique({ where: { id: toStationId } }),
    ]);

    if (!fromStation || fromStation.tenantId !== lineTenantId) {
      return NextResponse.json(
        { error: "La gare de départ est invalide ou n'appartient pas à votre société." },
        { status: 400 }
      );
    }
    if (!toStation || toStation.tenantId !== lineTenantId) {
      return NextResponse.json(
        { error: "La gare d'arrivée est invalide ou n'appartient pas à votre société." },
        { status: 400 }
      );
    }

    // Check code uniqueness within tenant
    const existing = await db.line.findFirst({
      where: { code, tenantId: lineTenantId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Une ligne avec ce code existe déjà pour cette société." },
        { status: 409 }
      );
    }

    const line = await db.line.create({
      data: {
        name,
        code,
        fromStationId,
        toStationId,
        basePrice,
        isActive,
        distance,
        duration,
        tenantId: lineTenantId,
      },
      include: {
        fromStation: { select: { id: true, name: true, city: true } },
        toStation: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit log
    await logAudit({
      action: "CREATE_LINE",
      entity: "Line",
      entityId: line.id,
      details: { name, code, fromStationId, toStationId, basePrice },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ data: line }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec de la création de la ligne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

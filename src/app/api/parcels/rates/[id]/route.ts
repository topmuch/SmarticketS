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
import { logAudit } from "@/lib/audit";

const updateRateSchema = z.object({
  price: z.number().int().min(100, "Le prix minimum est 100 FCFA").optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/parcels/rates/[id] — Update a parcel rate
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const body = await request.json();
    const parsed = updateRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Find existing rate
    const existingRate = await db.parcelRate.findUnique({
      where: { id },
      include: {
        fromStation: { select: { name: true } },
        toStation: { select: { name: true } },
      },
    });

    if (!existingRate) {
      return NextResponse.json(
        { error: "Tarif introuvable" },
        { status: 404 }
      );
    }

    // Enforce tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== existingRate.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce tarif.");
    }

    // Update rate
    const updatedRate = await db.parcelRate.update({
      where: { id },
      data: parsed.data,
      include: {
        fromStation: { select: { id: true, name: true, city: true } },
        toStation: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit
    await logAudit({
      action: "UPDATE_PARCEL_RATE",
      entity: "ParcelRate",
      entityId: id,
      details: {
        fromStation: existingRate.fromStation.name,
        toStation: existingRate.toStation.name,
        oldPrice: existingRate.price,
        newPrice: parsed.data.price ?? existingRate.price,
        oldIsActive: existingRate.isActive,
        newIsActive: parsed.data.isActive ?? existingRate.isActive,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(updatedRate);
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
    const message = error instanceof Error ? error.message : "Échec de la mise à jour du tarif";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/parcels/rates/[id] — Delete a parcel rate (SUPER_ADMIN only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN");

    const { id } = await params;

    // Find existing rate
    const existingRate = await db.parcelRate.findUnique({
      where: { id },
      include: {
        fromStation: { select: { name: true } },
        toStation: { select: { name: true } },
        _count: { select: { parcels: true } },
      },
    });

    if (!existingRate) {
      return NextResponse.json(
        { error: "Tarif introuvable" },
        { status: 404 }
      );
    }

    // Check if parcels use this rate
    if (existingRate._count.parcels > 0) {
      return NextResponse.json(
        { error: "Ce tarif est utilisé par des colis existants et ne peut pas être supprimé" },
        { status: 409 }
      );
    }

    // Delete rate
    await db.parcelRate.delete({ where: { id } });

    // Audit
    await logAudit({
      action: "DELETE_PARCEL_RATE",
      entity: "ParcelRate",
      entityId: id,
      details: {
        fromStation: existingRate.fromStation.name,
        toStation: existingRate.toStation.name,
        price: existingRate.price,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ message: "Tarif supprimé avec succès" });
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
    const message = error instanceof Error ? error.message : "Échec de la suppression du tarif";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

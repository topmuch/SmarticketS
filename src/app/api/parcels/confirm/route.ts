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

const confirmParcelSchema = z.object({
  parcelId: z.string().min(1, "L'identifiant du colis est requis"),
});

// POST /api/parcels/confirm — Confirm parcel delivery (admin action)
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour confirmer des colis."
      );
    }

    const body = await request.json();
    const parsed = confirmParcelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { parcelId } = parsed.data;

    // 1. Find parcel by id + tenantId + status=DELIVERED
    const parcel = await db.parcel.findFirst({
      where: {
        id: parcelId,
        tenantId: payload.tenantId,
        status: "DELIVERED",
      },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: "Colis introuvable ou non livré" },
        { status: 404 }
      );
    }

    // 2. Update status=CONFIRMED, confirmedAt=now
    const confirmedParcel = await db.parcel.update({
      where: { id: parcel.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
      include: {
        rate: {
          include: {
            fromStation: { select: { name: true, city: true } },
            toStation: { select: { name: true, city: true } },
          },
        },
        ticket: { select: { ticketCode: true } },
        activatedBy: { select: { id: true, firstName: true, lastName: true } },
        deliveredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // 3. Audit
    await logAudit({
      action: "CONFIRM_PARCEL",
      entity: "Parcel",
      entityId: confirmedParcel.id,
      details: {
        controlCode: confirmedParcel.controlCode,
        senderName: confirmedParcel.senderName,
        recipientName: confirmedParcel.recipientName,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(confirmedParcel);
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
    const message = error instanceof Error ? error.message : "Échec de la confirmation du colis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

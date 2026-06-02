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
import { buildParcelDeliveryLinks } from "@/lib/parcels";

const deliverParcelSchema = z.object({
  controlCode: z
    .string()
    .regex(/^\d{6,8}$/, "Le code suivi doit contenir entre 6 et 8 chiffres"),
  pinCode: z
    .string()
    .regex(/^\d{4}$/, "Le code PIN doit contenir exactement 4 chiffres"),
});

// POST /api/parcels/deliver — Deliver a parcel (driver action)
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "DRIVER", "OPERATOR", "ADMIN", "SUPER_ADMIN");

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour livrer des colis."
      );
    }

    const body = await request.json();
    const parsed = deliverParcelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { controlCode, pinCode } = parsed.data;

    // 1. Find parcel by controlCode + tenantId + status=IN_TRANSIT
    const parcel = await db.parcel.findFirst({
      where: {
        controlCode,
        tenantId: payload.tenantId,
        status: "IN_TRANSIT",
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

    if (!parcel) {
      return NextResponse.json(
        { error: "Colis introuvable, déjà livré ou annulé" },
        { status: 404 }
      );
    }

    // 2. Verify pinCode matches
    if (parcel.pinCode !== pinCode) {
      return NextResponse.json(
        { error: "Code PIN incorrect" },
        { status: 403 }
      );
    }

    // 3. Update: status=DELIVERED, deliveredAt=now, deliveredBy=userId
    const deliveredParcel = await db.parcel.update({
      where: { id: parcel.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliveredById: payload.userId,
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

    // 4. Build delivery WhatsApp links
    const waLinks = buildParcelDeliveryLinks(
      {
        controlCode: deliveredParcel.controlCode,
        senderName: deliveredParcel.senderName,
        recipientName: deliveredParcel.recipientName,
        recipientLocation: deliveredParcel.recipientLocation,
        fromStationName: deliveredParcel.rate.fromStation.name,
        toStationName: deliveredParcel.rate.toStation.name,
        price: deliveredParcel.price,
        luggageCount: deliveredParcel.luggageCount,
        estimatedArrival: deliveredParcel.estimatedArrival,
      },
      deliveredParcel.senderPhone,
      deliveredParcel.recipientPhone
    );

    // 5. Audit
    await logAudit({
      action: "DELIVER_PARCEL",
      entity: "Parcel",
      entityId: deliveredParcel.id,
      details: {
        controlCode,
        senderName: deliveredParcel.senderName,
        recipientName: deliveredParcel.recipientName,
        deliveredById: payload.userId,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({
      ...deliveredParcel,
      whatsappSenderLink: waLinks.whatsappSenderLink,
      whatsappRecipientLink: waLinks.whatsappRecipientLink,
    });
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
    const message = error instanceof Error ? error.message : "Échec de la livraison du colis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

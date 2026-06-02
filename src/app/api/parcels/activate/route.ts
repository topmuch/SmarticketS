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
import {
  generateParcelControlCode,
  generateParcelPinCode,
  formatSenegalPhone,
  buildParcelActivationLinks,
} from "@/lib/parcels";

// Default parcel price when no rate exists — from env or fallback
const DEFAULT_PARCEL_PRICE = parseInt(process.env.DEFAULT_PARCEL_PRICE || "2000", 10);

const activateParcelSchema = z.object({
  ticketCode: z
    .string()
    .regex(/^(CPS|TKT)-[A-Z]{2,4}-\d{4}$/, "Le format du code ticket doit être CPS-XXXX-0000 ou TKT-XXXX-0000"),
  fromStationId: z.string().min(1, "La gare de départ est requise"),
  toStationId: z.string().min(1, "La gare d'arrivée est requise"),
  senderName: z.string().min(2, "Le nom de l'expéditeur doit contenir au moins 2 caractères"),
  senderPhone: z
    .string()
    .min(1, "Le téléphone de l'expéditeur est requis"),
  luggageCount: z.number().int().min(1, "Au moins 1 colis requis").default(1),
  recipientName: z.string().min(2, "Le nom du destinataire doit contenir au moins 2 caractères"),
  recipientPhone: z
    .string()
    .min(1, "Le téléphone du destinataire est requis"),
  recipientLocation: z.string().min(1, "Le lieu de livraison est requis"),
  estimatedArrival: z.string().optional(),
});

// POST /api/parcels/activate — Activate a parcel at the guichet
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour activer des colis."
      );
    }

    const body = await request.json();
    const parsed = activateParcelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Find preprinted ticket by ticketCode + tenantId + status="inactive" + type="PARCEL"
    const preprinted = await db.preprintedTicket.findFirst({
      where: {
        ticketCode: data.ticketCode,
        tenantId: payload.tenantId,
        status: "inactive",
        type: "PARCEL",
      },
    });

    if (!preprinted) {
      return NextResponse.json(
        { error: "Ticket colis non disponible ou déjà utilisé" },
        { status: 404 }
      );
    }

    // 2. Look up ParcelRate by fromStationId + toStationId + tenantId
    const rate = await db.parcelRate.findFirst({
      where: {
        fromStationId: data.fromStationId,
        toStationId: data.toStationId,
        tenantId: payload.tenantId,
        isActive: true,
      },
      include: {
        fromStation: true,
        toStation: true,
      },
    });

    const price = rate ? rate.price : DEFAULT_PARCEL_PRICE;

    // 3. Generate unique controlCode and pinCode
    const controlCode = await generateParcelControlCode();
    const pinCode = await generateParcelPinCode();

    // 4. Parse estimated arrival if provided
    const estimatedArrival = data.estimatedArrival
      ? new Date(data.estimatedArrival)
      : null;

    // 5. Format phone numbers
    const senderPhone = formatSenegalPhone(data.senderPhone);
    const recipientPhone = formatSenegalPhone(data.recipientPhone);

    // 6. Transaction: update preprinted ticket + create parcel
    const parcel = await db.$transaction(async (tx) => {
      // Update preprinted ticket status
      await tx.preprintedTicket.update({
        where: { id: preprinted.id },
        data: { status: "active" },
      });

      // Create the rate if not found (use default 2000 FCFA)
      let effectiveRateId: string;

      if (rate) {
        effectiveRateId = rate.id;
      } else {
        // Create a default rate
        const newRate = await tx.parcelRate.create({
          data: {
            fromStationId: data.fromStationId,
            toStationId: data.toStationId,
            price: DEFAULT_PARCEL_PRICE,
            tenantId: payload.tenantId!,
          },
        });
        effectiveRateId = newRate.id;
      }

      // Create parcel
      return tx.parcel.create({
        data: {
          controlCode,
          pinCode,
          senderName: data.senderName,
          senderPhone,
          recipientName: data.recipientName,
          recipientPhone,
          recipientLocation: data.recipientLocation,
          luggageCount: data.luggageCount,
          estimatedArrival,
          price,
          ticketId: preprinted.id,
          rateId: effectiveRateId,
          activatedById: payload.userId,
          tenantId: payload.tenantId,
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
        },
      });
    });

    // 7. Build WhatsApp links for sender and recipient
    const waLinks = buildParcelActivationLinks(
      {
        controlCode: parcel.controlCode,
        pinCode: parcel.pinCode,
        senderName: parcel.senderName,
        recipientName: parcel.recipientName,
        recipientLocation: parcel.recipientLocation,
        fromStationName: parcel.rate.fromStation.name,
        toStationName: parcel.rate.toStation.name,
        price: parcel.price,
        luggageCount: parcel.luggageCount,
        estimatedArrival: parcel.estimatedArrival,
      },
      parcel.senderPhone,
      parcel.recipientPhone
    );

    // 8. Audit
    await logAudit({
      action: "ACTIVATE_PARCEL",
      entity: "Parcel",
      entityId: parcel.id,
      details: {
        ticketCode: preprinted.ticketCode,
        controlCode,
        senderName: parcel.senderName,
        recipientName: parcel.recipientName,
        fromStationId: data.fromStationId,
        toStationId: data.toStationId,
        price,
        luggageCount: data.luggageCount,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(
      {
        ...parcel,
        whatsappSenderLink: waLinks.whatsappSenderLink,
        whatsappRecipientLink: waLinks.whatsappRecipientLink,
        pinCode, // PIN shown only once at activation
      },
      { status: 201 }
    );
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
    const message = error instanceof Error ? error.message : "Échec de l'activation du colis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

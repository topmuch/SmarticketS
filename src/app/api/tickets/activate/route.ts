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
import {
  calculateLuggageFee,
  generateControlCode,
  buildWhatsAppMessage,
  buildWhatsAppLink,
  validateChildRules,
} from "@/lib/tickets";

const activateTicketSchema = z.object({
  ticketCode: z.string().min(1, "Le code ticket est requis"),
  passengerName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  passengerAge: z
    .number()
    .int()
    .min(0, "L'âge ne peut pas être négatif")
    .max(120, "L'âge ne peut pas dépasser 120"),
  passengerPhone: z
    .string()
    .regex(/^[0-9]{9,15}$/, "Le téléphone doit contenir 9 à 15 chiffres"),
  seatNumber: z.string().optional(),
  luggageCount: z.number().int().min(0).max(5).default(1),
  luggageWeight: z.number().min(0).max(100).default(0),
  idDocumentType: z
    .enum(["CNI", "PASSPORT", "BIRTH_CERTIFICATE"])
    .default("CNI"),
  idDocumentNumber: z.string().optional(),
  childDocument: z.string().optional(),
  hasParentalAuth: z.boolean().default(false),
  departureId: z.string().optional(),
  lineId: z.string().optional(),
});

// POST /api/tickets/activate — Activate a preprinted ticket with passenger data
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour activer des tickets."
      );
    }

    const body = await request.json();
    const parsed = activateTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Find preprinted ticket by ticketCode + tenantId + status="inactive"
    const preprinted = await db.preprintedTicket.findFirst({
      where: {
        ticketCode: data.ticketCode,
        tenantId: payload.tenantId,
        status: "inactive",
      },
      include: { line: true },
    });

    if (!preprinted) {
      return NextResponse.json(
        { error: "Ticket non disponible ou déjà utilisé" },
        { status: 404 }
      );
    }

    // 2. Determine if child
    const isChild = data.passengerAge < 5;

    // 3. Validate child rules
    const childError = validateChildRules(
      data.passengerAge,
      isChild,
      data.childDocument ?? null
    );
    if (childError) {
      return NextResponse.json({ error: childError }, { status: 400 });
    }

    // 4. Calculate luggage fee
    const luggageFee = calculateLuggageFee(data.luggageWeight);

    // 5. Get ticket price from line
    const effectiveLineId = data.lineId || preprinted.lineId;
    let ticketPrice = 0;
    let lineName: string | null = null;

    if (effectiveLineId) {
      const line = await db.line.findFirst({
        where: { id: effectiveLineId, tenantId: payload.tenantId },
      });
      if (line) {
        ticketPrice = line.basePrice;
        lineName = line.name;
      }
    }

    // 6. If child → free ticket
    if (isChild) {
      ticketPrice = 0;
    }

    const totalPrice = ticketPrice + luggageFee;

    // 7. Generate unique control code
    const controlCode = await generateControlCode();

    // 8. Transaction: update preprinted + create passenger ticket
    const passengerTicket = await db.$transaction(async (tx) => {
      // Update preprinted ticket status
      await tx.preprintedTicket.update({
        where: { id: preprinted.id },
        data: {
          status: "active",
          lineId: effectiveLineId,
        },
      });

      // Create passenger ticket
      return tx.passengerTicket.create({
        data: {
          controlCode,
          passengerName: data.passengerName,
          passengerAge: data.passengerAge,
          passengerPhone: data.passengerPhone,
          seatNumber: data.seatNumber,
          luggageCount: data.luggageCount,
          luggageWeight: data.luggageWeight,
          luggageFee,
          isChild,
          childDocument: data.childDocument || null,
          idDocumentType: data.idDocumentType,
          idDocumentNumber: data.idDocumentNumber || null,
          hasParentalAuth: data.hasParentalAuth,
          departureId: data.departureId || null,
          lineId: effectiveLineId || null,
          activatedById: payload.userId,
          preprintedId: preprinted.id,
          ticketPrice,
          totalPrice,
          tenantId: payload.tenantId,
        },
        include: {
          preprintedTicket: true,
          line: true,
          departure: true,
          activatedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      });
    });

    // 9. Build WhatsApp message and link
    const waMessage = buildWhatsAppMessage(
      {
        passengerName: passengerTicket.passengerName,
        lineName: passengerTicket.line?.name ?? lineName,
        seatNumber: passengerTicket.seatNumber,
        luggageCount: passengerTicket.luggageCount,
        luggageWeight: passengerTicket.luggageWeight,
        luggageFee: passengerTicket.luggageFee,
        ticketPrice: passengerTicket.ticketPrice,
        totalPrice: passengerTicket.totalPrice,
        controlCode: passengerTicket.controlCode,
        isChild: passengerTicket.isChild,
      },
      preprinted.ticketCode
    );

    const whatsappLink = buildWhatsAppLink(data.passengerPhone, waMessage);

    // Update WhatsApp fields on ticket
    await db.passengerTicket.update({
      where: { id: passengerTicket.id },
      data: {
        whatsappMessage: waMessage,
      },
    });

    // 10. Audit
    await logAudit({
      action: "ACTIVATE_TICKET",
      entity: "PassengerTicket",
      entityId: passengerTicket.id,
      details: {
        ticketCode: preprinted.ticketCode,
        controlCode,
        passengerName: data.passengerName,
        isChild,
        totalPrice,
        luggageFee,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(
      {
        ...passengerTicket,
        whatsappLink,
        ticketCode: preprinted.ticketCode,
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
    const message = error instanceof Error ? error.message : "Échec de l'activation du ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

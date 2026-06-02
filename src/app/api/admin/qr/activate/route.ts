import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { generateControlCode } from "@/lib/tickets";
import { activateQrTicketSchema } from "@/lib/schemas/qr-stock";

// POST /api/admin/qr/activate
// Activate a preprinted QR ticket and create a passenger ticket
export async function POST(request: NextRequest) {
  try {
    // 1. Auth: ADMIN or OPERATOR only
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR");

    // 2. Strict tenant isolation — use payload.tenantId
    if (!payload.tenantId) {
      return forbiddenResponse(
        "Aucun transporteur associé à votre compte."
      );
    }
    const tenantId: string = payload.tenantId;

    // 3. Validate request body
    const body = await request.json();
    const parsed = activateQrTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      ticketCode,
      departureId,
      passengerName,
      passengerAge,
      passengerPhone,
      seatNumber,
      luggageCount,
      isChild,
    } = parsed.data;

    // 4. Verify the ticket exists AND belongs to the same tenant
    const ticket = await db.preprintedTicket.findUnique({
      where: { ticketCode },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket introuvable." },
        { status: 404 }
      );
    }

    if (ticket.tenantId !== tenantId) {
      return forbiddenResponse(
        "Ce ticket n'appartient pas à votre transporteur."
      );
    }

    // 5. Verify ticket is inactive
    if (ticket.status !== "inactive") {
      return NextResponse.json(
        {
          error: `Ce ticket est déjà ${ticket.status === "active" ? "activé" : ticket.status === "used" ? "utilisé" : "annulé"}.`,
        },
        { status: 409 }
      );
    }

    // 6. Verify the departure exists AND belongs to the same tenant
    const departure = await db.departure.findUnique({
      where: { id: departureId },
      include: {
        line: {
          select: {
            name: true,
            code: true,
            toStation: {
              select: { name: true, city: true },
            },
          },
        },
      },
    });

    if (!departure) {
      return NextResponse.json(
        { error: "Trajet introuvable." },
        { status: 404 }
      );
    }

    if (departure.tenantId !== tenantId) {
      return forbiddenResponse(
        "Ce trajet n'appartient pas à votre transporteur."
      );
    }

    // 7. Verify available seats
    if (departure.availableSeats <= 0) {
      return NextResponse.json(
        { error: "Plus de places disponibles sur ce trajet." },
        { status: 409 }
      );
    }

    // 8. Generate control code BEFORE transaction (async — needs DB check)
    const controlCode = await generateControlCode();

    // 8. Execute all operations atomically in a transaction
    await db.$transaction([
      // Update PreprintedTicket: status -> active, link to departure
      db.preprintedTicket.update({
        where: { id: ticket.id },
        data: {
          status: "active",
          departureId,
          activatedAt: new Date(),
        },
      }),

      // Decrement Departure.availableSeats by 1
      db.departure.update({
        where: { id: departureId },
        data: {
          availableSeats: { decrement: 1 },
        },
      }),

      // Create PassengerTicket
      db.passengerTicket.create({
        data: {
          controlCode,
          passengerName,
          passengerAge,
          passengerPhone,
          seatNumber: seatNumber ?? null,
          luggageCount,
          isChild,
          departureTime: departure.scheduledTime,
          preprintedId: ticket.id,
          lineId: departure.lineId,
          departureId,
          activatedById: payload.userId,
          tenantId,
        },
      }),

      // Create AuditLog entry
      db.auditLog.create({
        data: {
          action: "ACTIVATE_QR_TICKET",
          entity: "PreprintedTicket",
          entityId: ticket.id,
          details: JSON.stringify({
            ticketCode: ticket.ticketCode,
            departureId,
            departureLineCode: departure.line?.code,
            passengerName,
            passengerPhone,
            controlCode,
          }),
          userId: payload.userId,
          tenantId,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            request.headers.get("x-real-ip") ||
            undefined,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      }),
    ]);

    // 9. Return response
    const destination = departure.line?.toStation
      ? `${departure.line.toStation.name} (${departure.line.toStation.city})`
      : null;

    return NextResponse.json({
      success: true,
      ticketCode: ticket.ticketCode,
      controlCode,
      passengerName,
      departureInfo: {
        id: departure.id,
        lineCode: departure.line?.code ?? null,
        lineName: departure.line?.name ?? null,
        destination,
        scheduledTime: departure.scheduledTime,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Authorization") ||
        error.message.includes("Missing") ||
        error.message.includes("Invalid") ||
        error.message.includes("expired"))
    ) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message =
      error instanceof Error
        ? error.message
        : "Échec de l'activation du ticket QR.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

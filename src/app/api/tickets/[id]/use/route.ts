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

const useTicketSchema = z.object({
  controlCode: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/tickets/[id]/use — Mark a ticket as used (consumed at boarding)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "CONTROLLER", "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const body = await request.json();
    const parsed = useTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { controlCode } = parsed.data;

    // Fetch ticket with valid relations only
    const ticket = await db.passengerTicket.findUnique({
      where: { id },
      include: {
        baggage: { select: { reference: true, departureCity: true, destination: true } },
        departure: { select: { scheduledTime: true, platform: true, lineNumber: true } },
        agency: { select: { id: true, name: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket introuvable" },
        { status: 404 }
      );
    }

    // Enforce tenant/agency isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId && payload.tenantId !== ticket.agencyId) {
      return forbiddenResponse("Vous n'avez pas accès à ce ticket.");
    }

    // Validate ticket status (schema uses uppercase: ACTIVE, VALIDATED, CANCELLED, USED)
    if (ticket.ticketStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: `Ce ticket a déjà été utilisé ou annulé (statut: ${ticket.ticketStatus}).` },
        { status: 400 }
      );
    }

    // Verify control code if provided
    if (controlCode && controlCode !== ticket.controlCode) {
      return NextResponse.json(
        { error: "Code de contrôle invalide." },
        { status: 400 }
      );
    }

    // Mark ticket as used
    const updatedTicket = await db.passengerTicket.update({
      where: { id },
      data: {
        ticketStatus: "USED",
        validatedAt: new Date(),
        validatedBy: payload.userId,
      },
      include: {
        baggage: { select: { reference: true, departureCity: true, destination: true } },
        departure: { select: { id: true, scheduledTime: true, status: true, lineNumber: true } },
        agency: { select: { id: true, name: true } },
      },
    });

    // Audit
    await logAudit({
      action: "USE_TICKET",
      entity: "PassengerTicket",
      entityId: ticket.id,
      details: {
        controlCodeVerified: !!controlCode,
        passengerName: ticket.passengerName,
        baggageReference: ticket.baggage?.reference,
        lineNumber: ticket.departure?.lineNumber,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(updatedTicket);
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
    const message = error instanceof Error ? error.message : "Échec de la validation du ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

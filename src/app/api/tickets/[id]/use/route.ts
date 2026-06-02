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

    // Fetch ticket
    const ticket = await db.passengerTicket.findUnique({
      where: { id },
      include: {
        preprintedTicket: { select: { ticketCode: true } },
        line: { select: { name: true, code: true } },
        departure: { select: { scheduledTime: true, platform: true } },
        activatedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket introuvable" },
        { status: 404 }
      );
    }

    // Enforce tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== ticket.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce ticket.");
    }

    // Validate ticket status
    if (ticket.status !== "active" && ticket.status !== "rescheduled") {
      return NextResponse.json(
        { error: `Ce ticket a déjà été utilisé ou annulé (statut: ${ticket.status}).` },
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
      data: { status: "used" },
      include: {
        preprintedTicket: { select: { id: true, ticketCode: true, qrHash: true } },
        line: { select: { id: true, name: true, code: true } },
        departure: { select: { id: true, scheduledTime: true, status: true } },
        activatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Also update the preprinted ticket status
    if (ticket.preprintedId) {
      await db.preprintedTicket.update({
        where: { id: ticket.preprintedId },
        data: { status: "used" },
      });
    }

    // Audit
    await logAudit({
      action: "USE_TICKET",
      entity: "PassengerTicket",
      entityId: ticket.id,
      details: {
        controlCodeVerified: !!controlCode,
        passengerName: ticket.passengerName,
        ticketCode: ticket.preprintedTicket?.ticketCode,
        lineName: ticket.line?.name,
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

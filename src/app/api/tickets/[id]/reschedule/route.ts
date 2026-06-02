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
import { validateReschedule } from "@/lib/tickets";

const rescheduleSchema = z.object({
  departureId: z.string().min(1, "L'identifiant du départ est requis"),
  departureTime: z.string().min(1, "L'heure de départ est requise"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/tickets/[id]/reschedule — Reschedule a ticket
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const body = await request.json();
    const parsed = rescheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { departureId, departureTime } = parsed.data;

    // Fetch ticket with current state
    const ticket = await db.passengerTicket.findUnique({
      where: { id },
      include: { departure: true },
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
    if (ticket.status !== "active") {
      return NextResponse.json(
        { error: "Seuls les tickets actifs peuvent être reportés." },
        { status: 400 }
      );
    }

    // Validate reschedule rules against the CURRENT departure time
    const currentDepartureTime = ticket.departure?.scheduledTime
      ? new Date(ticket.departure.scheduledTime)
      : ticket.departureTime
        ? new Date(ticket.departureTime)
        : null;

    const rescheduleError = validateReschedule(
      currentDepartureTime,
      ticket.rescheduleCount
    );
    if (rescheduleError) {
      return NextResponse.json({ error: rescheduleError }, { status: 400 });
    }

    // Validate new departure time is at least 24h from now
    const newDepartureTime = new Date(departureTime);
    const hoursFromNow =
      (newDepartureTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursFromNow < 24) {
      return NextResponse.json(
        { error: "Le nouveau départ doit être au moins 24 heures à partir de maintenant." },
        { status: 400 }
      );
    }

    // Update ticket
    const updatedTicket = await db.passengerTicket.update({
      where: { id },
      data: {
        status: "rescheduled",
        rescheduleCount: ticket.rescheduleCount + 1,
        departureId,
        departureTime: newDepartureTime,
      },
      include: {
        preprintedTicket: {
          select: { id: true, ticketCode: true },
        },
        line: {
          select: { id: true, name: true, code: true },
        },
        departure: {
          select: { id: true, scheduledTime: true, status: true },
        },
        activatedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Audit
    await logAudit({
      action: "RESCHEDULE_TICKET",
      entity: "PassengerTicket",
      entityId: ticket.id,
      details: {
        oldDepartureId: ticket.departureId,
        newDepartureId: departureId,
        newDepartureTime: departureTime,
        rescheduleCount: updatedTicket.rescheduleCount,
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
    const message = error instanceof Error ? error.message : "Échec du report du ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

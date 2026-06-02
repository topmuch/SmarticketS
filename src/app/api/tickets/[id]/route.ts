import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  requireTenantAccess,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tickets/[id] — Get single passenger ticket by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const ticket = await db.passengerTicket.findUnique({
      where: { id },
      include: {
        preprintedTicket: {
          select: { id: true, ticketCode: true, qrHash: true, type: true, status: true },
        },
        line: {
          select: {
            id: true,
            name: true,
            code: true,
            fromStation: { select: { name: true, city: true } },
            toStation: { select: { name: true, city: true } },
          },
        },
        departure: {
          select: { id: true, scheduledTime: true, actualTime: true, status: true, platform: true },
        },
        activatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, name: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== ticket.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce ticket.");
    }

    return NextResponse.json(ticket);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement du ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

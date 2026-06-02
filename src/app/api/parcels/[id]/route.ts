import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/parcels/[id] — Get single parcel by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN", "DRIVER", "CONTROLLER");

    const { id } = await params;

    const parcel = await db.parcel.findUnique({
      where: { id },
      include: {
        rate: {
          include: {
            fromStation: { select: { id: true, name: true, city: true } },
            toStation: { select: { id: true, name: true, city: true } },
          },
        },
        ticket: {
          select: { id: true, ticketCode: true, qrHash: true, type: true, status: true },
        },
        departure: {
          select: {
            id: true,
            scheduledTime: true,
            actualTime: true,
            status: true,
            platform: true,
          },
        },
        activatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        deliveredBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, name: true },
        },
      },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: "Colis introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== parcel.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce colis.");
    }

    return NextResponse.json(parcel);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement du colis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

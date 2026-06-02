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

const updateDepartureSchema = z.object({
  status: z.enum(["SCHEDULED", "BOARDING", "DELAYED", "DEPARTED", "CANCELLED"]).optional(),
  delayMinutes: z.number().int().min(0, "Le retard ne peut pas être négatif").optional(),
  platform: z.string().nullable().optional(),
  scheduledTime: z.string().optional(),
  availableSeats: z.number().int().min(0, "Le nombre de places disponibles ne peut pas être négatif").optional(),
  notes: z.string().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/departures/[id] — Get single departure with full relations
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR", "SUPER_ADMIN");

    const { id } = await params;

    const departure = await db.departure.findUnique({
      where: { id },
      include: {
        line: {
          include: {
            fromStation: { select: { id: true, name: true, city: true } },
            toStation: { select: { id: true, name: true, city: true } },
          },
        },
        station: { select: { id: true, name: true, city: true } },
        passengerTickets: {
          select: { id: true, passengerName, status, seatNumber },
        },
        parcels: {
          select: { id: true, controlCode, status, senderName },
        },
      },
    });

    if (!departure) {
      return NextResponse.json(
        { error: "Départ introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== departure.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce départ.");
    }

    return NextResponse.json(departure);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement du départ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/departures/[id] — Update a departure
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR", "SUPER_ADMIN");

    const { id } = await params;

    const body = await request.json();
    const parsed = updateDepartureSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Find existing departure
    const existing = await db.departure.findUnique({
      where: { id },
      include: {
        line: { select: { name: true, code: true } },
        station: { select: { name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Départ introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== existing.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce départ.");
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }
    if (parsed.data.delayMinutes !== undefined) {
      updateData.delayMinutes = parsed.data.delayMinutes;
    }
    if (parsed.data.platform !== undefined) {
      updateData.platform = parsed.data.platform;
    }
    if (parsed.data.availableSeats !== undefined) {
      updateData.availableSeats = parsed.data.availableSeats;
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes;
    }
    if (parsed.data.scheduledTime !== undefined) {
      const newScheduledTime = new Date(parsed.data.scheduledTime);
      if (isNaN(newScheduledTime.getTime())) {
        return NextResponse.json(
          { error: "Format de date invalide pour l'heure de départ" },
          { status: 400 }
        );
      }
      updateData.scheduledTime = newScheduledTime;
      // Recompute date from new scheduledTime
      const departureDate = new Date(newScheduledTime);
      departureDate.setHours(0, 0, 0, 0);
      updateData.date = departureDate;
    }

    // If status is set to DEPARTED, set actualTime
    if (parsed.data.status === "DEPARTED" && !existing.actualTime) {
      updateData.actualTime = new Date();
    }

    // Update departure
    const updated = await db.departure.update({
      where: { id },
      data: updateData,
      include: {
        line: {
          include: {
            fromStation: { select: { id: true, name: true, city: true } },
            toStation: { select: { id: true, name: true, city: true } },
          },
        },
        station: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit
    await logAudit({
      action: "UPDATE_DEPARTURE",
      entity: "Departure",
      entityId: id,
      details: {
        lineName: existing.line.name,
        lineCode: existing.line.code,
        stationName: existing.station.name,
        oldStatus: existing.status,
        newStatus: parsed.data.status ?? existing.status,
        oldDelay: existing.delayMinutes,
        newDelay: parsed.data.delayMinutes ?? existing.delayMinutes,
        oldPlatform: existing.platform,
        newPlatform: parsed.data.platform !== undefined ? parsed.data.platform : existing.platform,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(updated);
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
    const message = error instanceof Error ? error.message : "Échec de la mise à jour du départ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/departures/[id] — Delete a departure (ADMIN or SUPER_ADMIN only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    // Find existing departure
    const existing = await db.departure.findUnique({
      where: { id },
      include: {
        line: { select: { name: true, code: true } },
        station: { select: { name: true } },
        _count: { select: { passengerTickets: true, parcels: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Départ introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== existing.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce départ.");
    }

    // Check if departure has linked tickets or parcels
    const linkedCount = existing._count.passengerTickets + existing._count.parcels;
    if (linkedCount > 0) {
      return NextResponse.json(
        { error: `Ce départ est lié à ${linkedCount} ticket(s)/colis et ne peut pas être supprimé` },
        { status: 409 }
      );
    }

    // Delete departure
    await db.departure.delete({ where: { id } });

    // Audit
    await logAudit({
      action: "DELETE_DEPARTURE",
      entity: "Departure",
      entityId: id,
      details: {
        lineName: existing.line.name,
        lineCode: existing.line.code,
        stationName: existing.station.name,
        scheduledTime: existing.scheduledTime.toISOString(),
        status: existing.status,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ message: "Départ supprimé avec succès" });
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
    const message = error instanceof Error ? error.message : "Échec de la suppression du départ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

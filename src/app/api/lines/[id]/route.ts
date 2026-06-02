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

const updateLineSchema = z.object({
  name: z.string().min(1, "Le nom est requis").optional(),
  code: z.string().min(1, "Le code est requis").max(20).optional(),
  fromStationId: z.string().optional(),
  toStationId: z.string().optional(),
  basePrice: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  distance: z.number().optional().nullable(),
  duration: z.number().int().optional().nullable(),
});

// GET /api/lines/[id] — Get single line
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const line = await db.line.findUnique({
      where: { id },
      include: {
        fromStation: true,
        toStation: true,
        _count: {
          select: {
            departures: true,
            preprintedTickets: true,
            passengerTickets: true,
          },
        },
      },
    });

    if (!line) {
      return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
    }

    // Tenant isolation
    if (payload.role !== "SUPER_ADMIN" && line.tenantId !== payload.tenantId) {
      return forbiddenResponse("Accès interdit à cette ligne.");
    }

    return NextResponse.json({ data: line });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement de la ligne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/lines/[id] — Update line
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const existing = await db.line.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
    }

    // Tenant isolation
    if (payload.role !== "SUPER_ADMIN" && existing.tenantId !== payload.tenantId) {
      return forbiddenResponse("Accès interdit à cette ligne.");
    }

    const body = await request.json();
    const parsed = updateLineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, code, fromStationId, toStationId, basePrice, isActive, distance, duration } =
      parsed.data;

    // Check code uniqueness if changing
    if (code && code !== existing.code) {
      const codeExists = await db.line.findFirst({
        where: { code, tenantId: existing.tenantId, id: { not: id } },
      });
      if (codeExists) {
        return NextResponse.json(
          { error: "Une ligne avec ce code existe déjà." },
          { status: 409 }
        );
      }
    }

    const line = await db.line.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(fromStationId !== undefined && { fromStationId }),
        ...(toStationId !== undefined && { toStationId }),
        ...(basePrice !== undefined && { basePrice }),
        ...(isActive !== undefined && { isActive }),
        ...(distance !== undefined && { distance }),
        ...(duration !== undefined && { duration }),
      },
      include: {
        fromStation: { select: { id: true, name: true, city: true } },
        toStation: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit log
    await logAudit({
      action: "UPDATE_LINE",
      entity: "Line",
      entityId: id,
      details: { name, code, basePrice, isActive },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ data: line });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec de la mise à jour";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/lines/[id] — Delete line
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const line = await db.line.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            departures: true,
            preprintedTickets: true,
            passengerTickets: true,
          },
        },
      },
    });

    if (!line) {
      return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
    }

    // Tenant isolation
    if (payload.role !== "SUPER_ADMIN" && line.tenantId !== payload.tenantId) {
      return forbiddenResponse("Accès interdit à cette ligne.");
    }

    const linkedCount =
      line._count.departures +
      line._count.preprintedTickets +
      line._count.passengerTickets;

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `Impossible de supprimer cette ligne : ${linkedCount} élément(s) lié(s) (départs, tickets).`,
        },
        { status: 409 }
      );
    }

    await db.line.delete({ where: { id } });

    // Audit log
    await logAudit({
      action: "DELETE_LINE",
      entity: "Line",
      entityId: id,
      details: { name: line.name, code: line.code },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec de la suppression";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

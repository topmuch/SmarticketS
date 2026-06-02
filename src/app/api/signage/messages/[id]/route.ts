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

const updateMessageSchema = z.object({
  content: z.string().min(1, "Le contenu du message est requis").optional(),
  priority: z.enum(["NORMAL", "URGENT", "INFO"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  stationId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/signage/messages/[id] — Get single signage message
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const message = await db.signageMessage.findUnique({
      where: { id },
      include: {
        station: { select: { id: true, name: true, city: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== message.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce message.");
    }

    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement du message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/signage/messages/[id] — Update a signage message
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const body = await request.json();
    const parsed = updateMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Find existing message
    const existing = await db.signageMessage.findUnique({
      where: { id },
      include: {
        station: { select: { name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Message introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== existing.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce message.");
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (parsed.data.content !== undefined) {
      updateData.content = parsed.data.content;
    }
    if (parsed.data.priority !== undefined) {
      updateData.priority = parsed.data.priority;
    }
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
    }
    if (parsed.data.stationId !== undefined) {
      // If stationId is provided, validate it belongs to the tenant
      if (parsed.data.stationId) {
        const station = await db.station.findFirst({
          where: { id: parsed.data.stationId, tenantId: existing.tenantId },
        });
        if (!station) {
          return NextResponse.json(
            { error: "Gare introuvable ou non autorisée" },
            { status: 404 }
          );
        }
      }
      updateData.stationId = parsed.data.stationId;
    }
    if (parsed.data.startDate !== undefined) {
      const parsedStartDate = new Date(parsed.data.startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return NextResponse.json(
          { error: "Format de date de début invalide" },
          { status: 400 }
        );
      }
      updateData.startDate = parsedStartDate;
    }
    if (parsed.data.endDate !== undefined) {
      if (parsed.data.endDate) {
        const parsedEndDate = new Date(parsed.data.endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return NextResponse.json(
            { error: "Format de date de fin invalide" },
            { status: 400 }
          );
        }
        updateData.endDate = parsedEndDate;
      } else {
        updateData.endDate = null;
      }
    }

    // Update message
    const updated = await db.signageMessage.update({
      where: { id },
      data: updateData,
      include: {
        station: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit
    await logAudit({
      action: "UPDATE_SIGNAGE_MESSAGE",
      entity: "SignageMessage",
      entityId: id,
      details: {
        oldContent: existing.content.slice(0, 100),
        newContent: (parsed.data.content || existing.content).slice(0, 100),
        oldPriority: existing.priority,
        newPriority: parsed.data.priority || existing.priority,
        oldIsActive: existing.isActive,
        newIsActive: parsed.data.isActive ?? existing.isActive,
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
    const message = error instanceof Error ? error.message : "Échec de la mise à jour du message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/signage/messages/[id] — Delete a signage message
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    // Find existing message
    const existing = await db.signageMessage.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Message introuvable" },
        { status: 404 }
      );
    }

    // Enforce multi-tenant isolation
    if (payload.role !== "SUPER_ADMIN" && payload.tenantId !== existing.tenantId) {
      return forbiddenResponse("Vous n'avez pas accès à ce message.");
    }

    // Delete message
    await db.signageMessage.delete({ where: { id } });

    // Audit
    await logAudit({
      action: "DELETE_SIGNAGE_MESSAGE",
      entity: "SignageMessage",
      entityId: id,
      details: {
        content: existing.content.slice(0, 100),
        priority: existing.priority,
        isActive: existing.isActive,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ message: "Message supprimé avec succès" });
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
    const message = error instanceof Error ? error.message : "Échec de la suppression du message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
